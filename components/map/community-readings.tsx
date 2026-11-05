"use client"

import { useCallback, useEffect, useState } from "react"
import { CheckCircle2, Database, Loader2, Plus, RotateCcw, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  ATTRIBUTES_BY_ID,
  OBSERVATION_ATTRIBUTES,
  type ObservationsResponse,
  type SourceTypeId,
} from "@/lib/observations/attributes"
import { useI18n } from "@/lib/i18n/provider"
import type { Messages } from "@/lib/i18n/messages/en"
import { AddReadingDialog } from "./add-reading-dialog"
import { formatValue } from "./format"

const COLLAPSED_COUNT = 3

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: ObservationsResponse }

export function CommunityReadings({ regionId, regionName }: { regionId: string; regionName: string }) {
  const { m, fmt, lang } = useI18n()
  const t = m.readings
  const attrLabel = (id: string) => m.attributes[id as keyof Messages["attributes"]] ?? ATTRIBUTES_BY_ID.get(id)?.label ?? id
  const sourceLabel = (id: string) => m.sources[id as SourceTypeId] ?? id
  const [state, setState] = useState<State>({ status: "loading" })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setState((s) => (s.status === "ready" ? s : { status: "loading" }))
      try {
        const res = await fetch(`/api/observations?regionId=${encodeURIComponent(regionId)}`, { signal })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Could not load readings.")
        setState({ status: "ready", data })
      } catch (error) {
        if (signal?.aborted) return
        setState({ status: "error", message: error instanceof Error ? error.message : "Could not load readings." })
      }
    },
    [regionId],
  )

  useEffect(() => {
    const controller = new AbortController()
    setState({ status: "loading" })
    setShowAll(false)
    setJustSaved(false)
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  const data = state.status === "ready" ? state.data : null
  const averages = data
    ? OBSERVATION_ATTRIBUTES.filter((a) => data.summary.averages[a.id]).map((a) => ({
        attr: a,
        ...data.summary.averages[a.id],
      }))
    : []
  const visible = data ? (showAll ? data.observations : data.observations.slice(0, COLLAPSED_COUNT)) : []

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">{t.title}</p>
          <p className="text-[11px] text-muted-foreground">
            {data ? fmt(t.count, { count: data.summary.count, name: regionName }) : t.subtitle}
          </p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)} disabled={!data || data.storage === null}>
          <Plus className="w-4 h-4" />
          {t.add}
        </Button>
      </div>

      {justSaved && (
        <p className="flex items-center gap-1.5 rounded-md bg-success/10 border border-success/30 p-2 text-xs text-success">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {t.saved}
        </p>
      )}

      {state.status === "loading" && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {t.loading}
        </p>
      )}

      {state.status === "error" && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2">
          <p className="text-xs text-destructive">{state.message}</p>
          <Button size="sm" variant="ghost" className="h-7" onClick={() => load()}>
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {data?.storage === null && (
        <p className="flex items-start gap-2 rounded-md bg-secondary/40 p-3 text-xs text-muted-foreground">
          <Database className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {t.notEnabled}
        </p>
      )}

      {data?.storage === "memory" && <p className="text-[11px] text-warning">{t.memoryNote}</p>}

      {data && data.storage !== null && data.summary.count === 0 && (
        <p className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
          {fmt(t.empty, { name: regionName })}
        </p>
      )}

      {averages.length > 0 && (
        <div>
          <p className="text-[11px] text-muted-foreground mb-1.5">{t.averages}</p>
          <div className="flex flex-wrap gap-1.5">
            {averages.map(({ attr, avg, n }) => (
              <span key={attr.id} className="rounded-md bg-primary/10 px-2 py-1 text-[11px] text-foreground">
                {attrLabel(attr.id)}:{" "}
                <span className="font-mono">
                  {formatValue(avg)}
                  {attr.unit && ` ${attr.unit}`}
                </span>
                <span className="text-muted-foreground"> · {n}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {visible.length > 0 && (
        <ul className="space-y-2">
          {visible.map((obs) => (
            <li key={obs.id} className="rounded-md border border-border bg-card p-2.5">
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                <span>
                  {new Date(`${obs.observedOn}T00:00:00`).toLocaleDateString(`${lang}-IN`, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}{" "}
                  · {sourceLabel(obs.sourceType)}
                </span>
                <span className="flex items-center gap-1">
                  <UserRound className="w-3 h-3" />
                  {obs.contributor || t.anonymous}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                {Object.entries(obs.readings).map(([key, value]) => {
                  const attr = ATTRIBUTES_BY_ID.get(key)
                  return (
                    <span key={key} className="text-xs text-foreground">
                      <span className="text-muted-foreground">{attrLabel(key)}</span>{" "}
                      <span className="font-mono">
                        {formatValue(value)}
                        {attr?.unit && ` ${attr.unit}`}
                      </span>
                    </span>
                  )
                })}
              </div>
              {obs.notes && <p className="mt-1.5 text-[11px] text-muted-foreground italic">{obs.notes}</p>}
            </li>
          ))}
        </ul>
      )}

      {data && data.observations.length > COLLAPSED_COUNT && (
        <button
          type="button"
          onClick={() => setShowAll((s) => !s)}
          className="text-xs text-primary hover:underline"
        >
          {showAll ? t.showFewer : fmt(t.showAll, { count: data.observations.length })}
        </button>
      )}

      <AddReadingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        regionId={regionId}
        regionName={regionName}
        onSaved={() => {
          setJustSaved(true)
          load()
        }}
      />
    </div>
  )
}
