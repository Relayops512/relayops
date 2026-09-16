# RelayOps

RelayOps is a company-pilot web app that covers incoming truck loads with the **best available truck** — closest, legal, and on time.

Dispatchers get a **Today** board of loads that need cover, a plain-English reason for the recommended truck, and one-tap Assign. Fleet CSV upload and a skippable first-run setup are included. Fairness / override-rate tools exist as an **optional Advanced** setting (off by default). Samsara is stubbed as a future ELD connector. The pilot runs on **demo fleet data** — no live API keys required.

## Demo login

| Role | Email | Password | Access |
| --- | --- | --- | --- |
| Dispatcher | `dispatcher@relayops.demo` | `RelayOps2026!` | Full — create loads, assign, override, sync settings |
| Viewer | `viewer@relayops.demo` | `Viewer2026!` | Read-only |

A second dispatcher (`jordan@relayops.demo` / same password) exists for the optional fairness tools.

The UI shows a **Demo data** badge while the sample fleet is in use. Seeded data includes 22 trucks (including Truck 184 / Marcus Hill) and 15 loads across Midwest / South lanes.

## Local run

Requires Node 20+ and npm.

```bash
cp .env.example .env
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app boots an in-memory demo fleet (same accounts and trucks as production). No database is required for the company demo.

Useful commands:

```bash
npm test           # matching + distance unit tests
npm run build      # production build
npm run db:reset   # optional local Prisma/SQLite seed (not used by the Vercel demo)
```

## What the matching engine scores

Each open load is ranked against the live truck pool from **seed / database fields** (nothing is hardcoded to a single winner):

| Factor | What it uses |
| --- | --- |
| HOS remaining | Drive and duty minutes vs estimated trip time |
| Deadhead | Haversine miles from truck GPS to pickup |
| Fuel | `(deadhead + loaded miles) / MPG × diesel` |
| ETA | Can the truck make the pickup window at 55 mph |
| Trailer fit | Dry van / reefer / flatbed must match |
| Fairness | Weekly load count vs fleet average (used in ranking; the audit UI is optional) |

Legal-now + trailer match + enough HOS is **eligible**. Picking anyone else still works with a **short note**.

## Company pilot deploy (shareable URL)

### Vercel (fastest public URL)

1. Push this repo to GitHub.
2. Import the project at [vercel.com/new](https://vercel.com/new).
3. Set environment variables (no paid database required):
   - `AUTH_SECRET` — `openssl rand -base64 32`
   - `AUTH_URL` — `https://relayops.vercel.app` (or your Vercel URL)
   - `AUTH_TRUST_HOST` — `true`
   - `DATABASE_URL` is optional and unused on Vercel
4. Deploy. Share the URL plus the demo dispatcher account.

Production uses an **in-memory demo store** so serverless functions do not need a writable SQLite file. Login, matching, assign, and optional fairness tools work for a click-through pilot. Writes reset when a new serverless instance starts. For a week-long company pilot with durable traffic, use Postgres (below).

### Persistent pilot (recommended for a real fleet test)

Use [Neon](https://neon.tech), [Vercel Postgres](https://vercel.com/storage/postgres), or [Railway](https://railway.app):

1. Create a Postgres database and copy the connection string.
2. In `prisma/schema.prisma`, change `provider = "sqlite"` to `provider = "postgresql"`.
3. Set `DATABASE_URL` to the Postgres URL and `AUTH_SECRET` / `AUTH_URL` as above.
4. Run `npx prisma db push && npx tsx prisma/seed.ts` against that database (or keep the Vercel build command).

Railway / Render / Fly.io can also run `npm run build && npm start` with the SQLite file on a persistent volume.

### Environment variables

See `.env.example`.

| Name | Required | Purpose |
| --- | --- | --- |
| `AUTH_SECRET` | yes in production | Session signing key |
| `AUTH_URL` | recommended | Canonical app URL for Auth.js |
| `AUTH_TRUST_HOST` | recommended on Vercel | Allow Auth.js behind the Vercel proxy |
| `DATABASE_URL` | optional | Only for local Prisma/SQLite (`file:./dev.db`) |

## Product map

- **Today** — Open loads sorted by appointment. Each row shows the lane, window, best truck, and a one-line why. Assign uses the top-ranked truck; expand for other options.
- **New load** — Pickup, delivery, windows, trailer, weight.
- **Fleet** — Ready vs not. Add a few trucks or upload a CSV (replace or merge).
- **Setup** — Samsara placeholder (demo mode on). **Advanced → Fairness tools** is off by default.

First visit (or a still-demo fleet) offers a short, skippable onboarding: add trucks → cover a load → assign.

## Fleet CSV upload

Dispatchers can load a company fleet without Samsara from **Fleet**. Download the template at `/api/fleet/template` or use **Template** in the app.

| Column | Required | Notes |
| --- | --- | --- |
| `truckNumber` | yes | Aliases: `unit`, `unitNumber`, `truck` |
| `driverName` | yes | Aliases: `driver`, `name` |
| `trailerType` | no | `dry_van`, `reefer`, `flatbed` (default dry van) |
| `lat`, `lng` | no | If omitted, location is unknown and match quality drops |
| `hosDriveMinutesRemaining` | no | Default 480 |
| `hosDutyMinutesRemaining` | no | Default 600 |
| `mpg` | no | Fuel efficiency; default 7 |
| `status` | no | `available` / `unavailable` (also legal_now, hos_blocked, maintenance) |
| `weeklyLoadCount` | no | Used by ranking; default 0 |

Example:

```csv
truckNumber,driverName,trailerType,lat,lng,hosDriveMinutesRemaining,hosDutyMinutesRemaining,mpg,status,weeklyLoadCount
184,Marcus Hill,dry_van,39.7684,-86.1581,525,605,7.6,available,2
191,Elena Ruiz,dry_van,38.2527,-85.7585,480,590,7.2,available,1
203,Priya Shah,reefer,,,390,510,6.9,available,0
```

- **Replace** swaps the live truck list. **Merge** upserts by truck number.
- Bad rows are listed and skipped. If the file has no valid rows, the current fleet is left unchanged.
- Matching reads `store.listTrucks()` — the same list Today uses — so an import is live immediately.
- On Vercel the fleet is in-memory: it lasts for the serverless instance and **resets to demo trucks on a cold start**. Paste the CSV again after a reset. Samsara is still optional later for live GPS/HOS.

## Stack

Next.js App Router, TypeScript, Tailwind CSS, Auth.js (credentials / JWT), in-memory demo store (Prisma + SQLite optional locally). Roles: `DISPATCHER` and `VIEWER`.
