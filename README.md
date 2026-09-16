# Squarefour Developments — Site Finance & Billing

A simple, phone-friendly app for tracking daily purchases, labour/mason payments,
and other expenses across construction sites — and turning them into a clean,
printable/PDF/WhatsApp-ready bill.

## 1. Create your Supabase project (one-time, ~5 minutes)

1. Go to [supabase.com](https://supabase.com) and sign up / log in (free tier is enough).
2. Click **New project**. Pick any name (e.g. "squarefour-developments") and a strong
   database password — save that password somewhere safe.
3. Once the project finishes provisioning, open **SQL Editor** (left sidebar) →
   **New query**, paste the entire contents of [`supabase/schema.sql`](./supabase/schema.sql)
   from this repo, and click **Run**. This creates all tables, security rules,
   storage folders, and starter categories.
4. Open **Authentication → Users** → **Add user** → **Create new user**. Enter
   the single shared email + password your whole team will use to log in
   (e.g. `office@squarefour.com`). Turn **Auto Confirm User** on.
5. Open **Project Settings → API**. You'll need two values from this page:
   - **Project URL**
   - **anon public** key

## 2. Connect the app to Supabase

Open `.env.local` in this folder and fill in the two values from step 1.5:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## 3. Run it locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with the shared
email/password from step 1.4.

## 4. Deploy so your team can use it on their phones

```bash
npx vercel login
npx vercel
```

Follow the prompts (link/create a project, accept defaults). When asked, add the
same two environment variables from `.env.local` under the Vercel project's
**Settings → Environment Variables**, then redeploy with `npx vercel --prod`.
You'll get a permanent link like `squarefour-developments.vercel.app` that works
on any phone or tablet browser.

## Day-to-day use

- **Dashboard** — pick a site at the top, then tap Add Purchase / Add Labour-Mason /
  Add Other Expense. The form auto-saves as you type, so a dropped signal or an
  accidental close never loses an entry — reopen the page and it offers to restore it.
- **Ledger** — every entry for the selected site, filterable by day/week/month/
  custom range, searchable, with soft-delete + undo.
- **Workers** — tap any worker to see exactly how much they've been paid this
  week, month, or year.
- **Bill** — pick a date range and get an instant printable statement grouped by
  Purchases / Labour-Mason / Other with a grand total — download as PDF, download
  as an image, or share straight to WhatsApp.
- **Settings** — add/remove sites, categories, and workers, and upload the real
  company logo (replaces the placeholder "SD" badge everywhere, no redeploy needed).

## Tech notes

Next.js (App Router) + TypeScript + Tailwind CSS, Supabase (Postgres + Auth +
Storage) as the backend, `html2canvas`/`jsPDF` for exports, and the Web Share
API for one-tap WhatsApp sharing on mobile. See `supabase/schema.sql` for the
full data model and security rules.
