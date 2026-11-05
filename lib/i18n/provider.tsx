"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import en, { type Messages } from "./messages/en"
import { DEFAULT_LANGUAGE, isLanguageCode, type LanguageCode } from "./languages"

// Non-English dictionaries are code-split and fetched only when selected.
const LOADERS: Record<Exclude<LanguageCode, "en">, () => Promise<{ default: Messages }>> = {
  hi: () => import("./messages/hi"),
  ta: () => import("./messages/ta"),
  te: () => import("./messages/te"),
  kn: () => import("./messages/kn"),
  ml: () => import("./messages/ml"),
  bn: () => import("./messages/bn"),
  mr: () => import("./messages/mr"),
  gu: () => import("./messages/gu"),
  pa: () => import("./messages/pa"),
}

const STORAGE_KEY = "aquacheck-language"

function fmt(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? String(vars[key]) : match))
}

interface I18nContextValue {
  lang: LanguageCode
  m: Messages
  setLang: (lang: LanguageCode) => void
  fmt: typeof fmt
}

const I18nContext = createContext<I18nContextValue>({ lang: DEFAULT_LANGUAGE, m: en, setLang: () => {}, fmt })

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LanguageCode>(DEFAULT_LANGUAGE)
  const [m, setMessages] = useState<Messages>(en)

  const apply = useCallback(async (next: LanguageCode) => {
    const messages = next === "en" ? en : (await LOADERS[next]()).default
    setMessages(messages)
    setLangState(next)
    document.documentElement.lang = next
  }, [])

  // Server render is English; switch after mount to the saved choice or the browser's language.
  useEffect(() => {
    let saved: string | null = null
    try {
      saved = localStorage.getItem(STORAGE_KEY)
    } catch {
      // storage unavailable (private mode) — fall through to detection
    }
    const detected = navigator.languages?.map((l) => l.split("-")[0]).find(isLanguageCode)
    const initial = isLanguageCode(saved) ? saved : detected
    if (initial && initial !== "en") apply(initial).catch(() => {})
  }, [apply])

  const setLang = useCallback(
    (next: LanguageCode) => {
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // ignore — the choice just won't persist
      }
      apply(next).catch(() => {})
    },
    [apply],
  )

  const value = useMemo(() => ({ lang, m, setLang, fmt }), [lang, m, setLang])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  return useContext(I18nContext)
}
