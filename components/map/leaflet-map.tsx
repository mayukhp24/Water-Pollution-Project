"use client"

import "leaflet/dist/leaflet.css"
import { useEffect } from "react"
import { CircleMarker, MapContainer, TileLayer, Tooltip, ZoomControl, useMap } from "react-leaflet"
import type { LatLngBoundsExpression } from "leaflet"
import { getBin } from "@/lib/map/layers"
import type { LayerDefinition, Region } from "@/lib/map/types"
import { formatValue } from "./format"

export type MapView = "india" | "tamil-nadu" | "chennai"
export type Basemap = "dark" | "light" | "satellite"

export type FocusRequest =
  | { type: "view"; view: MapView; n: number }
  | { type: "region"; id: string; n: number }

export const VIEW_BOUNDS: Record<MapView, LatLngBoundsExpression> = {
  india: [
    [6.5, 68.0],
    [35.7, 97.4],
  ],
  "tamil-nadu": [
    [8.0, 76.2],
    [13.6, 80.4],
  ],
  chennai: [
    [12.78, 79.98],
    [13.24, 80.34],
  ],
}

// Keep panning around the subcontinent.
const MAX_BOUNDS: LatLngBoundsExpression = [
  [-2, 55],
  [42, 110],
]

// All providers below are keyless, so the map works on any host without extra env vars.
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services"

const BASEMAPS: Record<Basemap, { url: string; labelsUrl?: string; attribution: string; maxNativeZoom: number }> = {
  dark: {
    url: `${ESRI}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
    labelsUrl: `${ESRI}/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`,
    attribution: "Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors",
    maxNativeZoom: 16,
  },
  light: {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxNativeZoom: 19,
  },
  satellite: {
    url: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
    attribution: "Tiles &copy; Esri &mdash; Esri, Maxar, Earthstar Geographics",
    maxNativeZoom: 18,
  },
}

interface LeafletMapProps {
  regions: Region[]
  layer: LayerDefinition
  selectedId: string | null
  onSelect: (id: string) => void
  basemap: Basemap
  focus: FocusRequest | null
}

export default function LeafletMap({ regions, layer, selectedId, onSelect, basemap, focus }: LeafletMapProps) {
  // Draw the selected marker last so it sits on top of its neighbours.
  const ordered = [...regions].sort((a, b) => Number(a.id === selectedId) - Number(b.id === selectedId))
  const tiles = BASEMAPS[basemap]

  return (
    <MapContainer
      bounds={VIEW_BOUNDS["tamil-nadu"]}
      boundsOptions={{ padding: [24, 24] }}
      maxBounds={MAX_BOUNDS}
      minZoom={4}
      maxZoom={16}
      zoomControl={false}
      className="h-full w-full"
    >
      <TileLayer key={basemap} url={tiles.url} attribution={tiles.attribution} maxNativeZoom={tiles.maxNativeZoom} />
      {tiles.labelsUrl && <TileLayer key={`${basemap}-labels`} url={tiles.labelsUrl} maxNativeZoom={tiles.maxNativeZoom} />}
      <ZoomControl position="bottomright" />
      <FocusController focus={focus} regions={regions} />

      {ordered.map((region) => {
        const value = region.metrics[layer.id]
        const bin = getBin(layer, value)
        const selected = region.id === selectedId
        const baseRadius = region.kind === "metro-locality" ? 7 : 10

        return (
          <CircleMarker
            key={region.id}
            center={[region.lat, region.lng]}
            radius={selected ? baseRadius + 4 : baseRadius}
            pathOptions={{
              color: selected ? "#ffffff" : "rgba(10, 12, 16, 0.85)",
              weight: selected ? 3 : 1.5,
              fillColor: bin.color,
              fillOpacity: 0.9,
            }}
            eventHandlers={{ click: () => onSelect(region.id) }}
          >
            <Tooltip direction="top" offset={[0, -baseRadius]} className="aqua-tooltip">
              <div className="font-medium">{region.name}</div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: bin.color }} />
                {layer.shortLabel}: {formatValue(value)} {layer.unit}
              </div>
            </Tooltip>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}

function FocusController({ focus, regions }: { focus: FocusRequest | null; regions: Region[] }) {
  const map = useMap()

  useEffect(() => {
    if (!focus) return
    if (focus.type === "view") {
      map.flyToBounds(VIEW_BOUNDS[focus.view], { padding: [24, 24], duration: 1.2 })
      return
    }
    const region = regions.find((r) => r.id === focus.id)
    if (region) {
      map.flyTo([region.lat, region.lng], Math.max(map.getZoom(), region.kind === "metro-locality" ? 12 : 10), {
        duration: 1.2,
      })
    }
    // `n` changes on every request so repeated clicks on the same target still fly.
  }, [focus, map, regions])

  return null
}
