"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { CheckCircle2, XCircle, AlertTriangle, Minus } from "lucide-react"

interface Parameter {
  name: string
  value: number | null
  unit: string
  safeMin: number
  safeMax: number
  status: "safe" | "warning" | "danger" | "neutral"
}

interface StandardsTableProps {
  parameters: Parameter[]
}

export function StandardsTable({ parameters }: StandardsTableProps) {
  const getStatusConfig = (status: Parameter["status"]) => {
    switch (status) {
      case "safe":
        return {
          icon: CheckCircle2,
          iconClass: "text-success",
          rowClass: "bg-success/5",
          label: "Safe",
        }
      case "warning":
        return {
          icon: AlertTriangle,
          iconClass: "text-warning",
          rowClass: "bg-warning/5",
          label: "Warning",
        }
      case "danger":
        return {
          icon: XCircle,
          iconClass: "text-destructive",
          rowClass: "bg-destructive/5",
          label: "Unsafe",
        }
      default:
        return {
          icon: Minus,
          iconClass: "text-muted-foreground",
          rowClass: "",
          label: "---",
        }
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Parameter Analysis</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">
                  Parameter
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">
                  Your Value
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">
                  Safe Range
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {parameters.map((param, index) => {
                const config = getStatusConfig(param.status)
                const Icon = config.icon
                return (
                  <tr
                    key={param.name}
                    className={cn(
                      "border-b border-border last:border-0 transition-colors",
                      config.rowClass,
                      index % 2 === 0 ? "bg-secondary/30" : ""
                    )}
                  >
                    <td className="px-6 py-3 text-sm font-medium text-foreground">
                      {param.name}
                    </td>
                    <td className="px-6 py-3 text-sm text-foreground">
                      {param.value !== null ? (
                        <span className="font-mono">
                          {param.value} {param.unit}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">---</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">
                      <span className="font-mono">
                        {param.safeMin} - {param.safeMax} {param.unit}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <Icon className={cn("w-4 h-4", config.iconClass)} />
                        <span className={cn("text-sm", config.iconClass)}>
                          {config.label}
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
