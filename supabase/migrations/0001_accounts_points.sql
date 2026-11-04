-- Accounts, orders and loyalty points for Hawar Al Bada.
-- Run in the Supabase SQL editor (or `supabase db push`).
--
-- Rules:
--   * Customers can READ their own profile, orders and points history (row-level security).
--   * Customers can only UPDATE their own display name.
--   * Every write that touches orders or points goes through the server (service role) and the
--     functions below, which keep the balance and the ledger in step inside one transaction.

-- ---------------------------------------------------------------- tables
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  phone text unique,
  name text check (char_length(name) <= 100),
  role text not null default 'customer' check (role in ('customer', 'staff')),
  points_balance integer not null default 0 check (points_balance >= 0),
  created_at timestamptz not null default now()
);

create table public.orders (
  id text primary key,
  user_id uuid references public.profiles (id) on delete set null,
  status text not null check (status in ('awaiting_payment', 'pending_cod', 'paid', 'delivered', 'cancelled', 'payment_failed')),
  payment text not null check (payment in ('wallet', 'card', 'cod', 'points')),
  name text not null,
  phone text not null,
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  discount numeric(10, 2) not null default 0 check (discount >= 0),
  delivery_fee numeric(10, 2) not null default 0 check (delivery_fee >= 0),
  total numeric(10, 2) not null check (total >= 0),
  vat numeric(10, 2) not null check (vat >= 0),
  points_redeemed integer not null default 0 check (points_redeemed >= 0),
  points_earnable integer not null default 0 check (points_earnable >= 0),
  promo_code text,
  payment_intent text unique,
  details jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_user_created on public.orders (user_id, created_at desc);
create index orders_status_created on public.orders (status, created_at desc);

create table public.points_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  order_id text references public.orders (id) on delete set null,
  delta integer not null check (delta <> 0),
  reason text not null check (reason in ('earn', 'redeem', 'reverse_earn', 'refund_redeem', 'adjust')),
  note text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index points_ledger_user on public.points_ledger (user_id, created_at desc);
-- Each order can earn / redeem / reverse / refund at most once.
create unique index points_once_per_order on public.points_ledger (order_id, reason)
  where order_id is not null and reason <> 'adjust';

-- ---------------------------------------------------------------- new users get a profile
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, phone) values (new.id, case when new.phone is null or new.phone = '' then null else '+' || ltrim(new.phone, '+') end)
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- points core
-- Applies a change to a user's balance and records it. Raises 'insufficient_points' if the
-- balance would go negative. Returns NULL (and changes nothing) if this order already has an
-- entry with the same reason, so retries and duplicate webhooks are harmless.
create or replace function public.apply_points(
  p_user uuid, p_order text, p_delta integer, p_reason text, p_note text default null, p_by uuid default null
) returns integer
language plpgsql security definer set search_path = public as $$
declare v_balance integer;
begin
  if p_delta = 0 then return null; end if;
  if p_order is not null and p_reason <> 'adjust'
     and exists (select 1 from points_ledger where order_id = p_order and reason = p_reason) then
    return null;
  end if;
  update profiles set points_balance = points_balance + p_delta
   where id = p_user and points_balance + p_delta >= 0
  returning points_balance into v_balance;
  if v_balance is null then
    raise exception 'insufficient_points' using errcode = 'P0001';
  end if;
  insert into points_ledger (user_id, order_id, delta, reason, note, created_by)
  values (p_user, p_order, p_delta, p_reason, p_note, p_by);
  return v_balance;
end $$;

