"use client"

import { cn } from "@/lib/utils"
import { CheckCircle2, XCircle, AlertTriangle, Droplets } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface ResultDisplayProps {
  result: "safe" | "unsafe" | "warning" | null
  confidence?: number
  issues?: string[]
}

export function ResultDisplay({ result, confidence = 0, issues = [] }: ResultDisplayProps) {
  if (result === null) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-8 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
            <Droplets className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Enter Water Parameters
          </h3>
          <p className="text-muted-foreground text-sm max-w-sm">
            Input your water quality measurements to analyze if the water is safe for consumption.
          </p>
        </CardContent>
      </Card>
    )
  }

  const configs = {
    safe: {
      icon: CheckCircle2,
      title: "Safe to Drink",
      description: "All parameters are within acceptable ranges for drinking water.",
      bgClass: "bg-success/10",
      borderClass: "border-success/30",
      iconClass: "text-success",
      badgeClass: "bg-success text-success-foreground",
    },
    warning: {
      icon: AlertTriangle,
      title: "Caution Advised",
      description: "Some parameters are borderline. Additional treatment may be recommended.",
      bgClass: "bg-warning/10",
      borderClass: "border-warning/30",
      iconClass: "text-warning",
      badgeClass: "bg-warning text-warning-foreground",
    },
    unsafe: {
      icon: XCircle,
      title: "Not Safe to Drink",
      description: "One or more parameters exceed safe drinking water standards.",
      bgClass: "bg-destructive/10",
      borderClass: "border-destructive/30",
      iconClass: "text-destructive",
      badgeClass: "bg-destructive text-destructive-foreground",
    },
  }

  const config = configs[result]
  const Icon = config.icon

  return (
    <Card className={cn("border-2", config.borderClass, config.bgClass)}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className={cn("w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0", config.bgClass)}>
            <Icon className={cn("w-6 h-6", config.iconClass)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-semibold text-foreground">
                {config.title}
              </h3>
              <span className={cn("px-2 py-0.5 rounded text-xs font-medium", config.badgeClass)}>
                {confidence}% Confidence
              </span>
            </div>
            <p className="text-muted-foreground text-sm mb-4">
              {config.description}
            </p>
            {issues.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Issues Detected:</p>
                <ul className="space-y-1">
                  {issues.map((issue, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive flex-shrink-0" />
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
