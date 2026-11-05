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
export function SwipeTabs({
  pages,
  header,
  actions,
  tablistLabel,
}: {
  pages: SwipePage[]
  header: React.ReactNode
  actions?: React.ReactNode
  tablistLabel: string
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLSpanElement>(null)
  const [active, setActive] = useState(0)
  const activeRef = useRef(0)
  const headerRef = useRef<HTMLElement>(null)
  // The header floats over the pages; track its height (it wraps to two rows on phones) so each
  // page starts below it. 112px is a close first guess that avoids a jump before measuring.
  const [headerHeight, setHeaderHeight] = useState(112)

  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const observer = new ResizeObserver(() => setHeaderHeight(el.offsetHeight))
    observer.observe(el)
    setHeaderHeight(el.offsetHeight)
    return () => observer.disconnect()
  }, [])

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
    <div className="relative h-dvh overflow-hidden bg-background">
      {/* Frosted blue glass bar. It floats over the pages (which are padded by its height) so content
          scrolls underneath and shows through the blur. */}
      <header
        ref={headerRef}
        className={cn(
          "absolute inset-x-0 top-0 z-50 backdrop-blur-xl backdrop-saturate-150",
          "bg-white/50 bg-gradient-to-r from-sky-400/35 via-cyan-300/15 to-blue-500/30",
          "dark:bg-background/45 dark:from-sky-500/30 dark:via-cyan-400/10 dark:to-blue-600/35",
          "border-b border-sky-500/20 dark:border-sky-400/15",
          "shadow-[0_8px_30px_-12px_rgba(14,165,233,0.35)] dark:shadow-[0_8px_30px_-12px_rgba(56,189,248,0.3)]",
        )}
      >
        {/* Thin glowing edge along the bottom of the bar. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent"
        />
        {/* Phone: logo + controls on one row, tabs full width below. Desktop: logo | tabs | controls. */}
        <div className="container mx-auto flex flex-wrap items-center gap-x-3 px-4 pt-3 md:flex-nowrap md:gap-x-6 md:pt-0">
          <div className="order-1">{header}</div>
          <div className="order-2 ml-auto md:order-3 md:ml-0">{actions}</div>
          <nav
            role="tablist"
            aria-label={tablistLabel}
            className="relative order-3 mt-2 grid w-full md:order-2 md:mt-0 md:ml-auto md:w-[420px]"
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
        className="flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
            style={{ paddingTop: headerHeight, scrollPaddingTop: headerHeight }}
          >
            {page.content}
          </section>
        ))}
      </div>
    </div>
  )
}
