export type Sector = "domestic" | "industry"

export type Verdict = "suitable" | "with_treatment" | "not_suitable"

/** One measured parameter, as captured when the user clicked Analyze. */
export interface AnalyzedReading {
  id: string
  label: string
  value: number
  unit: string
  status: "safe" | "warning" | "danger"
  safeMin: number
  safeMax: number
}

export interface ReuseRecommendation {
  use: string
  sector: Sector
  verdict: Verdict
  reason: string
  treatment: string | null
}

export interface ReuseFeed {
  source: "rules" | "ai"
  summary: string
  domestic: ReuseRecommendation[]
  industry: ReuseRecommendation[]
  tips: string[]
}
