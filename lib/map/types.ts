// Shared types for the map explorer — used by both the API routes and the client.

export type LayerId = "wqi" | "rainfall" | "scarcity" | "groundwater" | "tds" | "floodRisk"

export type RegionKind = "metro-locality" | "city" | "town"

export type ClimateZone = "ne-coastal" | "interior" | "western" | "hills" | "south"

export type RegionMetrics = Record<LayerId, number>

export interface RegionRecord {
  id: string
  name: string
  district: string
  kind: RegionKind
  lat: number
  lng: number
  population: number
  climate: ClimateZone
  primarySource: string
  ph: number
  notes: string
  metrics: RegionMetrics
}

export interface Region extends RegionRecord {
  state: string
  monthlyRainfall: { month: string; mm: number }[]
}

export interface LayerBin {
  /** Inclusive lower bound of this class; the highest bin whose `from` <= value wins. */
  from: number
  label: string
  color: string
}

export interface LayerDefinition {
  id: LayerId
  label: string
  shortLabel: string
  unit: string
  icon: "droplets" | "cloud-rain" | "sun" | "arrow-down" | "flask" | "waves"
  description: string
  /** true when a larger value is a better outcome (e.g. WQI). Drives ranking copy. */
  higherIsBetter: boolean
  bins: LayerBin[]
}

export interface MapDatasetMeta {
  coverage: string
  dataType: "estimated"
  updated: string
  disclaimer: string
}

export interface RegionsResponse {
  meta: MapDatasetMeta
  regions: Region[]
}

export interface LayersResponse {
  layers: LayerDefinition[]
}
