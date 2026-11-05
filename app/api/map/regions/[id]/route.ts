import { NextResponse } from "next/server"
import { getRegionById, getRegions } from "@/lib/map/data"

export const dynamic = "force-static"
export const dynamicParams = false

export function generateStaticParams() {
  return getRegions().map((r) => ({ id: r.id }))
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const region = getRegionById(id)

  if (!region) {
    return NextResponse.json({ error: `Region "${id}" not found.` }, { status: 404 })
  }

  return NextResponse.json({ region })
}
