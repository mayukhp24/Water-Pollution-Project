import type { AnalyzedReading, ReuseFeed, ReuseRecommendation, Sector, Verdict } from "./types"

// Rule-based "where can this water still be used?" engine. It runs instantly in the browser
// and is the fallback when the AI feed is unavailable. Limits are indicative, loosely based on
// IS 456 (concrete), FAO irrigation guidelines, cooling-tower and boiler make-up practice.

interface Check {
  param: string
  min?: number
  max?: number
  /** "treatable": usable after the listed treatment. "blocking": not suitable for this use. */
  kind: "treatable" | "blocking"
}

interface UseRule {
  use: string
  sector: Sector
  /** Why this use is tolerant or strict — shown when nothing fails. */
  goodReason: string
  checks: Check[]
  /** Uses involving body contact or ingestion get a caveat when microbiology wasn't tested. */
  needsMicrobiology?: boolean
}

const PATHOGENS = ["total_coliform", "fecal_coliform", "e_coli", "giardia", "cryptosporidium"]

const TREATMENTS: Record<string, string> = {
  ph: "pH correction (lime or acid dosing)",
  hardness: "water softener or antiscalant",
  solids: "RO or blending with fresher water",
  turbidity: "settling and sand filtration",
  conductivity: "RO or blending with fresher water",
  temperature: "cooling / storage before use",
  color: "activated carbon filtration",
  odor: "aeration or activated carbon",
  chloramines: "activated carbon",
  sulfate: "RO or blending",
  organic_carbon: "biological treatment or activated carbon",
  trihalomethanes: "activated carbon",
  chloride: "RO or blending with fresher water",
  nitrate: "ion exchange or RO",
  nitrite: "aeration and chlorination",
  fluoride: "activated alumina or RO",
  ammonia: "aeration / biological nitrification",
  dissolved_oxygen: "aeration",
  bod: "biological treatment (e.g. settling + aeration)",
  cod: "biological or chemical oxidation",
  total_coliform: "chlorination or UV disinfection",
  fecal_coliform: "chlorination or UV disinfection",
  e_coli: "chlorination or UV disinfection",
  heterotrophic_plate_count: "chlorination",
  giardia: "fine filtration plus UV",
  cryptosporidium: "fine filtration plus UV",
  algae_count: "filtration and chlorination",
  chlorophyll_a: "filtration and chlorination",
}

