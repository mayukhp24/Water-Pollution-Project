import { NextResponse } from "next/server"
import { MAP_LAYERS } from "@/lib/map/layers"
import type { LayersResponse } from "@/lib/map/types"

// Static data — prerendered at build time so it is served from the CDN on Vercel/Netlify.
export const dynamic = "force-static"

export function GET() {
  return NextResponse.json<LayersResponse>({ layers: MAP_LAYERS })
}
