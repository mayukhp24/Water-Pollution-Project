import { neon } from "@neondatabase/serverless"
import type { Observation, ObservationSummary, SourceTypeId } from "./attributes"

// Storage for user-submitted readings.
// - With DATABASE_URL set (Vercel → Storage → Neon adds it automatically) data goes to Postgres.
// - Without it, local development falls back to an in-memory store so the UI still works;
//   that data is lost when the dev server restarts. Production without a database is "not configured".

export interface NewObservation {
  regionId: string
  observedOn: string
  sourceType: SourceTypeId
  readings: Record<string, number>
  contributor: string | null
  notes: string | null
  clientHash: string
}

export interface ObservationStore {
  kind: "postgres" | "memory"
  list(regionId: string, limit: number): Promise<Observation[]>
  summarize(regionId: string): Promise<ObservationSummary>
  insert(input: NewObservation): Promise<Observation>
  countRecentByClient(clientHash: string, minutes: number): Promise<number>
}

let cached: ObservationStore | null | undefined

export function getObservationStore(): ObservationStore | null {
  if (cached !== undefined) return cached
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (url) cached = createPostgresStore(url)
  else if (process.env.NODE_ENV !== "production") cached = createMemoryStore()
  else cached = null
  return cached
}

// ---------------------------------------------------------------------------------------------
// Postgres (Neon serverless driver — HTTP based, so it works in Vercel/Netlify functions)

function createPostgresStore(url: string): ObservationStore {
  const sql = neon(url)
  let schemaReady: Promise<void> | null = null

  // Creates the table on first use so there is no separate migration step to run.
  const ensureSchema = () => {
    schemaReady ??= (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS observations (
          id           BIGSERIAL PRIMARY KEY,
          region_id    TEXT        NOT NULL,
          observed_on  DATE        NOT NULL,
          source_type  TEXT        NOT NULL,
          readings     JSONB       NOT NULL,
          contributor  TEXT,
          notes        TEXT,
          client_hash  TEXT        NOT NULL,
          created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
        )`
      await sql`CREATE INDEX IF NOT EXISTS observations_region_idx ON observations (region_id, created_at DESC)`
      await sql`CREATE INDEX IF NOT EXISTS observations_client_idx ON observations (client_hash, created_at DESC)`
    })().catch((error) => {
      schemaReady = null
      throw error
    })
    return schemaReady
  }

  return {
    kind: "postgres",

    async list(regionId, limit) {
      await ensureSchema()
      const rows = await sql`
        SELECT id, region_id, to_char(observed_on, 'YYYY-MM-DD') AS observed_on, source_type,
               readings, contributor, notes, created_at
        FROM observations
        WHERE region_id = ${regionId}
        ORDER BY created_at DESC
        LIMIT ${limit}`
      return rows.map(rowToObservation)
    },

    async summarize(regionId) {
      await ensureSchema()
      const [countRows, avgRows] = await Promise.all([
        sql`SELECT count(*)::int AS count FROM observations WHERE region_id = ${regionId}`,
        sql`
          SELECT r.key, avg(r.value::float8) AS avg, count(*)::int AS n
          FROM observations o, jsonb_each_text(o.readings) AS r
          WHERE o.region_id = ${regionId}
          GROUP BY r.key`,
      ])
      const averages: ObservationSummary["averages"] = {}
      for (const row of avgRows) averages[row.key] = { avg: Number(row.avg), n: Number(row.n) }
      return { count: Number(countRows[0]?.count ?? 0), averages }
    },

    async insert(input) {
      await ensureSchema()
      const rows = await sql`
        INSERT INTO observations (region_id, observed_on, source_type, readings, contributor, notes, client_hash)
        VALUES (${input.regionId}, ${input.observedOn}, ${input.sourceType}, ${JSON.stringify(input.readings)}::jsonb,
                ${input.contributor}, ${input.notes}, ${input.clientHash})
        RETURNING id, region_id, to_char(observed_on, 'YYYY-MM-DD') AS observed_on, source_type,
                  readings, contributor, notes, created_at`
      return rowToObservation(rows[0])
    },

    async countRecentByClient(clientHash, minutes) {
      await ensureSchema()
      const rows = await sql`
        SELECT count(*)::int AS count FROM observations
        WHERE client_hash = ${clientHash} AND created_at > now() - make_interval(mins => ${minutes})`
      return Number(rows[0]?.count ?? 0)
    },
  }
}

function rowToObservation(row: Record<string, any>): Observation {
  return {
    id: String(row.id),
    regionId: row.region_id,
    observedOn: row.observed_on,
    sourceType: row.source_type,
    readings: typeof row.readings === "string" ? JSON.parse(row.readings) : row.readings,
    contributor: row.contributor ?? null,
    notes: row.notes ?? null,
    createdAt: new Date(row.created_at).toISOString(),
  }
}

// ---------------------------------------------------------------------------------------------
// In-memory fallback for local development

type StoredObservation = Observation & { clientHash: string }

// Kept on globalThis so hot reloads in `next dev` don't wipe it.
const memory = globalThis as unknown as { __aquaObservations?: StoredObservation[] }

function createMemoryStore(): ObservationStore {
  const rows = (memory.__aquaObservations ??= [])
  let nextId = rows.length + 1

  return {
    kind: "memory",

    async list(regionId, limit) {
      return rows
        .filter((r) => r.regionId === regionId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit)
        .map(({ clientHash: _, ...o }) => o)
    },

    async summarize(regionId) {
      const forRegion = rows.filter((r) => r.regionId === regionId)
      const totals: Record<string, { sum: number; n: number }> = {}
      for (const r of forRegion) {
        for (const [key, value] of Object.entries(r.readings)) {
          totals[key] ??= { sum: 0, n: 0 }
          totals[key].sum += value
          totals[key].n += 1
        }
      }
      const averages: ObservationSummary["averages"] = {}
      for (const [key, t] of Object.entries(totals)) averages[key] = { avg: t.sum / t.n, n: t.n }
      return { count: forRegion.length, averages }
    },

    async insert(input) {
      const row: StoredObservation = {
        id: String(nextId++),
        regionId: input.regionId,
        observedOn: input.observedOn,
        sourceType: input.sourceType,
        readings: input.readings,
        contributor: input.contributor,
        notes: input.notes,
        clientHash: input.clientHash,
        createdAt: new Date().toISOString(),
      }
      rows.push(row)
      const { clientHash: _, ...observation } = row
      return observation
    },

    async countRecentByClient(clientHash, minutes) {
      const since = Date.now() - minutes * 60_000
      return rows.filter((r) => r.clientHash === clientHash && Date.parse(r.createdAt) > since).length
    },
  }
}