const RULES: UseRule[] = [
  // ---- Domestic --------------------------------------------------------------------------
  {
    use: "Bathing & personal hygiene",
    sector: "domestic",
    goodReason: "Clear, odourless and free of harmful microbes, so it's comfortable on skin.",
    needsMicrobiology: true,
    checks: [
      { param: "e_coli", max: 0, kind: "treatable" },
      { param: "fecal_coliform", max: 0, kind: "treatable" },
      { param: "total_coliform", max: 10, kind: "treatable" },
      { param: "giardia", max: 0, kind: "treatable" },
      { param: "cryptosporidium", max: 0, kind: "treatable" },
      { param: "ph", min: 6, max: 9, kind: "treatable" },
      { param: "turbidity", max: 5, kind: "treatable" },
      { param: "odor", max: 3, kind: "treatable" },
      { param: "ammonia", max: 1.5, kind: "treatable" },
    ],
  },
  {
    use: "Laundry",
    sector: "domestic",
    goodReason: "Soft and clear enough that soap lathers well and clothes won't stain.",
    checks: [
      { param: "hardness", max: 300, kind: "treatable" },
      { param: "color", max: 25, kind: "treatable" },
      { param: "turbidity", max: 10, kind: "treatable" },
      { param: "odor", max: 5, kind: "treatable" },
      { param: "e_coli", max: 100, kind: "treatable" },
    ],
  },
  {
    use: "Dishwashing & utensils",
    sector: "domestic",
    goodReason: "Low hardness avoids spots and clean water won't contaminate dishes.",
    needsMicrobiology: true,
    checks: [
      { param: "e_coli", max: 0, kind: "treatable" },
      { param: "fecal_coliform", max: 0, kind: "treatable" },
      { param: "hardness", max: 300, kind: "treatable" },
      { param: "turbidity", max: 5, kind: "treatable" },
      { param: "odor", max: 3, kind: "treatable" },
    ],
  },
  {
    use: "Toilet flushing",
    sector: "domestic",
    goodReason: "Flushing tolerates most quality issues; only very foul water needs attention.",
    checks: [
      { param: "ph", min: 5.5, max: 9.5, kind: "treatable" },
      { param: "turbidity", max: 50, kind: "treatable" },
      { param: "odor", max: 8, kind: "treatable" },
      { param: "algae_count", max: 20000, kind: "treatable" },
    ],
  },
  {
    use: "Floor, footpath & vehicle washing",
    sector: "domestic",
    goodReason: "Outdoor cleaning doesn't need drinking quality; mild odour or hardness is fine.",
    checks: [
      { param: "ph", min: 6, max: 9, kind: "treatable" },
      { param: "odor", max: 8, kind: "treatable" },
      { param: "e_coli", max: 200, kind: "treatable" },
      { param: "fecal_coliform", max: 200, kind: "treatable" },
      { param: "turbidity", max: 50, kind: "treatable" },
    ],
  },
  {
    use: "Garden & plant watering",
    sector: "domestic",
    goodReason: "Salt levels are low enough for plants; nitrates even act as mild fertiliser.",
    checks: [
      { param: "conductivity", max: 3000, kind: "treatable" },
      { param: "solids", max: 2000, kind: "treatable" },
      { param: "chloride", max: 350, kind: "treatable" },
      { param: "ph", min: 6, max: 8.5, kind: "treatable" },
      { param: "e_coli", max: 1000, kind: "blocking" },
      { param: "fluoride", max: 5, kind: "blocking" },
    ],
  },

  // ---- Industry --------------------------------------------------------------------------
  {
    use: "Cooling tower / coolant make-up",
    sector: "industry",
    goodReason: "Cooling systems tolerate moderate hardness and odour when dosed with antiscalant and biocide.",
    checks: [
      { param: "hardness", max: 500, kind: "treatable" },
      { param: "chloride", max: 500, kind: "treatable" },
      { param: "solids", max: 2500, kind: "treatable" },
      { param: "ph", min: 6.5, max: 9, kind: "treatable" },
      { param: "ammonia", max: 1, kind: "treatable" },
      { param: "e_coli", max: 1000, kind: "treatable" },
      { param: "algae_count", max: 10000, kind: "treatable" },
    ],
  },
  {
    use: "Boiler feed water",
    sector: "industry",
    goodReason: "Very soft, low-solids water; still pass it through a softener before the boiler.",
    checks: [
      { param: "hardness", max: 50, kind: "treatable" },
      { param: "solids", max: 500, kind: "treatable" },
      { param: "conductivity", max: 800, kind: "treatable" },
      { param: "dissolved_oxygen", max: 8, kind: "treatable" },
      { param: "ph", min: 7, max: 9, kind: "treatable" },
      { param: "organic_carbon", max: 4, kind: "treatable" },
    ],
  },
  {
    use: "Construction & concrete mixing",
    sector: "industry",
    goodReason: "Within IS 456 limits for mixing and curing concrete and mortar.",
    checks: [
      { param: "chloride", max: 500, kind: "blocking" },
      { param: "sulfate", max: 400, kind: "blocking" },
      { param: "solids", max: 2000, kind: "treatable" },
      { param: "ph", min: 6, kind: "treatable" },
      { param: "organic_carbon", max: 20, kind: "treatable" },
    ],
  },
  {
    use: "Dust suppression (roads, mines, sites)",
    sector: "industry",
    goodReason: "Spraying for dust control tolerates almost any non-hazardous water.",
    checks: [
      { param: "ph", min: 5.5, max: 9.5, kind: "treatable" },
      { param: "e_coli", max: 1000, kind: "treatable" },
      { param: "odor", max: 9, kind: "treatable" },
    ],
  },
  {
    use: "Agricultural irrigation",
    sector: "industry",
    goodReason: "Salinity and chloride are within FAO limits for most crops.",
    checks: [
      { param: "conductivity", max: 3000, kind: "treatable" },
      { param: "solids", max: 2000, kind: "treatable" },
      { param: "chloride", max: 350, kind: "treatable" },
      { param: "ph", min: 6, max: 8.5, kind: "treatable" },
      { param: "e_coli", max: 1000, kind: "blocking" },
      { param: "fluoride", max: 5, kind: "blocking" },
    ],
  },
  {
    use: "Textile dyeing & processing",
    sector: "industry",
    goodReason: "Soft, colourless water gives even dye uptake.",
    checks: [
      { param: "hardness", max: 50, kind: "treatable" },
      { param: "color", max: 5, kind: "treatable" },
      { param: "turbidity", max: 5, kind: "treatable" },
      { param: "ph", min: 6.5, max: 8, kind: "treatable" },
    ],
  },
  {
    use: "Food & beverage processing",
    sector: "industry",
    goodReason: "Meets drinking-water quality, which food processing requires.",
    needsMicrobiology: true,
    // Filled in below: every parameter must be in its drinking-safe range.
    checks: [],
  },
  {
    use: "Aquaculture (fish & prawn ponds)",
    sector: "industry",
    goodReason: "Enough oxygen and low ammonia keep fish healthy.",
    checks: [
      { param: "dissolved_oxygen", min: 5, kind: "treatable" },
      { param: "ammonia", max: 0.5, kind: "treatable" },
      { param: "ph", min: 6.5, max: 8.5, kind: "treatable" },
      { param: "nitrite", max: 1, kind: "treatable" },
      { param: "temperature", max: 32, kind: "treatable" },
    ],
  },
]

