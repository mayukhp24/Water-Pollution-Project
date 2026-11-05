"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useRef, useState } from "react"
import { HelpCircle } from "lucide-react"
import {
  Tooltip as UiTooltip,
  TooltipContent as UiTooltipContent,
  TooltipProvider as UiTooltipProvider,
  TooltipTrigger as UiTooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/provider"

interface QualityData {
  safeCount: number
  warningCount: number
  dangerCount: number
  neutralCount: number
  totalParameters: number
}

interface QualityDonutChartProps {
  data: QualityData
  result: "safe" | "unsafe" | "warning" | null
}

const COLORS = {
  safe: "hsl(145, 63%, 49%)",
  warning: "hsl(45, 93%, 47%)",
  danger: "hsl(0, 84%, 60%)",
  neutral: "hsl(215, 14%, 34%)",
}

export function QualityDonutChart({ data, result }: QualityDonutChartProps) {
  const { m, fmt } = useI18n()
  const s = m.score
  const chartData = [
    { name: s.safe, value: data.safeCount, color: COLORS.safe },
    { name: s.warning, value: data.warningCount, color: COLORS.warning },
    { name: s.danger, value: data.dangerCount, color: COLORS.danger },
    { name: s.notTested, value: data.neutralCount, color: COLORS.neutral },
  ].filter(item => item.value > 0)

  const percentage = data.totalParameters > 0 
    ? Math.round(((data.safeCount) / (data.totalParameters - data.neutralCount)) * 100) || 0
    : 0

  const getResultLabel = () => {
    if (result === null) return { text: s.pending, color: "text-muted-foreground" }
    if (result === "safe") return { text: s.safe, color: "text-success" }
    if (result === "warning") return { text: s.caution, color: "text-warning" }
    return { text: s.unsafe, color: "text-destructive" }
  }

  const resultLabel = getResultLabel()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-foreground">{payload[0].name}</p>
          <p className="text-sm text-muted-foreground">
            {fmt(s.parameterCount, { count: payload[0].value })}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{s.title}</CardTitle>
        <CardDescription>{s.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="45%"
                innerRadius={70}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="bottom"
                height={36}
                formatter={(value) => (
                  <span className="text-sm text-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Center Label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ top: '-18px' }}>
            <span className={cn("relative text-3xl font-bold", resultLabel.color)}>
              {data.neutralCount === data.totalParameters ? "--" : `${percentage}%`}
              <PercentHelp label={s.percentHelpLabel} text={s.percentHelp} />
            </span>
            <span className={cn("text-sm font-medium", resultLabel.color)}>
              {resultLabel.text}
            </span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-border">
          <div className="text-center">
            <div className="text-lg font-semibold text-success">{data.safeCount}</div>
            <div className="text-xs text-muted-foreground">{s.safe}</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-warning">{data.warningCount}</div>
            <div className="text-xs text-muted-foreground">{s.warning}</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-destructive">{data.dangerCount}</div>
            <div className="text-xs text-muted-foreground">{s.danger}</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-muted-foreground">{data.neutralCount}</div>
            <div className="text-xs text-muted-foreground">{s.pending}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// "?" next to the centre percentage. Opens on hover/focus, and on tap for touch screens,
// which don't hover. The surrounding label is pointer-events-none, so this re-enables them.
function PercentHelp({ label, text }: { label: string; text: string }) {
  const [open, setOpen] = useState(false)
  // Radix closes the tooltip on pointerdown, before our click runs, so remember the state at
  // pointerdown and toggle from that — otherwise a second tap would just reopen it.
  const wasOpen = useRef(false)
  return (
    <UiTooltipProvider delayDuration={100}>
      <UiTooltip open={open} onOpenChange={setOpen}>
        <UiTooltipTrigger asChild>
          <button
            type="button"
            aria-label={label}
            onPointerDown={() => {
              wasOpen.current = open
            }}
            onClick={() => setOpen(!wasOpen.current)}
            className="pointer-events-auto absolute -top-1 -right-5 flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </UiTooltipTrigger>
        <UiTooltipContent side="top" className="max-w-[260px] text-xs font-normal leading-relaxed">
          {text}
        </UiTooltipContent>
      </UiTooltip>
    </UiTooltipProvider>
  )
}