-- Creates an order and (optionally) spends points on it, atomically.
create or replace function public.place_order(p_order jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare v_id text := p_order ->> 'id';
        v_user uuid := nullif(p_order ->> 'user_id', '')::uuid;
        v_redeem integer := coalesce((p_order ->> 'points_redeemed')::integer, 0);
begin
  if v_redeem > 0 and v_user is null then
    raise exception 'points_require_account' using errcode = 'P0001';
  end if;
  insert into orders (id, user_id, status, payment, name, phone, subtotal, discount, delivery_fee, total, vat,
                      points_redeemed, points_earnable, promo_code, details)
  values (v_id, v_user, p_order ->> 'status', p_order ->> 'payment', p_order ->> 'name', p_order ->> 'phone',
          (p_order ->> 'subtotal')::numeric, (p_order ->> 'discount')::numeric, (p_order ->> 'delivery_fee')::numeric,
          (p_order ->> 'total')::numeric, (p_order ->> 'vat')::numeric, v_redeem,
          coalesce((p_order ->> 'points_earnable')::integer, 0), nullif(p_order ->> 'promo_code', ''), p_order -> 'details');
  if v_redeem > 0 then
    perform apply_points(v_user, v_id, -v_redeem, 'redeem');
  end if;
  return v_id;
end $$;

-- Marks an order paid or delivered and credits its points (once).
create or replace function public.complete_order(p_order text, p_status text, p_payment_intent text default null)
returns text
language plpgsql security definer set search_path = public as $$
declare o orders%rowtype;
begin
  if p_status not in ('paid', 'delivered') then raise exception 'bad_status' using errcode = 'P0001'; end if;
  select * into o from orders where id = p_order for update;
  if not found then raise exception 'order_not_found' using errcode = 'P0001'; end if;
  if o.status in ('cancelled', 'payment_failed') then return o.status; end if;   -- never resurrect
  if o.status = 'delivered' and p_status = 'paid' then return o.status; end if;  -- don't step backwards
  update orders set status = p_status, updated_at = now(),
         payment_intent = coalesce(p_payment_intent, payment_intent)
   where id = p_order;
  if o.user_id is not null and o.points_earnable > 0 then
    perform apply_points(o.user_id, o.id, o.points_earnable, 'earn');
  end if;
  return p_status;
end $$;

-- Cancels an order (or records a failed payment): refunds spent points and takes back earned
-- points. Earned points are reversed only down to zero, in case they were already spent.
create or replace function public.cancel_order(p_order text, p_status text default 'cancelled')
returns text
language plpgsql security definer set search_path = public as $$
declare o orders%rowtype;
        v_earned integer;
        v_balance integer;
begin
  if p_status not in ('cancelled', 'payment_failed') then raise exception 'bad_status' using errcode = 'P0001'; end if;
  select * into o from orders where id = p_order for update;
  if not found then raise exception 'order_not_found' using errcode = 'P0001'; end if;
  if o.status in ('cancelled', 'payment_failed') then return o.status; end if;
  update orders set status = p_status, updated_at = now() where id = p_order;
  if o.user_id is not null then
    if o.points_redeemed > 0 then
      perform apply_points(o.user_id, o.id, o.points_redeemed, 'refund_redeem');
    end if;
    select delta into v_earned from points_ledger where order_id = o.id and reason = 'earn';
    if v_earned is not null then
      select points_balance into v_balance from profiles where id = o.user_id for update;
      if least(v_earned, v_balance) > 0 then
        perform apply_points(o.user_id, o.id, -least(v_earned, v_balance), 'reverse_earn');
      end if;
    end if;
  end if;
  return p_status;
end $$;

-- ---------------------------------------------------------------- security
alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.points_ledger enable row level security;

create policy "own profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "own name" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "own orders" on public.orders for select to authenticated using (user_id = auth.uid());
create policy "own points" on public.points_ledger for select to authenticated using (user_id = auth.uid());

-- Customers may change only their name; balance and role are server-only.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (name) on public.profiles to authenticated;
revoke insert, update, delete on public.orders, public.points_ledger from anon, authenticated;
grant select on public.orders, public.points_ledger to authenticated;

-- The functions are for the server only.
revoke execute on function public.apply_points(uuid, text, integer, text, text, uuid) from public, anon, authenticated;
revoke execute on function public.place_order(jsonb) from public, anon, authenticated;
revoke execute on function public.complete_order(text, text, text) from public, anon, authenticated;
revoke execute on function public.cancel_order(text, text) from public, anon, authenticated;
grant execute on function public.apply_points(uuid, text, integer, text, text, uuid) to service_role;
grant execute on function public.place_order(jsonb) to service_role;
grant execute on function public.complete_order(text, text, text) to service_role;
grant execute on function public.cancel_order(text, text) to service_role;
