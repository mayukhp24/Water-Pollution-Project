// Catalog of measurements a person can submit for a place. Shared by the form and the API,
// so adding an entry here is all it takes to make a new attribute available.

export type AttributeGroup = "Physical" | "Chemical" | "Biological" | "Supply & hydrology"

export interface ObservationAttribute {
  id: string
  label: string
  unit: string
  group: AttributeGroup
  min: number
  max: number
  step: number
  /** Short hint shown under the input, e.g. the safe limit. */
  hint?: string
}

export const OBSERVATION_ATTRIBUTES: ObservationAttribute[] = [
  { id: "waterTemp", label: "Water temperature", unit: "°C", group: "Physical", min: 0, max: 60, step: 0.1 },
  { id: "ph", label: "pH", unit: "", group: "Physical", min: 0, max: 14, step: 0.1, hint: "Safe 6.5–8.5" },
  { id: "turbidity", label: "Turbidity", unit: "NTU", group: "Physical", min: 0, max: 1000, step: 0.1, hint: "Safe < 1" },
  { id: "tds", label: "Total dissolved solids", unit: "mg/L", group: "Physical", min: 0, max: 20000, step: 1, hint: "Safe < 500" },
  { id: "conductivity", label: "Conductivity", unit: "µS/cm", group: "Physical", min: 0, max: 50000, step: 1, hint: "Safe < 800" },

  { id: "dissolvedOxygen", label: "Dissolved oxygen", unit: "mg/L", group: "Chemical", min: 0, max: 20, step: 0.1, hint: "Healthy > 5" },
  { id: "bod", label: "BOD", unit: "mg/L", group: "Chemical", min: 0, max: 1000, step: 0.1, hint: "Safe < 3" },
  { id: "cod", label: "COD", unit: "mg/L", group: "Chemical", min: 0, max: 5000, step: 1, hint: "Safe < 10" },
  { id: "hardness", label: "Total hardness", unit: "mg/L", group: "Chemical", min: 0, max: 5000, step: 1, hint: "Safe < 300" },
  { id: "chloride", label: "Chloride", unit: "mg/L", group: "Chemical", min: 0, max: 20000, step: 1, hint: "Safe < 250" },
  { id: "nitrate", label: "Nitrate", unit: "mg/L", group: "Chemical", min: 0, max: 1000, step: 0.1, hint: "Safe < 45" },
  { id: "fluoride", label: "Fluoride", unit: "mg/L", group: "Chemical", min: 0, max: 50, step: 0.01, hint: "Safe < 1.5" },
  { id: "iron", label: "Iron", unit: "mg/L", group: "Chemical", min: 0, max: 100, step: 0.01, hint: "Safe < 0.3" },
  { id: "arsenic", label: "Arsenic", unit: "µg/L", group: "Chemical", min: 0, max: 5000, step: 0.1, hint: "Safe < 10" },
  { id: "lead", label: "Lead", unit: "µg/L", group: "Chemical", min: 0, max: 5000, step: 0.1, hint: "Safe < 10" },
  { id: "residualChlorine", label: "Residual chlorine", unit: "mg/L", group: "Chemical", min: 0, max: 20, step: 0.01, hint: "Target 0.2–1" },

  { id: "eColi", label: "E. coli", unit: "CFU/100mL", group: "Biological", min: 0, max: 1000000, step: 1, hint: "Safe = 0" },
  { id: "totalColiform", label: "Total coliform", unit: "MPN/100mL", group: "Biological", min: 0, max: 1000000, step: 1, hint: "Safe = 0" },

  { id: "rainfall", label: "Rainfall (that day)", unit: "mm", group: "Supply & hydrology", min: 0, max: 1500, step: 0.1 },
  { id: "groundwaterLevel", label: "Groundwater level", unit: "m bgl", group: "Supply & hydrology", min: 0, max: 500, step: 0.1 },
  { id: "supplyHours", label: "Piped supply", unit: "hrs/day", group: "Supply & hydrology", min: 0, max: 24, step: 0.5 },
]

export const ATTRIBUTE_GROUPS: AttributeGroup[] = ["Physical", "Chemical", "Biological", "Supply & hydrology"]

export const ATTRIBUTES_BY_ID = new Map(OBSERVATION_ATTRIBUTES.map((a) => [a.id, a]))

export const SOURCE_TYPES = [
  { id: "tap", label: "Tap / piped supply" },
  { id: "borewell", label: "Borewell" },
  { id: "open-well", label: "Open well" },
  { id: "lake", label: "Lake / tank" },
  { id: "river", label: "River" },
  { id: "tanker", label: "Tanker" },
  { id: "packaged", label: "Packaged / RO" },
  { id: "rain", label: "Rain gauge" },
  { id: "other", label: "Other" },
] as const

export type SourceTypeId = (typeof SOURCE_TYPES)[number]["id"]

export interface Observation {
  id: string
  regionId: string
  observedOn: string // YYYY-MM-DD
  sourceType: SourceTypeId
  readings: Record<string, number>
  contributor: string | null
  notes: string | null
  createdAt: string // ISO timestamp
}

export interface ObservationSummary {
  count: number
  /** Average per attribute across all stored readings for the place. */
  averages: Record<string, { avg: number; n: number }>
}

export interface ObservationsResponse {
  /** null when no database is configured on the server. */
  storage: "postgres" | "memory" | null
  observations: Observation[]
  summary: ObservationSummary
}
