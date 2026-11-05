"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import {
  ArrowDownToLine,
  ArrowUpDown,
  ChevronUp,
  CloudRain,
  Droplets,
  FlaskConical,
  Globe,
  Layers,
  Map as MapIcon,
  Moon,
  RotateCcw,
  Satellite,
  Sun,
  Waves,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getBin, getLayer } from "@/lib/map/layers"
import type { LayerDefinition, LayerId, LayersResponse, MapDatasetMeta, Region, RegionsResponse } from "@/lib/map/types"
import type { Basemap, FocusRequest, MapView } from "./leaflet-map"
import { RegionDetails } from "./region-details"
import { formatValue } from "./format"
import { useTheme } from "next-themes"
import { useI18n } from "@/lib/i18n/provider"
import type { Messages } from "@/lib/i18n/messages/en"

// Leaflet touches `window`, so the map itself only renders in the browser.
const LeafletMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => <LoadingMapPlaceholder />,
})

function LoadingMapPlaceholder() {
  const { m } = useI18n()
  return <MapPlaceholder label={m.map.loadingMap} />
}

const LAYER_ICONS: Record<LayerDefinition["icon"], React.ElementType> = {
  droplets: Droplets,
  "cloud-rain": CloudRain,
  sun: Sun,
  "arrow-down": ArrowDownToLine,
  flask: FlaskConical,
  waves: Waves,
}

type MapStrings = Messages["map"]

const VIEWS: { id: MapView; label: keyof MapStrings }[] = [
  { id: "india", label: "viewIndia" },
  { id: "tamil-nadu", label: "viewTamilNadu" },
  { id: "chennai", label: "viewChennai" },
]

const BASEMAP_OPTIONS: { id: Basemap; label: keyof MapStrings; icon: React.ElementType }[] = [
  { id: "dark", label: "basemapDark", icon: Moon },
  { id: "light", label: "basemapStreets", icon: MapIcon },
  { id: "satellite", label: "basemapSatellite", icon: Satellite },
]

type Scope = "all" | "metro" | "cities"

const SCOPES: { id: Scope; label: keyof MapStrings }[] = [
  { id: "all", label: "scopeAll" },
  { id: "metro", label: "scopeMetro" },
  { id: "cities", label: "scopeCities" },
]

// Layer definitions come from the API in English; swap in the UI language by layer id so every
// consumer (legend, tooltips, rankings, details) is translated in one place.
function localizeLayers(layers: LayerDefinition[], m: Messages): LayerDefinition[] {
  return layers.map((layer) => {
    const t = m.layers[layer.id]
    return {
      ...layer,
      label: t.label,
      shortLabel: t.short,
      description: t.description,
      bins: layer.bins.map((bin, i) => ({ ...bin, label: t.bins[i] ?? bin.label })),
    }
  })
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; layers: LayerDefinition[]; regions: Region[]; meta: MapDatasetMeta }

