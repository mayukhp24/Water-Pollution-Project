"use client"

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { MapPin, Users, Droplet, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getBin } from "@/lib/map/layers"
import type { LayerDefinition, LayerId, Region } from "@/lib/map/types"
import { CommunityReadings } from "./community-readings"
import { formatPopulation, formatValue } from "./format"

const KIND_LABEL: Record<Region["kind"], string> = {
  "metro-locality": "Chennai metro locality",
  city: "City",
  town: "Town",
}

interface RegionDetailsProps {
  region: Region
  layers: LayerDefinition[]
  activeLayer: LayerId
  onLayerChange: (id: LayerId) => void
  onClose: () => void
}

export function RegionDetails({ region, layers, activeLayer, onLayerChange, onClose }: RegionDetailsProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-lg font-semibold text-foreground">{region.name}</h4>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3" />
            {region.district}, {region.state} · {KIND_LABEL[region.kind]}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 -mr-1" onClick={onClose} aria-label="Close details">
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
        <p className="text-xs font-medium text-foreground mb-2">Monthly rainfall (mm)</p>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={region.monthlyRainfall} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
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
                formatter={(v) => [`${v} mm`, "Rainfall"]}
              />
              <Bar dataKey="mm" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <dl className="space-y-2.5 text-sm">
        <DetailRow icon={Users} label="Population (est.)" value={formatPopulation(region.population)} />
        <DetailRow icon={Droplet} label="Primary source" value={region.primarySource} />
        <DetailRow icon={Droplet} label="Average pH" value={region.ph.toFixed(1)} />
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
