"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

export interface SwipePage {
  id: string
  label: string
  icon: React.ReactNode
  content: React.ReactNode
}

// Full-height horizontal pager. Pages sit side by side in a CSS scroll-snap container, so touch
// swipes and trackpad gestures follow the finger natively and snap to the nearest page; tab clicks
// glide there with smooth scrolling. The underline tracks scroll position frame by frame.
export function SwipeTabs({ pages, header }: { pages: SwipePage[]; header: React.ReactNode }) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLSpanElement>(null)
  const [active, setActive] = useState(0)
  const activeRef = useRef(0)

  const goTo = useCallback((index: number, smooth = true) => {
    const el = scrollerRef.current
    if (!el) return
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    el.scrollTo({ left: index * el.clientWidth, behavior: smooth && !reduceMotion ? "smooth" : "auto" })
  }, [])

  // Open the page named in the URL hash (e.g. /#map), and follow later hash links.
  useEffect(() => {
    const fromHash = (smooth: boolean) => {
      const index = pages.findIndex((p) => `#${p.id}` === window.location.hash)
      if (index >= 0) goTo(index, smooth)
    }
    fromHash(false)
    const onHashChange = () => fromHash(true)
    window.addEventListener("hashchange", onHashChange)
    return () => window.removeEventListener("hashchange", onHashChange)
  }, [pages, goTo])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    let frame = 0
    const update = () => {
      frame = 0
      const progress = el.scrollLeft / Math.max(el.clientWidth, 1)
      if (indicatorRef.current) indicatorRef.current.style.transform = `translateX(${progress * 100}%)`
      const index = Math.min(pages.length - 1, Math.max(0, Math.round(progress)))
      if (index !== activeRef.current) {
        activeRef.current = index
        setActive(index)
        history.replaceState(null, "", `#${pages[index].id}`)
      }
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    el.addEventListener("scroll", onScroll, { passive: true })
    // Keep the current page aligned when the window is resized or a phone rotates.
    const onResize = () => el.scrollTo({ left: activeRef.current * el.clientWidth, behavior: "auto" })
    window.addEventListener("resize", onResize)
    return () => {
      el.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onResize)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [pages])

  // ← / → switch pages, unless the user is typing or interacting with a control.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return
      if (e.altKey || e.ctrlKey || e.metaKey) return
      const target = e.target as HTMLElement | null
      if (target?.closest("input, textarea, select, [contenteditable], [role=slider], .leaflet-container, [role=dialog]")) return
      const next = activeRef.current + (e.key === "ArrowRight" ? 1 : -1)
      if (next >= 0 && next < pages.length) {
        e.preventDefault()
        goTo(next)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [pages.length, goTo])

  return (
    // `relative` on the root and on each page makes absolutely positioned descendants (e.g. sr-only labels)
    // clip inside their page instead of stretching the document and making the whole window scroll.
    <div className="relative flex h-dvh flex-col overflow-hidden bg-background">
      <header className="shrink-0 border-b border-border bg-card/50 backdrop-blur-sm z-50">
        <div className="container mx-auto px-4 pt-3 md:flex md:items-center md:justify-between md:gap-6 md:py-0">
          {header}
          <nav
            role="tablist"
            aria-label="Sections"
            className="relative mt-2 grid md:mt-0 md:w-[420px]"
            style={{ gridTemplateColumns: `repeat(${pages.length}, minmax(0, 1fr))` }}
          >
            {pages.map((page, i) => (
              <button
                key={page.id}
                type="button"
                role="tab"
                id={`tab-${page.id}`}
                aria-selected={active === i}
                aria-controls={`page-${page.id}`}
                onClick={() => goTo(i)}
                className={cn(
                  "flex items-center justify-center gap-2 py-3 md:py-5 text-sm font-medium transition-colors",
                  active === i ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className={cn("transition-colors [&>svg]:w-4 [&>svg]:h-4", active === i && "text-primary")}>
                  {page.icon}
                </span>
                {page.label}
              </button>
            ))}
            <span
              ref={indicatorRef}
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 left-0 h-0.5 will-change-transform"
              style={{ width: `${100 / pages.length}%` }}
            >
              <span className="mx-auto block h-full w-12 rounded-full bg-primary md:w-16" />
            </span>
          </nav>
        </div>
      </header>

      <div
        ref={scrollerRef}
        className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {pages.map((page, i) => (
          <section
            key={page.id}
            id={`page-${page.id}`}
            role="tabpanel"
            aria-labelledby={`tab-${page.id}`}
            aria-hidden={active !== i}
            inert={active !== i ? true : undefined}
            className="relative h-full w-full shrink-0 snap-start snap-always overflow-y-auto overscroll-y-contain"
          >
            {page.content}
          </section>
        ))}
      </div>
    </div>
  )
}
