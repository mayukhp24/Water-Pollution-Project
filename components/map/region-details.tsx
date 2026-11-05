"use client"

import { useMemo } from "react"
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useI18n } from "@/lib/i18n/provider"
import { MapPin, Users, Droplet, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getBin } from "@/lib/map/layers"
import type { LayerDefinition, LayerId, Region } from "@/lib/map/types"
import { CommunityReadings } from "./community-readings"
import { formatPopulation, formatValue } from "./format"

const KIND_KEY = { "metro-locality": "kindMetro", city: "kindCity", town: "kindTown" } as const

interface RegionDetailsProps {
  region: Region
  layers: LayerDefinition[]
  activeLayer: LayerId
  onLayerChange: (id: LayerId) => void
  onClose: () => void
}

export function RegionDetails({ region, layers, activeLayer, onLayerChange, onClose }: RegionDetailsProps) {
  const { m, lang } = useI18n()
  const t = m.region
  // Month names come from Intl so every language gets its own without extra strings.
  const monthly = useMemo(() => {
    const monthFormat = new Intl.DateTimeFormat(`${lang}-IN`, { month: "short" })
    return region.monthlyRainfall.map((entry, i) => ({ ...entry, month: monthFormat.format(new Date(2024, i, 1)) }))
  }, [region, lang])

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-lg font-semibold text-foreground">{region.name}</h4>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3" />
            {region.district}, {region.state} · {t[KIND_KEY[region.kind]]}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 -mr-1" onClick={onClose} aria-label={t.close}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {layers.map((layer) => {
          const value = region.metrics[layer.id]
          const bin = getBin(layer, value)
          const active = layer.id === activeLayer
          return (
            <button
              key={layer.id}
              type="button"
              onClick={() => onLayerChange(layer.id)}
              className={`text-left rounded-md border p-2.5 transition-colors ${
                active ? "border-primary bg-primary/10" : "border-border bg-secondary/40 hover:bg-secondary/70"
              }`}
            >
              <p className="text-[11px] text-muted-foreground">{layer.shortLabel}</p>
              <p className="text-base font-semibold text-foreground font-mono">
                {formatValue(value)}
                <span className="text-xs font-normal text-muted-foreground ml-1">{layer.unit}</span>
              </p>
              <p className="text-[11px] flex items-center gap-1.5 text-muted-foreground">
                <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: bin.color }} />
                {bin.label}
              </p>
            </button>
          )
        })}
      </div>

      <div>
        <p className="text-xs font-medium text-foreground mb-2">{t.monthlyRainfall}</p>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
              <XAxis
                dataKey="month"
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval={1}
              />
              <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: "var(--secondary)" }}
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontSize: 12,
                }}
                labelStyle={{ color: "var(--foreground)" }}
                itemStyle={{ color: "var(--primary)" }}
                formatter={(v) => [`${v} mm`, t.rainfall]}
              />
              <Bar dataKey="mm" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <dl className="space-y-2.5 text-sm">
        <DetailRow icon={Users} label={t.population} value={formatPopulation(region.population)} />
        <DetailRow icon={Droplet} label={t.primarySource} value={region.primarySource} />
        <DetailRow icon={Droplet} label={t.avgPh} value={region.ph.toFixed(1)} />
      </dl>

      <p className="text-xs text-muted-foreground leading-relaxed rounded-md bg-secondary/40 p-3">{region.notes}</p>

      <CommunityReadings regionId={region.id} regionName={region.name} />
    </div>
  )
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="text-foreground text-right ml-auto">{value}</dd>
    </div>
  )
}
