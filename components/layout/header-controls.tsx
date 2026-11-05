"use client"

import { useEffect, useState } from "react"
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

  const isDark = mounted ? resolvedTheme === "dark" : true
  const current = LANGUAGES.find((l) => l.code === lang)

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
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        aria-label={isDark ? m.common.lightMode : m.common.darkMode}
        title={isDark ? m.common.lightMode : m.common.darkMode}
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
    </div>
  )
}
