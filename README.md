# Hawar Al Bada Fresh Meat Trading — online store

Bilingual (Arabic default, right-to-left; English toggle) meat and livestock store for the UAE.
Next.js 15 (App Router) + Stripe. No customer accounts.

## Run it

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000 → redirects to /ar
npm run build && npm start   # production
```

## Pages

| Route | What it is |
|---|---|
| `/ar`, `/en` | Home: top bar, search, category tabs, delivery-time picker, reorder strip, product grid, trust row, branches, footer, sticky cart bar |
| `/[lang]/search` | Live search results with filters (category, fresh/frozen, price, in stock) and sorting |
| `/[lang]/product/[id]` | Size → cutting → notes, live price, delivery estimate, Buy now / Add to cart, notify-me when out of stock |
| `/[lang]/checkout` | Single-page checkout: contact, delivery or pickup, time slot, payment (Apple Pay / Google Pay, card, cash) |
| `/[lang]/order/[id]` | Order confirmation |
| `/[lang]/stores` | Branches with live open/closed status (UAE time), hours, map, contact options, contact form, FAQ |
| `/[lang]/account` | Optional account: sign in with mobile + SMS code; points balance, how points work, order history (with "order again"), points history |
| `/[lang]/staff` | Staff only: latest orders, mark cash orders delivered (credits points), cancel orders, adjust a customer's points |

## Accounts, points and promo codes

- **Accounts are optional.** Guests can still check out without signing in.
- **Points:** 1 point per 1 AED spent on products (after discounts, delivery fee excluded).
  Credited when a card / Apple Pay / Google Pay order is **paid** (Stripe webhook) or when staff mark a cash order **delivered**.
  Cancelling an order returns points spent on it and takes back points earned from it (down to zero if already spent).
- **Rewards:** every 500 points = 25 AED off; 150 points = free delivery. Change these in `site.points` (`src/config/site.ts`).
- **Promo codes** live in `src/data/promos.ts`:
  - `NATIONDAY`: 15% off products, every year 1–3 December (UAE time).
  - `FAZZA`: 10% off products, all year, no membership check.
  - A promo code **can't be combined** with a points money-off discount. Free delivery with points still works with a code.
- **Staff accounts:** sign in once on the site, then in Supabase set that user's `role` to `staff` (Table editor → `profiles`). Open `/ar/staff`.

### Setting up Supabase (one time)

1. Create a project at supabase.com (choose a region close to the UAE, e.g. Bahrain/Mumbai if available).
2. SQL editor → run `supabase/migrations/0001_accounts_points.sql`.
3. Authentication → Providers → **Phone**: enable it and connect an SMS provider (e.g. Twilio, with a sender approved for the UAE).
4. Project settings → API: copy the URL, anon key and service-role key into `.env.local`.
   The service-role key is **secret**: server only, never in the browser.

Without the Supabase keys the store runs exactly as before (guest checkout, promo codes still work); account links are hidden.

## Where to change things

| What | File |
|---|---|
| Name, logo, phone, WhatsApp, email, Instagram, trade license, TRN, site URL, VAT, delivery fees, minimum order, free-delivery threshold, time slots | `src/config/site.ts` |
| Products, categories, cutting options, prices, stock | `src/data/catalog.ts` |
| Branches, addresses, coordinates, opening hours; emirates and areas | `src/data/places.ts` |
| All Arabic / English wording | `src/lib/i18n.ts` |
| Colors, fonts, spacing | `src/app/globals.css` (`:root` tokens) |
| Logo and product photos | `public/logo.svg`, `public/images/` |

## Placeholders (must be replaced before launch)

- **Business details** in `src/config/site.ts`: phone, WhatsApp, email, Instagram, trade license number, TRN, domain. Confirm the official **Arabic trade name** spelling.
- **Logo:** `public/logo.svg` is a stand-in.
- **Product photos:** `public/images/cat-*.svg` are drawn placeholders, one per category. Add real photos (WebP/AVIF, about 800×600) and set `image` on each product.
- **All sample data is fake:** products, prices, stock, branches, addresses, map coordinates, opening hours, and the delivery areas list.
- **Delivery fees and minimum order per emirate:** the values in `site.delivery.emirates` are invented.
- **Wording to confirm:** "Same-day delivery on orders before 7 pm", trust-row claims and FAQ answers.
- **VAT on discounts:** points and promo discounts reduce the VAT-inclusive total, and VAT is worked out on what the customer pays. Have your accountant confirm this treatment.

## What you need to provide

1. **Stripe account** (UAE) with live keys, Apple Pay domain verification for your domain (Stripe dashboard → Settings → Payment methods → Apple Pay), and a webhook pointing to `https://<domain>/api/stripe/webhook` for `payment_intent.succeeded` and `payment_intent.payment_failed`. Put the keys in `.env.local`.
2. **Supabase project + SMS provider** (see above). With Supabase connected, every order (guest or signed-in) is saved and visible on the staff page. Each order, notify-me request and contact message is also logged and, if `ORDER_WEBHOOK_URL` is set, posted there as JSON (e.g. a Make/Zapier hook that forwards to WhatsApp or email).
3. Real catalogue, prices, stock, branches, hours, delivery fees and minimum orders.

## How it works (notes for developers)

- Prices include 5% VAT. Checkout shows the VAT contained in the total (`total × 5 / 105`).
- The server **recomputes every price** from the catalogue (`/api/checkout`); prices from the browser are ignored.
- Branch open/closed status and delivery slots use UAE time (UTC+4) and are computed in the browser after load, so static pages never show a stale status.
- The cart, chosen delivery slot, last order (for "reorder") and contact details are stored in the browser's `localStorage`.
- Phone numbers are accepted as `050…`, `50…`, `+97150…` and normalised to `+9715XXXXXXXX`.
- Stripe.js loads only on the checkout page; other pages ship about 125 KB of JavaScript on first load.

## Tests

```bash
npm test
```

Runs the points and promo rules, and runs the Supabase migration on an in-memory Postgres (PGlite)
to check earning, spending, refunds, cancellations and row-level security (customers can't edit their own balance).
