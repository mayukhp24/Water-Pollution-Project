import { WaterQualityAnalyzer } from "@/components/water-quality/water-quality-analyzer"
import { MapExplorer } from "@/components/map/map-explorer"
import { SwipeTabs } from "@/components/layout/swipe-tabs"
import { Droplets, Shield, Activity, Beaker, FlaskConical, Map as MapIcon, BookOpen } from "lucide-react"

export default function Home() {
  return (
    <SwipeTabs
      header={
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Droplets className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-semibold text-foreground">AquaCheck</h1>
            <p className="text-xs text-muted-foreground">Water Quality Analysis</p>
          </div>
        </div>
      }
      pages={[
        { id: "analyzer", label: "Analyzer", icon: <FlaskConical />, content: <AnalyzerPage /> },
        { id: "map", label: "Map", icon: <MapIcon />, content: <MapPage /> },
        { id: "standards", label: "Standards", icon: <BookOpen />, content: <StandardsPage /> },
      ]}
    />
  )
}

function AnalyzerPage() {
  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="mb-6 max-w-3xl">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2 text-balance">Analyze Your Water Quality</h2>
        <p className="text-muted-foreground text-pretty">
          Enter your test results to check drinking safety against WHO and EPA guidelines, and see where the water can
          still be used at home or in industry.
        </p>
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
  return (
    <div className="container mx-auto px-4 py-6 md:py-8 space-y-6">
      <div className="max-w-3xl">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2 text-balance">Standards & About</h2>
        <p className="text-muted-foreground text-pretty">
          The drinking water limits AquaCheck uses, and how the tool works.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Beaker} value="28" label="Parameters" description="Physical, chemical & biological" />
        <StatCard icon={Shield} value="WHO" label="Standards" description="International guidelines" />
        <StatCard icon={Activity} value="Real-time" label="Analysis" description="Instant results" />
        <StatCard icon={Droplets} value="Safe" label="Drinking Water" description="Potability assessment" />
      </div>

      {/* Standards Reference */}
      <section className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-xl font-semibold text-foreground mb-4">Drinking Water Standards Reference</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StandardReference title="pH Level" safe="6.5 - 8.5" source="WHO Guidelines" />
          <StandardReference title="Total Dissolved Solids" safe="< 500 mg/L" source="EPA Secondary Standards" />
          <StandardReference title="Hardness" safe="< 300 mg/L" source="WHO Guidelines" />
          <StandardReference title="Chloramines" safe="< 4 mg/L" source="EPA MRDL" />
          <StandardReference title="Conductivity" safe="< 800 μS/cm" source="WHO Guidelines" />
          <StandardReference title="Turbidity" safe="< 1 NTU" source="EPA Standards" />
          <StandardReference title="BOD" safe="< 3 mg/L" source="WHO Guidelines" />
          <StandardReference title="COD" safe="< 10 mg/L" source="WHO Guidelines" />
          <StandardReference title="E. coli / Coliform" safe="0 CFU/100mL" source="EPA MCL" />
        </div>
      </section>

      {/* About */}
      <section className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-xl font-semibold text-foreground mb-4">About This Tool</h3>
        <div className="prose prose-sm text-muted-foreground max-w-none">
          <p className="mb-4">
            This water quality analyzer uses internationally recognized standards from the World Health Organization
            (WHO) and the United States Environmental Protection Agency (EPA) to assess water potability.
          </p>
          <p className="mb-4">
            <strong className="text-foreground">How it works:</strong> Enter your water test results for various
            parameters. The system compares your values against established safe drinking water limits and provides an
            overall assessment.
          </p>
          <p className="mb-0">
            <strong className="text-foreground">Disclaimer:</strong> This tool provides a preliminary assessment only.
            For definitive water quality testing, please consult a certified laboratory or your local water authority.
          </p>
        </div>
      </section>

      <p className="pb-2 text-center text-sm text-muted-foreground">
        Water quality standards based on WHO and EPA guidelines
      </p>
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