function formatLimit(check: Check, unit: string): string {
  const u = unit ? ` ${unit}` : ""
  if (check.min !== undefined && check.max !== undefined) return `${check.min}–${check.max}${u}`
  if (check.max !== undefined) return `≤ ${check.max}${u}`
  return `≥ ${check.min}${u}`
}

function evaluate(rule: UseRule, readings: AnalyzedReading[]): ReuseRecommendation {
  const byId = new Map(readings.map((r) => [r.id, r]))

  // Food processing = potable standard on whatever was measured.
  const checks: Check[] =
    rule.checks.length > 0
      ? rule.checks
      : readings.map((r) => ({ param: r.id, min: r.safeMin, max: r.safeMax, kind: "treatable" as const }))

  const failures: { check: Check; reading: AnalyzedReading }[] = []
  let relevantMeasured = 0
  for (const check of checks) {
    const reading = byId.get(check.param)
    if (!reading) continue
    relevantMeasured++
    const tooLow = check.min !== undefined && reading.value < check.min
    const tooHigh = check.max !== undefined && reading.value > check.max
    if (tooLow || tooHigh) failures.push({ check, reading })
  }

  const blocking = failures.filter((f) => f.check.kind === "blocking")
  const describe = (f: (typeof failures)[number]) =>
    `${f.reading.label} ${f.reading.value}${f.reading.unit ? ` ${f.reading.unit}` : ""} (needs ${formatLimit(f.check, f.reading.unit)})`

  let verdict: Verdict
  let reason: string
  let treatment: string | null = null

  if (blocking.length > 0) {
    verdict = "not_suitable"
    reason = `${blocking.map(describe).join("; ")}. This can't be fixed cheaply for this use.`
  } else if (failures.length > 0) {
    verdict = "with_treatment"
    reason = `Usable after treatment: ${failures.map(describe).join("; ")}.`
    treatment = [...new Set(failures.map((f) => TREATMENTS[f.check.param]).filter(Boolean))].join(", ")
  } else {
    verdict = "suitable"
    // Only claim specifics when something relevant to this use was actually measured.
    reason = relevantMeasured > 0 ? rule.goodReason : "None of the parameters you measured are a problem for this use."
    if (rule.needsMicrobiology && !readings.some((r) => PATHOGENS.includes(r.id))) {
      verdict = "with_treatment"
      reason = `${rule.goodReason} Bacteria weren't tested, so disinfect before use to be safe.`
      treatment = "chlorination or boiling"
    }
  }

  return { use: rule.use, sector: rule.sector, verdict, reason, treatment }
}

const VERDICT_ORDER: Record<Verdict, number> = { suitable: 0, with_treatment: 1, not_suitable: 2 }

export function buildRuleBasedFeed(readings: AnalyzedReading[], drinkingResult: "safe" | "warning" | "unsafe"): ReuseFeed {
  const all = RULES.map((rule) => evaluate(rule, readings)).sort(
    (a, b) => VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict],
  )
  const domestic = all.filter((r) => r.sector === "domestic")
  const industry = all.filter((r) => r.sector === "industry")
  const usable = all.filter((r) => r.verdict === "suitable").length

  const problems = readings.filter((r) => r.status !== "safe").map((r) => r.label)
  const drinking =
    drinkingResult === "safe"
      ? "This water meets drinking limits on the parameters you measured"
      : `Not ideal for drinking${problems.length ? ` (${problems.slice(0, 3).join(", ")})` : ""}`

  const tips: string[] = []
  if (readings.some((r) => r.id === "hardness" && r.value > 300)) {
    tips.push("Hard water: use it for cooling, flushing or cleaning, and keep softened water for laundry and boilers.")
  }
  if (readings.some((r) => r.id === "odor" && r.value > 3)) {
    tips.push("Odour usually comes from dissolved gases or organics; a day of open-air storage or aeration often removes it.")
  }
  if (readings.some((r) => PATHOGENS.includes(r.id) && r.value > 0)) {
    tips.push("Bacteria detected: avoid any use involving skin contact or food until it is chlorinated or UV-treated.")
  }
  if (readings.length < 5) {
    tips.push("Only a few parameters were measured. Testing bacteria, TDS and hardness would make these recommendations more reliable.")
  }

  return {
    source: "rules",
    summary: `${drinking}. It can be used directly for ${usable} of ${all.length} purposes, and more after simple treatment.`,
    domestic,
    industry,
    tips,
  }
}
