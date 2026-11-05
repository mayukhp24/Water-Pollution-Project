"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CheckCircle2,
  Factory,
  Home,
  Lightbulb,
  Loader2,
  RotateCcw,
  Sparkles,
  ListChecks,
  Wrench,
  XCircle,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { buildRuleBasedFeed } from "@/lib/reuse/rules"
import type { AnalyzedReading, ReuseFeed, ReuseRecommendation, Verdict } from "@/lib/reuse/types"
import { useI18n } from "@/lib/i18n/provider"

const VERDICT_STYLE: Record<Verdict, { icon: React.ElementType; badge: string; icon_: string }> = {
  suitable: {
    icon: CheckCircle2,
    badge: "bg-success/15 text-success border-success/30",
    icon_: "text-success",
  },
  with_treatment: {
    icon: Wrench,
    badge: "bg-warning/15 text-warning border-warning/30",
    icon_: "text-warning",
  },
  not_suitable: {
    icon: XCircle,
    badge: "bg-destructive/15 text-destructive border-destructive/30",
    icon_: "text-destructive",
  },
}

type AiState =
  | { status: "loading" }
  | { status: "ready"; feed: ReuseFeed }
  | { status: "error"; message: string }

interface ReuseRecommendationsProps {
  readings: AnalyzedReading[]
  drinkingResult: "safe" | "warning" | "unsafe"
}

export function ReuseRecommendations({ readings, drinkingResult }: ReuseRecommendationsProps) {
  const { m, lang } = useI18n()
  const t = m.reuse
  const rulesFeed = useMemo(() => buildRuleBasedFeed(readings, drinkingResult), [readings, drinkingResult])
  const [ai, setAi] = useState<AiState>({ status: "loading" })
  const [view, setView] = useState<"ai" | "rules">("ai")
  const [attempt, setAttempt] = useState(0)

  // Re-asks the AI when the language changes so the feed follows the UI language.
  useEffect(() => {
    const controller = new AbortController()
    setAi({ status: "loading" })
    fetch("/api/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ readings, drinkingResult, language: lang }),
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || "AI recommendations are unavailable right now.")
        setAi({ status: "ready", feed: data.feed })
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setAi({ status: "error", message: error instanceof Error ? error.message : "AI recommendations failed." })
      })
    return () => controller.abort()
  }, [readings, drinkingResult, attempt, lang])

  const feed = view === "ai" && ai.status === "ready" ? ai.feed : rulesFeed
  const all = [...feed.domestic, ...feed.industry]
  const counts = {
    suitable: all.filter((r) => r.verdict === "suitable").length,
    with_treatment: all.filter((r) => r.verdict === "with_treatment").length,
    not_suitable: all.filter((r) => r.verdict === "not_suitable").length,
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{t.title}</CardTitle>
              <CardDescription>{t.description}</CardDescription>
            </div>
          </div>

          <div className="flex rounded-md bg-secondary/60 p-0.5" role="tablist" aria-label={t.sourceAria}>
            <button
              type="button"
              role="tab"
              aria-selected={view === "ai"}
              onClick={() => setView("ai")}
              className={cn(
                "flex items-center gap-1.5 rounded px-3 py-1.5 text-xs",
                view === "ai" ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {ai.status === "loading" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-primary" />
              )}
              {t.ai}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "rules"}
              onClick={() => setView("rules")}
              className={cn(
                "flex items-center gap-1.5 rounded px-3 py-1.5 text-xs",
                view === "rules" ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <ListChecks className="w-3.5 h-3.5" />
              {t.rules}
            </button>
          </div>
        </div>

        {view === "ai" && ai.status === "loading" && (
          <p className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 p-2.5 text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            {t.aiLoading}
          </p>
        )}
        {view === "ai" && ai.status === "error" && (
          <div className="flex items-center justify-between gap-2 rounded-md border border-warning/30 bg-warning/10 p-2.5">
            <p className="text-xs text-warning">
              {ai.message} {t.aiErrorSuffix}
            </p>
            <Button size="sm" variant="ghost" className="h-7 shrink-0" onClick={() => setAttempt((n) => n + 1)}>
              <RotateCcw className="w-3.5 h-3.5" />
              {m.common.retry}
            </Button>
          </div>
        )}
        {feed.source === "rules" && lang !== "en" && (
          <p className="text-[11px] text-muted-foreground">{t.rulesEnglishNote}</p>
        )}

        <div className="rounded-lg border border-border bg-secondary/30 p-4">
          <div className="flex items-center gap-2 mb-1">
            {feed.source === "ai" ? (
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            ) : (
              <ListChecks className="w-3.5 h-3.5 text-primary" />
            )}
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {feed.source === "ai" ? t.aiSummary : t.rulesSummary}
            </span>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{feed.summary}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(Object.keys(counts) as Verdict[]).map((v) => (
              <span key={v} className={cn("rounded-full border px-2.5 py-0.5 text-[11px]", VERDICT_STYLE[v].badge)}>
                {counts[v]} · {t[v]}
              </span>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <SectorColumn title={t.domestic} icon={Home} items={feed.domestic} />
          <SectorColumn title={t.industry} icon={Factory} items={feed.industry} />
        </div>

        {feed.tips.length > 0 && (
          <div className="rounded-lg border border-border p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
              <Lightbulb className="w-4 h-4 text-warning" />
              {t.tips}
            </p>
            <ul className="space-y-1.5">
              {feed.tips.map((tip, i) => (
                <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                  <span className="mt-2 h-1 w-1 rounded-full bg-muted-foreground shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground">
          {feed.source === "ai" ? t.aiDisclaimer : t.rulesDisclaimer}
        </p>
      </CardContent>
    </Card>
  )
}

function SectorColumn({
  title,
  icon: Icon,
  items,
}: {
  title: string
  icon: React.ElementType
  items: ReuseRecommendation[]
}) {
  const { m } = useI18n()
  return (
    <div>
      <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
        <Icon className="w-4 h-4 text-primary" />
        {title}
      </h4>
      <ul className="space-y-2">
        {items.map((item, i) => {
          const style = VERDICT_STYLE[item.verdict]
          const VerdictIcon = style.icon
          return (
            <li key={`${item.use}-${i}`} className="rounded-lg border border-border bg-secondary/20 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <VerdictIcon className={cn("w-4 h-4 shrink-0", style.icon_)} />
                  {capitalize(item.use)}
                </p>
                <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px]", style.badge)}>
                  {m.reuse[item.verdict]}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{item.reason}</p>
              {item.treatment && (
                <p className="mt-1.5 flex items-start gap-1.5 text-xs text-foreground">
                  <Wrench className="w-3 h-3 mt-0.5 shrink-0 text-warning" />
                  {capitalize(item.treatment)}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
