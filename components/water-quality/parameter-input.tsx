"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { Info } from "lucide-react"
import { useI18n } from "@/lib/i18n/provider"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface ParameterInputProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  unit: string
  min: number
  max: number
  safeMin: number
  safeMax: number
  description: string
  currentStatus?: "safe" | "warning" | "danger" | "neutral"
}

export function ParameterInput({
  id,
  label,
  value,
  onChange,
  unit,
  min,
  max,
  safeMin,
  safeMax,
  description,
  currentStatus = "neutral",
}: ParameterInputProps) {
  const { m, fmt } = useI18n()
  const statusColors = {
    safe: "border-success/50 focus-within:border-success",
    warning: "border-warning/50 focus-within:border-warning",
    danger: "border-destructive/50 focus-within:border-destructive",
    neutral: "border-border focus-within:border-primary",
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                <Info className="h-4 w-4" />
                <span className="sr-only">{fmt(m.analyzer.infoAbout, { label })}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-sm">{description}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {fmt(m.analyzer.safeRange, { min: safeMin, max: safeMax, unit })}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div
        className={cn(
          "relative flex items-center rounded-md border bg-input transition-colors",
          statusColors[currentStatus]
        )}
      >
        <Input
          id={id}
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          step="any"
          className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 pr-16"
          placeholder={`${safeMin} - ${safeMax}`}
        />
        <span className="absolute right-3 text-sm text-muted-foreground">
          {unit}
        </span>
      </div>
    </div>
  )
}
