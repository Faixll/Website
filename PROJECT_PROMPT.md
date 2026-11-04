# Project prompt: Hawar Albada Fresh Meat Trading — online store

You are continuing work on an existing e-commerce website for **Hawar Albada Fresh Meat Trading** (Arabic name used so far: **حوار البدع لتجارة اللحوم الطازجة**, spelling still to be confirmed against the trade license), a meat and livestock store in the **UAE**. The code is in `C:\Users\fmall\L7m`. Ask me before choosing anything not listed here.

## Goal
Customers find a product and finish an order in about three taps. Fast, clean, easy to search. Accounts are optional; guest checkout must always work. Most customers arrive from Instagram on phones, so design mobile-first.

## Stack (decided)
- **Next.js 15 (App Router) + TypeScript**, plain CSS with logical properties (RTL-safe). No Tailwind.
- **Stripe** for payments (cards, Apple Pay, Google Pay). No KNET.
- **Supabase** (Postgres + phone/SMS login) for accounts, orders and points. Optional: without its keys the store runs guest-only.
- Hosting plan: **Vercel**, with the owner's own domain (domain bought; registrar not yet given).

## Language and format
- **Arabic is the default, fully right-to-left**, with an English toggle on every page (`/ar/...`, `/en/...`; `/` redirects to `/ar`).
- Currency **AED with two decimals**, e.g. `65.00 د.إ` / `AED 65.00`, Western digits in both languages.
- Prices **include 5% VAT**; checkout shows the VAT contained in the total (total × 5 / 105).
- Phone numbers in **UAE format (+971)**; accept 05…, 5…, +9715… and normalise to +9715XXXXXXXX.
- Fonts: **IBM Plex Sans Arabic** (body), **Readex Pro** (headings).
- Colours: oxblood **#8C1D2C** (brand), green **#1F6B4A** (fresh/open), stone **#F7F5F2** (background), ink **#1A1816** (text).
- Text contrast ≥ 4.5:1, touch targets ≥ 44px, real buttons/links/labels.

## Pages (built)
1. **Home**: top bar (delivery promise, branches, phone, language toggle); header with large search, account button and cart total; category tabs; compact hero with a delivery-time picker; "reorder last order" strip; product grid where "Add" turns into a quantity stepper; trust row; branches; footer with payment methods, trade license and TRN; sticky cart bar with a free-delivery progress line (free above 200 AED).
2. **Search**: live suggestions while typing (products with price and add button, plus categories); results page with filters (category, fresh/frozen, price, in stock) and sorting.
3. **Product**: choose size → cutting option → notes; price updates live; "Buy now" (straight to checkout) and "Add to cart"; delivery estimate; out-of-stock items show "Notify me".
4. **Checkout**: single page, no account needed: name and phone; delivery (emirate, area, street, building/villa, apartment) or branch pickup; time slots; discounts (promo code, points); payment (Apple Pay / Google Pay, card, cash on delivery / pay at branch). VAT shown; sticky order summary; button label changes with payment method.
5. **Stores & contact**: branches with open/closed status computed from hours in **UAE time (UTC+4)**, hours table, call, directions, "pick up here", map (OpenStreetMap embed), contact options (call, WhatsApp, email, Instagram), contact form, FAQ.
6. **Mobile**: bottom navigation bar, sticky cart bar, and a sticky buy bar on product pages (which replaces the bottom nav there).
7. **Order confirmation**, **Account** (`/[lang]/account`) and **Staff** (`/[lang]/staff`) pages.

## Accounts, points and promo codes (decided)
- **Sign-in**: mobile number + 6-digit **SMS code** via Supabase Auth (SMS provider such as Twilio). No passwords.
- **Account page**: points balance, progress to next reward, how points work, order history with "order again", points history, edit name, sign out.
- **Points**: **1 point per 1 AED** spent on products (after discounts, delivery fee excluded). Credited when a card/wallet order is **paid** (Stripe webhook) or when staff mark a cash order **delivered**. Cancelling returns spent points and takes back earned points (down to zero).
- **Rewards**: **500 points = 25 AED off**; **150 points = free delivery**. (No free-meat catalogue, no bonus points.)
- **Promo codes** (`src/data/promos.ts`):
  - **NATIONDAY**: 15% off products, valid every year **1–3 December**, UAE time.
  - **FAZZA**: 10% off products, all year, **no membership check**.
  - A promo code **cannot be combined** with a points money-off discount; free delivery with points still works with a code.
- **Staff**: accounts with `role = 'staff'` (set in Supabase) can list orders, mark cash orders delivered, cancel orders, and adjust a customer's points with a note.
- Security: balances live in the database; all point changes go through server-only functions in one transaction; row-level security lets customers read only their own data and change only their name.

## Orders and payments
- The server **recomputes every price** from the catalogue; nothing price-related from the browser is trusted.
- With Supabase connected, every order (guest or signed-in) is saved. Each order, notify-me request and contact message is also logged and POSTed to `ORDER_WEBHOOK_URL` if set (e.g. a Make/Zapier hook to WhatsApp or email).
- Stripe: Payment Element (card) and Express Checkout Element (Apple Pay / Google Pay); webhook at `/api/stripe/webhook`.

## Where things live
- Business details, VAT, delivery fees, minimum orders, free-delivery threshold, time slots, points values: `src/config/site.ts`
- Products, categories, cutting options, prices, stock: `src/data/catalog.ts`
- Branches, hours, coordinates, emirates and areas: `src/data/places.ts`
- Promo codes: `src/data/promos.ts`
- All Arabic/English wording: `src/lib/i18n.ts`
- Styles and colour tokens: `src/app/globals.css`
- Database: `supabase/migrations/0001_accounts_points.sql`
- Env vars: `.env.example` (Stripe keys, Supabase URL/anon/service-role keys, `ORDER_WEBHOOK_URL`, `NEXT_PUBLIC_SITE_URL`)
- Tests: `npm test` (points, promo and pricing rules; the migration runs on in-memory Postgres via PGlite)

## Placeholders still to replace (sample data is FAKE)
- Phone, WhatsApp, email, Instagram, trade license number, TRN, domain, logo, product photos.
- All products, prices, stock, branches (Dubai, Sharjah, Abu Dhabi, Ajman), addresses, coordinates and hours.
- Delivery fees and minimum order per emirate.
- Wording to confirm: "Same-day delivery on orders before 7 pm", trust-row claims, FAQ answers.
- Have an accountant confirm VAT treatment of discounts (VAT is calculated on what the customer pays).

## Not yet done / next steps
1. Deploy to Vercel (`npx vercel login`, `npx vercel --prod`), add the domain in Vercel → Settings → Domains, add the DNS records at the registrar (usually A `@` → 76.76.21.21 and CNAME `www` → cname.vercel-dns.com; use the values Vercel shows), set `NEXT_PUBLIC_SITE_URL`, redeploy.
2. Before customers use it: real business details and catalogue; somewhere for orders to go (Supabase or `ORDER_WEBHOOK_URL`); Stripe live keys, Apple Pay domain verification and webhook.
3. Supabase setup: create project, run the migration, enable Phone auth with an SMS provider approved for the UAE, add keys, set my account's role to `staff`.
4. Not yet tested end to end: real SMS sign-in, signed-in screens (balance, redeeming points, staff page), and real Stripe payments.
5. Optional ideas raised: a "Coming soon" page until launch; a Fazaa membership check if FAZZA is abused.

## History
This folder first held a fictional butcher brand called "L7m" (brand kit and landing page). It was deleted at my request and replaced by this store. The `ui-ux-pro-max` skill is already installed.
