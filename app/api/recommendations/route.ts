import { NextResponse } from "next/server"
import Groq from "groq-sdk"
import { z } from "zod"
import type { ReuseFeed } from "@/lib/reuse/types"

export const dynamic = "force-dynamic"

const requestSchema = z.object({
  drinkingResult: z.enum(["safe", "warning", "unsafe"]),
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
  use: z.string().min(1).max(80),
  verdict: z.preprocess(
    (v) => (typeof v === "string" ? v.toLowerCase().replace(/[\s-]+/g, "_") : v),
    z.enum(VERDICTS),
  ),
  reason: z.string().min(1).max(400),
  treatment: z.string().max(200).nullish(),
})

const aiSchema = z.object({
  summary: z.string().min(1).max(500),
  domestic: z.array(itemSchema).min(1).max(8),
  industry: z.array(itemSchema).min(1).max(8),
  tips: z.array(z.string().max(300)).max(5).default([]),
})

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
- Write "use" in Title Case (e.g. "Footpath Cleaning").
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

  const sample = readings
    .map((r) => {
      const unit = r.unit ? ` ${r.unit}` : ""
      return `- ${r.label}: ${r.value}${unit} (drinking-safe range ${r.safeMin}–${r.safeMax}${unit}; status: ${r.status})`
    })
    .join("\n")

  try {
    const groq = new Groq({ apiKey })
    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Drinking-water verdict from our analyzer: ${drinkingResult}.\nMeasured parameters:\n${sample}`,
        },
      ],
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
      console.error("AI recommendations had an unexpected shape:", result.error.issues[0], raw.slice(0, 500))
      return NextResponse.json({ error: "The AI returned an unexpected answer. Try again." }, { status: 502 })
    }

    const toItems = (items: z.infer<typeof itemSchema>[], sector: "domestic" | "industry") =>
      items.map((i) => ({
        use: i.use,
        sector,
        verdict: i.verdict,
        reason: i.reason,
        treatment: i.verdict === "suitable" ? null : (i.treatment ?? null),
      }))

    const feed: ReuseFeed = {
      source: "ai",
      summary: result.data.summary,
      domestic: toItems(result.data.domestic, "domestic"),
      industry: toItems(result.data.industry, "industry"),
      tips: result.data.tips,
    }
    return NextResponse.json({ feed })
  } catch (error: any) {
    console.error("AI recommendations failed:", error)
    return NextResponse.json({ error: error?.message || "Failed to get AI recommendations." }, { status: 500 })
  }
}
