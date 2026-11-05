"use client"

import { useEffect, useRef, useState } from "react"
import { flushSync } from "react-dom"
import { useTheme } from "next-themes"
import { Languages, Moon, Sun } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { LANGUAGES, type LanguageCode } from "@/lib/i18n/languages"
import { useI18n } from "@/lib/i18n/provider"

export function HeaderControls() {
  const { m, lang, setLang } = useI18n()
  const { resolvedTheme, setTheme } = useTheme()
  // The theme is only known on the client; render a neutral icon until mounted to avoid a hydration mismatch.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const transitionRef = useRef<ViewTransition | null>(null)
  const requestedRef = useRef<"light" | "dark" | null>(null)
  const generationRef = useRef(0)

  const isDark = mounted ? resolvedTheme === "dark" : true
  const current = LANGUAGES.find((l) => l.code === lang)

  // Cross-fade the whole page between themes using the View Transitions API: the browser snapshots
  // the old look, we swap the theme synchronously inside the callback, and it fades to the new one.
  // Unsupported browsers and reduced-motion users get an instant switch.
  const toggleTheme = () => {
    // Flip from the last *requested* theme, so a quick second click isn't based on a theme that
    // hasn't been applied yet.
    const from = requestedRef.current ?? (isDark ? "dark" : "light")
    const next = from === "dark" ? "light" : "dark"
    requestedRef.current = next
    // A skipped transition still runs its update later; the generation check stops a stale one
    // from overwriting a newer choice.
    const generation = ++generationRef.current
    let applied = false
    const apply = () => {
      if (applied) return
      applied = true
      if (generation !== generationRef.current) return
      const root = document.documentElement
      root.classList.remove("light", "dark")
      root.classList.add(next)
      root.style.colorScheme = next
      flushSync(() => setTheme(next))
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    // A click during a running fade cancels it and switches instantly, so rapid clicks never get stuck.
    if (!document.startViewTransition || reduceMotion || transitionRef.current) {
      transitionRef.current?.skipTransition()
      transitionRef.current = null
      apply()
      requestedRef.current = null
      return
    }
    const transition = document.startViewTransition(apply)
    transitionRef.current = transition
    // The browser runs `apply` only once it can render a frame; in a background tab or on a very
    // busy device that may not happen promptly. Skipping runs `apply` immediately without the fade.
    window.setTimeout(() => {
      if (!applied) transition.skipTransition()
    }, 500)
    transition.finished.finally(() => {
      if (transitionRef.current === transition) {
        transitionRef.current = null
        requestedRef.current = null
      }
    })
  }

  return (
    <div className="flex items-center gap-1.5">
      <Select value={lang} onValueChange={(v) => setLang(v as LanguageCode)}>
        <SelectTrigger size="sm" className="h-9 gap-1.5 border-border bg-transparent px-2.5" aria-label={m.common.language}>
          <Languages className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">{current?.label}</span>
        </SelectTrigger>
        <SelectContent align="end">
          {LANGUAGES.map((l) => (
            <SelectItem key={l.code} value={l.code}>
              <span>{l.label}</span>
              {l.code !== "en" && <span className="text-xs text-muted-foreground">{l.english}</span>}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <button
        type="button"
        onClick={toggleTheme}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        aria-label={isDark ? m.common.lightMode : m.common.darkMode}
        title={isDark ? m.common.lightMode : m.common.darkMode}
      >
        {/* Keyed so the new icon spins and fades in on each switch. */}
        <span key={isDark ? "sun" : "moon"} className="animate-in fade-in spin-in-90 duration-500">
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </span>
      </button>
    </div>
  )
}
