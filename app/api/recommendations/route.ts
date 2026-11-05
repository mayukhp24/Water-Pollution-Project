import { NextResponse } from "next/server"
import Groq from "groq-sdk"
import { z } from "zod"
import type { ReuseFeed } from "@/lib/reuse/types"
import { isLanguageCode, languageName } from "@/lib/i18n/languages"

export const dynamic = "force-dynamic"

const requestSchema = z.object({
  drinkingResult: z.enum(["safe", "warning", "unsafe"]),
  language: z.string().optional(),
  readings: z
    .array(
      z.object({
        id: z.string().max(40),
        label: z.string().max(80),
        value: z.number().finite(),
        unit: z.string().max(20),
        status: z.enum(["safe", "warning", "danger"]),
        safeMin: z.number().finite(),
        safeMax: z.number().finite(),
      }),
    )
    .min(1)
    .max(40),
})

const VERDICTS = ["suitable", "with_treatment", "not_suitable"] as const

const itemSchema = z.object({
  use: z.string().min(1).max(120),
  verdict: z.preprocess(
    (v) => (typeof v === "string" ? v.toLowerCase().replace(/[\s-]+/g, "_") : v),
    z.enum(VERDICTS),
  ),
  reason: z.string().min(1).max(800),
  treatment: z.string().max(400).nullish(),
})

// Lenient on length (the prompt asks for 4-6 uses); extra items are trimmed rather than rejected.
const aiSchema = z.object({
  summary: z.string().min(1).max(1000),
  domestic: z.array(itemSchema).min(1).transform((items) => items.slice(0, 8)),
  industry: z.array(itemSchema).min(1).transform((items) => items.slice(0, 8)),
  tips: z
    .array(z.string().max(500))
    .default([])
    .transform((tips) => tips.slice(0, 4)),
})

// Same shape as aiSchema, in the JSON Schema subset Groq's strict mode accepts
// (every property required, no additional properties, nullable via a type union).
const ITEM_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["use", "verdict", "reason", "treatment"],
  properties: {
    use: { type: "string" },
    verdict: { type: "string", enum: [...VERDICTS] },
    reason: { type: "string" },
    treatment: { type: ["string", "null"] },
  },
}

const RESPONSE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "domestic", "industry", "tips"],
  properties: {
    summary: { type: "string" },
    domestic: { type: "array", items: ITEM_JSON_SCHEMA },
    industry: { type: "array", items: ITEM_JSON_SCHEMA },
    tips: { type: "array", items: { type: "string" } },
  },
}

const SYSTEM_PROMPT = `You are a water-reuse engineer in India advising households and industries.
Given lab measurements of a water sample, recommend where the water can still be used, even if it is not drinkable.

Respond with ONLY a JSON object of this exact shape:
{
  "summary": "1-2 sentences: overall character of this water and its best uses",
  "domestic": [ { "use": "short name", "verdict": "suitable" | "with_treatment" | "not_suitable", "reason": "1 sentence citing the measured values", "treatment": "short treatment or null" } ],
  "industry": [ same shape ],
  "tips": [ "up to 3 short practical tips" ]
}

Rules:
- Give 4-6 domestic uses (e.g. bathing, laundry, dishwashing, toilet flushing, floor or footpath cleaning, vehicle washing, gardening) and 4-6 industrial uses (e.g. cooling tower or coolant make-up, boiler feed, concrete mixing, dust suppression, irrigation, textile processing, aquaculture, fire-fighting reserve).
- Order each list from most to least suitable, and make the uses specific to the problems in THIS sample.
- Judge each use only by the parameters that actually matter for it. Example: hardness and odour do not matter for footpath cleaning, toilet flushing or dust suppression, so those are "suitable"; hard water is acceptable as coolant make-up with antiscalant. Always include at least two "suitable" uses per list when any exist.
- Base every verdict only on the measurements given. Refer to actual values and units in the reason. Do not invent measurements.
- If coliform, E. coli or other pathogens are above zero, never mark body-contact or food uses "suitable"; require disinfection.
- If bacteria were not measured, say disinfection is advisable for body-contact uses.
- Use Indian standards where relevant (BIS 10500 drinking, IS 456 concrete, CPCB discharge norms).
- "treatment" must be null when verdict is "suitable".
- Plain, friendly English. No markdown.`

