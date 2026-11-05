import dataset from "@/data/map/tamil-nadu-regions.json"
import type { ClimateZone, MapDatasetMeta, Region, RegionRecord } from "./types"

// Server-side data access for the map. The dataset ships as JSON inside the bundle so the
// API routes work unchanged on Vercel, Netlify or any static/serverless host. To move to a
// real database later, replace the bodies of these functions — the API contract stays the same.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

// Share of annual rainfall per month (%), by climate zone. Each row sums to 100.
const MONSOON_PROFILES: Record<ClimateZone, number[]> = {
  "ne-coastal": [3, 1, 1, 1, 3, 4, 6, 8, 9, 20, 28, 16],
  interior: [1, 1, 2, 4, 7, 6, 6, 9, 13, 20, 20, 11],
  western: [1, 2, 3, 7, 9, 7, 6, 6, 9, 22, 19, 9],
  hills: [2, 2, 4, 8, 10, 14, 15, 12, 9, 13, 8, 3],
  south: [4, 2, 3, 6, 6, 5, 4, 4, 5, 22, 26, 13],
}

function toRegion(record: RegionRecord): Region {
  const profile = MONSOON_PROFILES[record.climate]
  return {
    ...record,
    state: "Tamil Nadu",
    monthlyRainfall: MONTHS.map((month, i) => ({
      month,
      mm: Math.round((record.metrics.rainfall * profile[i]) / 100),
    })),
  }
}

const REGIONS: Region[] = (dataset.regions as RegionRecord[]).map(toRegion)

export function getMapMeta(): MapDatasetMeta {
  return dataset.meta as MapDatasetMeta
}

export function getRegions(): Region[] {
  return REGIONS
}

export function getRegionById(id: string): Region | undefined {
  return REGIONS.find((r) => r.id === id)
}
