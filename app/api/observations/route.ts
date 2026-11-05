import { createHash } from "node:crypto"
import { NextResponse } from "next/server"
import { z } from "zod"
import { getRegionById } from "@/lib/map/data"
import { ATTRIBUTES_BY_ID, SOURCE_TYPES, type ObservationsResponse, type SourceTypeId } from "@/lib/observations/attributes"
import { getObservationStore } from "@/lib/observations/store"

// User submissions change constantly — never cache.
export const dynamic = "force-dynamic"

const RATE_LIMIT = { max: 20, minutes: 60 }

const submissionSchema = z.object({
  regionId: z.string().min(1),
  observedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  sourceType: z.enum(SOURCE_TYPES.map((s) => s.id) as [SourceTypeId, ...SourceTypeId[]]),
  readings: z.record(z.number().finite()),
  contributor: z.string().trim().max(60).nullish(),
  notes: z.string().trim().max(500).nullish(),
  // Honeypot: hidden in the form, so only bots fill it in.
  website: z.string().optional(),
})

export async function GET(req: Request) {
  const regionId = new URL(req.url).searchParams.get("regionId")
  if (!regionId || !getRegionById(regionId)) {
    return NextResponse.json({ error: "Unknown or missing regionId." }, { status: 400 })
  }

  const store = getObservationStore()
  if (!store) {
    return NextResponse.json<ObservationsResponse>({
      storage: null,
      observations: [],
      summary: { count: 0, averages: {} },
    })
  }

  try {
    const [observations, summary] = await Promise.all([store.list(regionId, 20), store.summarize(regionId)])
    return NextResponse.json<ObservationsResponse>({ storage: store.kind, observations, summary })
  } catch (error) {
    console.error("Failed to load observations:", error)
    return NextResponse.json({ error: "Could not load readings from the database." }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const store = getObservationStore()
  if (!store) {
    return NextResponse.json(
      { error: "Saving readings is not set up yet: no database is connected to this deployment." },
      { status: 503 },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 })
  }

  const parsed = submissionSchema.safeParse(body)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return NextResponse.json({ error: `${issue.path.join(".") || "body"}: ${issue.message}` }, { status: 400 })
  }
  const input = parsed.data

  if (input.website) {
    // Pretend success so bots don't retry.
    return NextResponse.json({ ok: true }, { status: 201 })
  }

  if (!getRegionById(input.regionId)) {
    return NextResponse.json({ error: "Unknown place." }, { status: 400 })
  }

  const error = validateDate(input.observedOn) ?? validateReadings(input.readings)
  if (error) return NextResponse.json({ error }, { status: 400 })

  try {
    const clientHash = hashClient(req)
    if ((await store.countRecentByClient(clientHash, RATE_LIMIT.minutes)) >= RATE_LIMIT.max) {
      return NextResponse.json(
        { error: `Too many submissions. You can add up to ${RATE_LIMIT.max} readings per hour.` },
        { status: 429 },
      )
    }

    const observation = await store.insert({
      regionId: input.regionId,
      observedOn: input.observedOn,
      sourceType: input.sourceType,
      readings: input.readings,
      contributor: input.contributor || null,
      notes: input.notes || null,
      clientHash,
    })
    return NextResponse.json({ observation }, { status: 201 })
  } catch (err) {
    console.error("Failed to save observation:", err)
    return NextResponse.json({ error: "Could not save the reading to the database." }, { status: 500 })
  }
}

function validateDate(observedOn: string): string | null {
  const date = new Date(`${observedOn}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return "Invalid date."
  // Allow one day of slack for time zones ahead of UTC (IST is +5:30).
  const tomorrow = Date.now() + 24 * 60 * 60 * 1000
  if (date.getTime() > tomorrow) return "Date can't be in the future."
  if (date.getUTCFullYear() < 2000) return "Date must be in or after 2000."
  return null
}

function validateReadings(readings: Record<string, number>): string | null {
  const entries = Object.entries(readings)
  if (entries.length === 0) return "Add at least one measurement."
  for (const [key, value] of entries) {
    const attribute = ATTRIBUTES_BY_ID.get(key)
    if (!attribute) return `Unknown measurement "${key}".`
    if (value < attribute.min || value > attribute.max) {
      return `${attribute.label} must be between ${attribute.min} and ${attribute.max}${attribute.unit ? ` ${attribute.unit}` : ""}.`
    }
  }
  return null
}

// One-way hash of the caller's IP, used only for rate limiting; the raw IP is never stored.
function hashClient(req: Request): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown"
  return createHash("sha256")
    .update(`${process.env.RATE_LIMIT_SALT ?? "aquacheck"}:${ip}`)
    .digest("hex")
}