export async function POST(req: Request) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey || apiKey === "your_key_here" || apiKey === "your_groq_api_key_here") {
    return NextResponse.json({ error: "AI recommendations need GROQ_API_KEY to be set." }, { status: 503 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 })
  }
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid readings." }, { status: 400 })
  }
  const { readings, drinkingResult } = parsed.data
  const language = isLanguageCode(parsed.data.language) ? languageName(parsed.data.language) : "English"
  const languageRule =
    language === "English"
      ? `\n- Write "use" in Title Case (e.g. "Footpath Cleaning").`
      : `\n\nLANGUAGE: Write every text value in ${language} using its native script — "summary", "reason", "treatment", "tips" AND every "use" name (e.g. translate "Footpath Cleaning" and "Cooling Tower Make-up" into ${language}; do not leave use names in English). Keep JSON keys and "verdict" values exactly as specified in English. Keep units, numbers and abbreviations like pH, TDS, BOD, E. coli, IS 456 as they are.`

  const sample = readings
    .map((r) => {
      const unit = r.unit ? ` ${r.unit}` : ""
      return `- ${r.label}: ${r.value}${unit} (drinking-safe range ${r.safeMin}–${r.safeMax}${unit}; status: ${r.status})`
    })
    .join("\n")

  const groq = new Groq({ apiKey })
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-20b"
  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT + languageRule },
    {
      role: "user" as const,
      content: `Drinking-water verdict from our analyzer: ${drinkingResult}.\nMeasured parameters:\n${sample}`,
    },
  ]

  // Strict structured outputs first (constrained decoding, so the shape is guaranteed on models that
  // support it, such as gpt-oss). If that fails — unsupported model or a transient error — retry once
  // with plain JSON mode. Errors from either attempt are logged and the client falls back to rules.
  const attempts = [
    { type: "json_schema" as const, json_schema: { name: "reuse_feed", strict: true, schema: RESPONSE_JSON_SCHEMA } },
    { type: "json_object" as const },
  ]

  let lastError = "Failed to get AI recommendations."
  for (const response_format of attempts) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        temperature: 0.4,
        // Keeps gpt-oss fast and light on the per-minute token budget; ignored by other models.
        ...(model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" as const } : {}),
        response_format,
        messages,
      })

      const raw = completion.choices[0]?.message?.content ?? ""
      let json: unknown = null
      try {
        json = JSON.parse(raw)
      } catch {
        // handled below as an unexpected shape
      }
      const result = aiSchema.safeParse(json)
      if (!result.success) {
        console.error(`AI recommendations (${response_format.type}) had an unexpected shape:`, result.error.issues[0], raw.slice(0, 300))
        lastError = "The AI returned an unexpected answer."
        continue
      }
      return NextResponse.json({ feed: toFeed(result.data) })
    } catch (error: any) {
      console.error(`AI recommendations (${response_format.type}) failed:`, error?.message ?? error)
      lastError = error?.status === 429 ? "The AI is busy (rate limit). Try again in a minute." : lastError
    }
  }

  return NextResponse.json({ error: lastError }, { status: 502 })
}

function toFeed(data: z.infer<typeof aiSchema>): ReuseFeed {
  const toItems = (items: z.infer<typeof itemSchema>[], sector: "domestic" | "industry") =>
    items.map((i) => ({
      use: i.use,
      sector,
      verdict: i.verdict,
      reason: i.reason,
      treatment: i.verdict === "suitable" ? null : (i.treatment ?? null),
    }))

  return {
    source: "ai",
    summary: data.summary,
    domestic: toItems(data.domestic, "domestic"),
    industry: toItems(data.industry, "industry"),
    tips: data.tips,
  }
}
