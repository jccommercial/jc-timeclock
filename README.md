# JC Commercial Time Clock.

QR-based clock-in/clock-out for cleaning sites. Cleaners scan a printed QR code on arrival, pick their name, enter their PIN, and tap Clock In — no app install. You get a live dashboard, weekly/monthly reports with expected-vs-actual hours, an issue log, and CSV export.

Runs free on Supabase + Vercel. Replaces the time-tracking side of ServiceM8.

---

## What's in Phase 1

**Cleaner view** (phone, via QR scan)
- Pick name from list, enter personal 4-digit PIN
- Clock In / Clock Out with one big button
- Optional note + "flag an issue for Jordan" at clock-out
- GPS recorded silently (never blocks clock-in — flags the shift if the phone is >500m from the site)
- Remembers the cleaner's name on their phone for next time

**Admin dashboard** (you, any device, password-protected)
- Live view: who's on the clock right now, where, since when, GPS on-site badge
- Today's completed shifts and hours
- Logs & Reports: this/last week, this/last month, filter by site or contractor
- Expected vs actual hours per site (set expected hours/week on each site)
- Flag & issue log (GPS mismatches, 14h+ shifts, different-site clock-outs, cleaner-flagged issues)
- Fix forgotten clock-outs, clear flags, delete bad records — edits are marked "Edited"
- Export any view to CSV (opens in Excel)

**Site & contractor management**
- Add/deactivate sites and contractors
- Printable A4 QR poster per site + PNG download
- Reset PINs

Not in Phase 1 (deliberately): photo upload, rosters/scheduling, payroll export to Xero, SMS alerts. All possible later.

---

## Setup — about 30 minutes, one time

You need: a GitHub account, a Supabase account, a Vercel account (all free — sign up for the last two *with* GitHub to keep it simple).

### Step 1 — Supabase (the database)

1. Go to https://supabase.com → New project. Name: `jc-timeclock`. Region: **Sydney**. Set a strong database password (you won't need it day-to-day, just store it).
2. When the project finishes creating, open **SQL Editor** (left sidebar) → New query.
3. Open `supabase/schema.sql` from this folder, paste the whole thing in, click **Run**. You should see "Success".
4. Go to **Project Settings → API** and copy two values somewhere safe:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **service_role key** (under "Project API keys" — the secret one, NOT the anon key)

### Step 2 — Put the code on GitHub

1. Go to https://github.com/new → name it `jc-timeclock` → **Private** → Create.
2. Upload this folder's contents. Easiest without command-line tools: on the empty repo page click "uploading an existing file", drag in everything **except** `node_modules` and `.next` (if present). Commit.
   - If you have git installed: `git init && git add . && git commit -m "Phase 1" && git remote add origin <your-repo-url> && git push -u origin main`

### Step 3 — Vercel (the hosting)

1. Go to https://vercel.com → Add New → Project → Import `jc-timeclock` from GitHub.
2. Before clicking Deploy, expand **Environment Variables** and add these four:

   | Name | Value |
   |---|---|
   | `SUPABASE_URL` | the Project URL from Step 1 |
   | `SUPABASE_SERVICE_ROLE_KEY` | the service_role key from Step 1 |
   | `ADMIN_PASSWORD` | a strong password — this is your dashboard login |
   | `AUTH_SECRET` | any long random string (mash the keyboard, 30+ characters) |

3. Click **Deploy**. Two minutes later you'll have a URL like `https://jc-timeclock.vercel.app`.
4. Optional: add a custom domain like `clock.jccommercial.com.au` under Project → Settings → Domains.

### Step 4 — Load your data

1. Open `https://your-url/admin`, sign in with your `ADMIN_PASSWORD`.
2. **Contractors** tab: add each cleaner with a unique 4-digit PIN. Text each person their own PIN privately.
3. **Sites & QR Codes** tab: add each site. Set **expected hours/week** to power the variance report. For the GPS check, right-click the site on Google Maps → click the coordinates to copy → paste lat/lng.
4. Click **View / print QR** on each site, print it, laminate it, and stick it where cleaners start their shift (inside the cleaner's cupboard door works well — semi-private but easy to find).

### Step 5 — Test it

Scan a QR with your own phone, clock in as a test contractor, clock out with a note and an issue flag. Check it all appears on the dashboard, then delete the test records from Logs & Reports.

---

## Day-to-day

- **Cleaner forgot to clock out?** It shows on the dashboard with a "forgot to clock out?" badge after 14h. Go to Logs & Reports → find the open shift → "Open — set clock-out" → type the real finish time. The record is marked as admin-edited.
- **New cleaner?** Add them in Contractors with a PIN. They appear in the dropdown immediately.
- **Lost/ended site?** Deactivate it — its QR stops working, history is kept.
- **Cleaner left?** Deactivate, don't delete — keeps the history for invoicing/disputes.
- **Payroll/invoicing:** Logs & Reports → pick the period → Export CSV → opens straight in Excel.

## Costs & limits

- **$0/month** at your scale. Supabase free tier: 500MB database — clock records are tiny; 30–40 cleaners punching twice a day is roughly 25,000 rows/year, which is a rounding error. Vercel free tier covers this traffic comfortably.
- One caution: Supabase **pauses** free projects after ~7 days with no activity. Daily clock-ins count as activity, so in normal use this never happens. If you ever shut down over Christmas for 2+ weeks, just open the dashboard once to wake it (takes a minute to resume).

## Security notes (honest picture)

- The admin area is protected by one password (set in Vercel). Anyone with it has full access — don't reuse a password from elsewhere.
- PINs stop cleaners punching each other in casually. They're stored in plain text so you can view/reset them — fine for this use, but it means anyone with admin access can see PINs.
- QR URLs contain a long random token, so the punch page can't be guessed, but anyone who photographs the poster could clock in from home — that's what the GPS flag is for. Check the flag log weekly.
- All data lives in your Supabase project (Sydney region), accessible only via the server with the service key.

## Phase 2 candidates

Photo upload at clock-out (Supabase Storage is already in the stack), roster/expected-shift scheduling per contractor, weekly summary email, Xero timesheet export, and a proper audit trail on admin edits. Build them when Phase 1 has bedded in — not before.
