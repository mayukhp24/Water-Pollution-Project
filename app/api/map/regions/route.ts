import { NextResponse } from "next/server"
import { getMapMeta, getRegions } from "@/lib/map/data"
import type { RegionsResponse } from "@/lib/map/types"

// Static data — prerendered at build time so it is served from the CDN on Vercel/Netlify.
export const dynamic = "force-static"

export function GET() {
  return NextResponse.json<RegionsResponse>({ meta: getMapMeta(), regions: getRegions() })
}
