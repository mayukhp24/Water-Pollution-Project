"use client"

import { useMemo, useState } from "react"
import { Check, Loader2, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  ATTRIBUTE_GROUPS,
  OBSERVATION_ATTRIBUTES,
  SOURCE_TYPES,
  type ObservationAttribute,
  type SourceTypeId,
} from "@/lib/observations/attributes"

const BASIC_SET = ["waterTemp", "ph", "tds", "turbidity"]

function todayLocal(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

interface AddReadingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  regionId: string
  regionName: string
  onSaved: () => void
}

export function AddReadingDialog({ open, onOpenChange, regionId, regionName, onSaved }: AddReadingDialogProps) {
  const [selected, setSelected] = useState<string[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [observedOn, setObservedOn] = useState(todayLocal)
  const [sourceType, setSourceType] = useState<SourceTypeId>("tap")
  const [contributor, setContributor] = useState("")
  const [notes, setNotes] = useState("")
  const [website, setWebsite] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  // Keep inputs in catalog order regardless of the order attributes were picked.
  const selectedAttributes = useMemo(
    () => OBSERVATION_ATTRIBUTES.filter((a) => selected.includes(a.id)),
    [selected],
  )

  const fieldErrors = useMemo(() => {
    const errors: Record<string, string> = {}
    for (const attr of selectedAttributes) {
      const raw = values[attr.id]?.trim() ?? ""
      if (raw === "") errors[attr.id] = "Enter a value or remove this field"
      else {
        const n = Number(raw)
        if (!Number.isFinite(n)) errors[attr.id] = "Must be a number"
        else if (n < attr.min || n > attr.max) errors[attr.id] = `Must be ${attr.min}–${attr.max}`
      }
    }
    return errors
  }, [selectedAttributes, values])

  const canSubmit = selectedAttributes.length > 0 && Object.keys(fieldErrors).length === 0 && !submitting

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const reset = () => {
    setSelected([])
    setValues({})
    setObservedOn(todayLocal())
    setSourceType("tap")
    setNotes("")
    setServerError(null)
    // Contributor name is kept so repeat submitters don't retype it.
  }

  const submit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setServerError(null)
    try {
      const readings = Object.fromEntries(selectedAttributes.map((a) => [a.id, Number(values[a.id])]))
      const res = await fetch("/api/observations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regionId, observedOn, sourceType, readings, contributor, notes, website }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not save the reading.")
      reset()
      onSaved()
      onOpenChange(false)
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Could not save the reading.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a reading for {regionName}</DialogTitle>
          <DialogDescription>
            Pick only the things you measured. One value is enough; you don&apos;t need to fill everything.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="observed-on">Date measured</Label>
            <Input
              id="observed-on"
              type="date"
              value={observedOn}
              max={todayLocal()}
              min="2000-01-01"
              onChange={(e) => setObservedOn(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Water source</Label>
            <Select value={sourceType} onValueChange={(v) => setSourceType(v as SourceTypeId)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_TYPES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Attribute picker */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label>What did you measure?</Label>
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelected(BASIC_SET)}>
                Basic set
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setSelected(OBSERVATION_ATTRIBUTES.map((a) => a.id))}
              >
                Select all
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelected([])}>
                Clear
              </Button>
            </div>
          </div>
          {ATTRIBUTE_GROUPS.map((group) => (
            <div key={group}>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">{group}</p>
              <div className="flex flex-wrap gap-1.5">
                {OBSERVATION_ATTRIBUTES.filter((a) => a.group === group).map((attr) => {
                  const on = selected.includes(attr.id)
                  return (
                    <button
                      key={attr.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(attr.id)}
                      className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                        on
                          ? "border-primary bg-primary/15 text-foreground"
                          : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                      }`}
                    >
                      {on ? <Check className="w-3 h-3 text-primary" /> : <Plus className="w-3 h-3" />}
                      {attr.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Values for the chosen attributes */}
        {selectedAttributes.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 rounded-lg border border-border bg-secondary/20 p-3">
            {selectedAttributes.map((attr) => (
              <ValueField
                key={attr.id}
                attribute={attr}
                value={values[attr.id] ?? ""}
                error={values[attr.id] !== undefined ? fieldErrors[attr.id] : undefined}
                onChange={(v) => setValues((prev) => ({ ...prev, [attr.id]: v }))}
                onRemove={() => toggle(attr.id)}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            Tap one or more measurements above to add them.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="contributor">Your name (optional)</Label>
            <Input
              id="contributor"
              maxLength={60}
              value={contributor}
              onChange={(e) => setContributor(e.target.value)}
              placeholder="Shown with your reading"
            />
          </div>
          <div className="space-y-1.5 sm:row-span-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              maxLength={500}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. tested with a TDS meter at home tap"
            />
          </div>
        </div>

        {/* Honeypot: visually hidden, ignored by people, filled by bots. */}
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />

        {serverError && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">{serverError}</p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={!canSubmit}>
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Save reading{selectedAttributes.length > 1 ? ` (${selectedAttributes.length} values)` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ValueField({
  attribute,
  value,
  error,
  onChange,
  onRemove,
}: {
  attribute: ObservationAttribute
  value: string
  error?: string
  onChange: (value: string) => void
  onRemove: () => void
}) {
  const id = `reading-${attribute.id}`
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-xs">
          {attribute.label}
        </Label>
        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground hover:text-foreground"
          aria-label={`Remove ${attribute.label}`}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          step={attribute.step}
          min={attribute.min}
          max={attribute.max}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          className={attribute.unit ? "pr-20" : undefined}
        />
        {attribute.unit && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {attribute.unit}
          </span>
        )}
      </div>
      <p className={`text-[11px] ${error ? "text-destructive" : "text-muted-foreground"}`}>
        {error ?? attribute.hint ?? `Range ${attribute.min}–${attribute.max}`}
      </p>
    </div>
  )
}
