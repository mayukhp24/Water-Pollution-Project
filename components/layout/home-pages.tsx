"use client"

import { useMemo } from "react"
import { Droplets, Shield, Activity, Beaker, FlaskConical, Map as MapIcon, BookOpen } from "lucide-react"
import { WaterQualityAnalyzer } from "@/components/water-quality/water-quality-analyzer"
import { MapExplorer } from "@/components/map/map-explorer"
import { SwipeTabs } from "@/components/layout/swipe-tabs"
import { HeaderControls } from "@/components/layout/header-controls"
import { useI18n } from "@/lib/i18n/provider"

export function HomePages() {
  const { m } = useI18n()

  const pages = useMemo(
    () => [
      { id: "analyzer", label: m.common.tabs.analyzer, icon: <FlaskConical />, content: <AnalyzerPage /> },
      { id: "map", label: m.common.tabs.map, icon: <MapIcon />, content: <MapPage /> },
      { id: "standards", label: m.common.tabs.standards, icon: <BookOpen />, content: <StandardsPage /> },
    ],
    [m],
  )

  return (
    <SwipeTabs
      tablistLabel={m.common.sectionsAria}
      actions={<HeaderControls />}
      header={
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Droplets className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-semibold text-foreground">AquaCheck</h1>
            <p className="hidden text-xs text-muted-foreground min-[420px]:block">{m.common.tagline}</p>
          </div>
        </div>
      }
      pages={pages}
    />
  )
}

function AnalyzerPage() {
  const { m } = useI18n()
  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="mb-6 max-w-3xl">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2 text-balance">{m.home.analyzerTitle}</h2>
        <p className="text-muted-foreground text-pretty">{m.home.analyzerIntro}</p>
      </div>
      <WaterQualityAnalyzer />
    </div>
  )
}

function MapPage() {
  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <MapExplorer />
    </div>
  )
}

function StandardsPage() {
  const { m } = useI18n()
  const h = m.home
  return (
    <div className="container mx-auto px-4 py-6 md:py-8 space-y-6">
      <div className="max-w-3xl">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2 text-balance">{h.standardsTitle}</h2>
        <p className="text-muted-foreground text-pretty">{h.standardsIntro}</p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Beaker} value="28" label={h.statParameters} description={h.statParametersDesc} />
        <StatCard icon={Shield} value="WHO" label={h.statStandards} description={h.statStandardsDesc} />
        <StatCard icon={Activity} value={h.statRealtime} label={h.statAnalysis} description={h.statAnalysisDesc} />
        <StatCard icon={Droplets} value={h.statSafe} label={h.statDrinking} description={h.statDrinkingDesc} />
      </div>

      {/* Standards Reference */}
      <section className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-xl font-semibold text-foreground mb-4">{h.referenceTitle}</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StandardReference title={m.params.ph} safe="6.5 - 8.5" source={h.sourceWho} />
          <StandardReference title={m.params.solids} safe="< 500 mg/L" source={h.sourceEpaSecondary} />
          <StandardReference title={m.params.hardness} safe="< 300 mg/L" source={h.sourceWho} />
          <StandardReference title={m.params.chloramines} safe="< 4 mg/L" source={h.sourceEpaMrdl} />
          <StandardReference title={m.params.conductivity} safe="< 800 μS/cm" source={h.sourceWho} />
          <StandardReference title={m.params.turbidity} safe="< 1 NTU" source={h.sourceEpa} />
          <StandardReference title="BOD" safe="< 3 mg/L" source={h.sourceWho} />
          <StandardReference title="COD" safe="< 10 mg/L" source={h.sourceWho} />
          <StandardReference
            title={`${m.params.e_coli} / ${m.params.total_coliform}`}
            safe="0 CFU/100mL"
            source={h.sourceEpaMcl}
          />
        </div>
      </section>

      {/* About */}
      <section className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-xl font-semibold text-foreground mb-4">{h.aboutTitle}</h3>
        <div className="prose prose-sm text-muted-foreground max-w-none">
          <p className="mb-4">{h.about1}</p>
          <p className="mb-4">
            <strong className="text-foreground">{h.aboutHowLabel}</strong> {h.aboutHow}
          </p>
          <p className="mb-0">
            <strong className="text-foreground">{h.aboutDisclaimerLabel}</strong> {h.aboutDisclaimer}
          </p>
        </div>
      </section>

      <p className="pb-2 text-center text-sm text-muted-foreground">{h.footer}</p>
    </div>
  )
}

function StatCard({
  icon: Icon,
  value,
  label,
  description,
}: {
  icon: React.ElementType
  value: string
  label: string
  description: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <span className="text-2xl font-bold text-foreground">{value}</span>
      </div>
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

function StandardReference({
  title,
  safe,
  source,
}: {
  title: string
  safe: string
  source: string
}) {
  return (
    <div className="flex flex-col gap-1 p-3 rounded-md bg-secondary/50">
      <span className="text-sm font-medium text-foreground">{title}</span>
      <span className="text-sm text-primary font-mono">{safe}</span>
      <span className="text-xs text-muted-foreground">{source}</span>
    </div>
  )
}