export function MapExplorer() {
  const { m, fmt } = useI18n()
  const t = m.map
  const { resolvedTheme } = useTheme()
  const [load, setLoad] = useState<LoadState>({ status: "loading" })
  const [activeLayerId, setActiveLayerId] = useState<LayerId>("wqi")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [basemap, setBasemap] = useState<Basemap>("dark")

  // Follow the site theme with the matching basemap, unless satellite is chosen.
  useEffect(() => {
    if (!resolvedTheme) return
    setBasemap((current) => (current === "satellite" ? current : resolvedTheme === "light" ? "light" : "dark"))
  }, [resolvedTheme])
  const [focus, setFocus] = useState<FocusRequest | null>(null)
  const [tab, setTab] = useState<"details" | "rankings">("rankings")
  const [scope, setScope] = useState<Scope>("all")
  const [worstFirst, setWorstFirst] = useState(true)
  const [legendOpen, setLegendOpen] = useState(false)

  const fetchData = useCallback(async () => {
    setLoad({ status: "loading" })
    try {
      const [layersRes, regionsRes] = await Promise.all([fetch("/api/map/layers"), fetch("/api/map/regions")])
      if (!layersRes.ok || !regionsRes.ok) throw new Error("The map data service returned an error.")
      const { layers }: LayersResponse = await layersRes.json()
      const { regions, meta }: RegionsResponse = await regionsRes.json()
      setLoad({ status: "ready", layers, regions, meta })
    } catch (error) {
      setLoad({ status: "error", message: error instanceof Error ? error.message : "" })
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const layers = useMemo(() => (load.status === "ready" ? localizeLayers(load.layers, m) : []), [load, m])
  const regions = load.status === "ready" ? load.regions : []
  const activeLayer = layers.length ? getLayer(layers, activeLayerId) : null
  const selectedRegion = regions.find((r) => r.id === selectedId) ?? null

  const ranked = useMemo(() => {
    if (!activeLayer) return []
    const scoped = regions.filter((r) =>
      scope === "all" ? true : scope === "metro" ? r.kind === "metro-locality" : r.kind !== "metro-locality",
    )
    // "Worst first" means lowest values first when higher is better, and vice versa.
    const direction = activeLayer.higherIsBetter === worstFirst ? 1 : -1
    return [...scoped].sort((a, b) => direction * (a.metrics[activeLayer.id] - b.metrics[activeLayer.id]))
  }, [regions, activeLayer, scope, worstFirst])

  const summary = useMemo(() => {
    if (!activeLayer || !regions.length) return null
    const values = regions.map((r) => r.metrics[activeLayer.id])
    const average = values.reduce((sum, v) => sum + v, 0) / values.length
    return { average, min: Math.min(...values), max: Math.max(...values) }
  }, [regions, activeLayer])

  const selectRegion = (id: string, fly: boolean) => {
    setSelectedId(id)
    setTab("details")
    if (fly) setFocus({ type: "region", id, n: Date.now() })
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Layers className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>{t.title}</CardTitle>
              <CardDescription>{t.description}</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="border-warning/40 text-warning">
            {t.badge}
          </Badge>
        </div>

        {/* Layer selector */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2" role="radiogroup" aria-label={t.layerAria}>
          {(layers.length
            ? layers
            : PLACEHOLDER_LAYERS.map((p) => ({ ...p, shortLabel: m.layers[p.id].short }))
          ).map((layer) => {
            const Icon = LAYER_ICONS[layer.icon]
            const active = layer.id === activeLayerId
            return (
              <button
                key={layer.id}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={!layers.length}
                onClick={() => setActiveLayerId(layer.id)}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors disabled:opacity-50 ${
                  active
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/70"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? "text-primary" : ""}`} />
                <span className="truncate">{layer.shortLabel}</span>
              </button>
            )
          })}
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Map */}
          <div className="relative isolate h-[440px] sm:h-[560px] overflow-hidden rounded-lg border border-border">
            {load.status === "ready" && activeLayer ? (
              <LeafletMap
                regions={regions}
                layer={activeLayer}
                selectedId={selectedId}
                onSelect={(id) => selectRegion(id, false)}
                basemap={basemap}
                focus={focus}
              />
            ) : load.status === "error" ? (
              <MapPlaceholder label={load.message || t.loadError}>
                <Button variant="outline" size="sm" onClick={fetchData}>
                  <RotateCcw className="w-4 h-4" />
                  {m.common.retry}
                </Button>
              </MapPlaceholder>
            ) : (
              <MapPlaceholder label={t.loadingData} />
            )}

            {/* View presets */}
            <div className="absolute top-3 left-3 z-[1000] flex gap-1 rounded-md border border-border bg-card/90 p-1 backdrop-blur-sm">
              {VIEWS.map((view) => (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => setFocus({ type: "view", view: view.id, n: Date.now() })}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  {view.id === "india" && <Globe className="w-3 h-3" />}
                  {view.id === "chennai" ? (
                    <>
                      <span className="sm:hidden">{t.viewChennaiShort}</span>
                      <span className="hidden sm:inline">{t.viewChennai}</span>
                    </>
                  ) : (
                    t[view.label]
                  )}
                </button>
              ))}
            </div>

            {/* Basemap switcher */}
            <div className="absolute top-3 right-3 z-[1000] flex flex-col sm:flex-row gap-1 rounded-md border border-border bg-card/90 p-1 backdrop-blur-sm">
              {BASEMAP_OPTIONS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  title={t[label]}
                  aria-label={fmt(t.basemapAria, { label: t[label] })}
                  aria-pressed={basemap === id}
                  onClick={() => setBasemap(id)}
                  className={`rounded p-1.5 ${
                    basemap === id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>

            {/* Legend */}
            {activeLayer && (
              <div className="absolute bottom-3 left-3 z-[1000] max-w-[220px] rounded-md border border-border bg-card/90 p-3 backdrop-blur-sm">
                {/* Collapsible on phones so it doesn't cover the map; always expanded from sm up. */}
                <button
                  type="button"
                  onClick={() => setLegendOpen((o) => !o)}
                  className="flex w-full items-center justify-between gap-2 text-left sm:pointer-events-none"
                  aria-expanded={legendOpen}
                >
                  <span className="text-xs font-medium text-foreground">{activeLayer.label}</span>
                  <ChevronUp
                    className={`w-3.5 h-3.5 text-muted-foreground transition-transform sm:hidden ${legendOpen ? "" : "rotate-180"}`}
                  />
                </button>
                <div className={`${legendOpen ? "block" : "hidden"} sm:block`}>
                  <p className="text-[10px] text-muted-foreground mb-2">{fmt(t.unit, { unit: activeLayer.unit })}</p>
                  <ul className="space-y-1">
                    {activeLayer.bins.map((bin) => (
                      <li key={bin.from} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: bin.color }} />
                        {bin.label}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 pt-2 border-t border-border text-[10px] text-muted-foreground">
                    {t.coverage}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Side panel */}
          <div className="rounded-lg border border-border bg-secondary/20 p-4 lg:h-[560px] lg:overflow-y-auto">
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList className="w-full">
                <TabsTrigger value="rankings" className="flex-1">
                  {t.rankings}
                </TabsTrigger>
                <TabsTrigger value="details" className="flex-1">
                  {t.details}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="rankings" className="mt-4 space-y-4">
                {activeLayer && summary ? (
                  <>
                    <p className="text-xs text-muted-foreground leading-relaxed">{activeLayer.description}</p>
                    <div className="grid grid-cols-3 gap-2">
                      <SummaryStat label={t.stateAvg} value={formatValue(summary.average)} unit={activeLayer.unit} />
                      <SummaryStat label={t.lowest} value={formatValue(summary.min)} unit={activeLayer.unit} />
                      <SummaryStat label={t.highest} value={formatValue(summary.max)} unit={activeLayer.unit} />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex gap-1 rounded-md bg-secondary/60 p-0.5">
                        {SCOPES.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setScope(s.id)}
                            className={`rounded px-2 py-1 text-[11px] ${
                              scope === s.id ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {t[s.label]}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setWorstFirst((w) => !w)}
                        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        <ArrowUpDown className="w-3 h-3" />
                        {worstFirst ? t.worstFirst : t.bestFirst}
                      </button>
                    </div>

                    <ol className="space-y-1">
                      {ranked.map((region, i) => {
                        const value = region.metrics[activeLayer.id]
                        const bin = getBin(activeLayer, value)
                        const pct = summary.max > 0 ? (value / summary.max) * 100 : 0
                        return (
                          <li key={region.id}>
                            <button
                              type="button"
                              onClick={() => selectRegion(region.id, true)}
                              className={`w-full rounded-md px-2 py-1.5 text-left transition-colors hover:bg-secondary/70 ${
                                region.id === selectedId ? "bg-secondary/70" : ""
                              }`}
                            >
                              <div className="flex items-center gap-2 text-sm">
                                <span className="w-5 text-[11px] text-muted-foreground font-mono">{i + 1}</span>
                                <span className="flex-1 truncate text-foreground">{region.name}</span>
                                <span className="font-mono text-xs text-foreground">{formatValue(value)}</span>
                              </div>
                              <div className="ml-7 mt-1 h-1 rounded-full bg-secondary">
                                <div className="h-1 rounded-full" style={{ width: `${pct}%`, backgroundColor: bin.color }} />
                              </div>
                            </button>
                          </li>
                        )
                      })}
                    </ol>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">{t.loadingRankings}</p>
                )}
              </TabsContent>

              <TabsContent value="details" className="mt-4">
                {selectedRegion ? (
                  <RegionDetails
                    region={selectedRegion}
                    layers={layers}
                    activeLayer={activeLayerId}
                    onLayerChange={setActiveLayerId}
                    onClose={() => {
                      setSelectedId(null)
                      setTab("rankings")
                    }}
                  />
                ) : (
                  <div className="py-10 text-center">
                    <MapIcon className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-foreground">{t.noRegion}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t.noRegionHint}</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {load.status === "ready" && (
          <p className="mt-3 text-[11px] text-muted-foreground">
            {t.disclaimer} {fmt(t.lastUpdated, { date: load.meta.updated })}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// Shown in the layer bar while the API response is in flight.
const PLACEHOLDER_LAYERS: Pick<LayerDefinition, "id" | "icon" | "shortLabel">[] = [
  { id: "wqi", icon: "droplets", shortLabel: "Water Quality" },
  { id: "rainfall", icon: "cloud-rain", shortLabel: "Rainfall" },
  { id: "scarcity", icon: "sun", shortLabel: "Scarcity" },
  { id: "groundwater", icon: "arrow-down", shortLabel: "Groundwater" },
  { id: "tds", icon: "flask", shortLabel: "TDS" },
  { id: "floodRisk", icon: "waves", shortLabel: "Flood Risk" },
]

function SummaryStat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground font-mono">{value}</p>
      <p className="text-[10px] text-muted-foreground">{unit}</p>
    </div>
  )
}

function MapPlaceholder({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-card text-sm text-muted-foreground">
      <Globe className="w-8 h-8 animate-pulse" />
      <p>{label}</p>
      {children}
    </div>
  )
}
