# AquaCheck

Water quality analyzer with an India water map focused on Tamil Nadu.

- **Analyzer**: checks water test values against WHO / EPA limits.
- **Map**: layers for water quality, rainfall, scarcity, groundwater, TDS and flood risk across 41 Tamil Nadu places (estimated data in `data/map/tamil-nadu-regions.json`).
- **Community readings**: anyone can pick a place and submit any subset of 21 measurements (just water temperature, or everything). Stored in Postgres.
- **Chat assistant**: powered by Groq.

## Run locally

```bash
pnpm install
cp .env.local.example .env.local   # then fill in GROQ_API_KEY
pnpm dev
```

Without `DATABASE_URL`, submitted readings are kept in memory and disappear when the dev server restarts.

## Database setup (Vercel + Neon, free tier)

1. In the Vercel dashboard, open the project → **Storage** → **Create Database** → **Neon (Serverless Postgres)**.
2. Pick the free plan and a region close to your users (e.g. Singapore / Mumbai), then **Connect** it to this project for all environments.
   Vercel adds `DATABASE_URL` to the project's environment variables automatically.
3. **Redeploy** the latest deployment so it picks up the new variable.

The `observations` table is created automatically on the first request; there's no migration to run.
To use the real database locally too, copy `DATABASE_URL` from Vercel → Settings → Environment Variables into `.env.local`.

## API

| Route | Method | Description |
| --- | --- | --- |
| `/api/map/layers` | GET | Layer definitions and colour classes |
| `/api/map/regions` | GET | All places with estimated metrics |
| `/api/map/regions/:id` | GET | One place |
| `/api/observations?regionId=:id` | GET | Latest 20 community readings and per-attribute averages |
| `/api/observations` | POST | Add a reading: `{ regionId, observedOn, sourceType, readings: { attr: number }, contributor?, notes? }` |

Measurement attributes and their allowed ranges are defined in `lib/observations/attributes.ts`. Submissions are validated against them and limited to 20 per hour per visitor.

## Deploy

Works on Vercel with no configuration, and on Netlify via `netlify.toml`. Set `GROQ_API_KEY` (and `DATABASE_URL` if not using the Vercel Neon integration) in the host's environment variables.
