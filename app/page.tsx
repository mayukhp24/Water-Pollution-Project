import { WaterQualityAnalyzer } from "@/components/water-quality/water-quality-analyzer"
import { MapExplorer } from "@/components/map/map-explorer"
import { Droplets, Shield, Activity, Beaker } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Droplets className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">AquaCheck</h1>
                <p className="text-xs text-muted-foreground">Water Quality Analysis</p>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <a href="#analyzer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Analyzer
              </a>
              <a href="#map" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Map
              </a>
              <a href="#standards" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Standards
              </a>
              <a href="#about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                About
              </a>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="mb-12">
          <div className="max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-balance">
              Analyze Your Water Quality
            </h2>
            <p className="text-lg text-muted-foreground mb-8 text-pretty">
              Input water quality parameters to determine if your water meets drinking standards.
              Our analysis is based on WHO and EPA guidelines.
            </p>
          </div>

          {/* Stats */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-8">
            <StatCard
              icon={Beaker}
              value="28"
              label="Parameters"
              description="Physical, chemical & biological"
            />
            <StatCard
              icon={Shield}
              value="WHO"
              label="Standards"
              description="International guidelines"
            />
            <StatCard
              icon={Activity}
              value="Real-time"
              label="Analysis"
              description="Instant results"
            />
            <StatCard
              icon={Droplets}
              value="Safe"
              label="Drinking Water"
              description="Potability assessment"
            />
          </div>
        </section>

        {/* Analyzer Section */}
        <section id="analyzer" className="mb-12">
          <WaterQualityAnalyzer />
        </section>

        {/* Map Section */}
        <section id="map" className="mb-12 scroll-mt-24">
          <MapExplorer />
        </section>

        {/* Standards Reference */}
        <section id="standards" className="mb-12">
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="text-xl font-semibold text-foreground mb-4">
              Drinking Water Standards Reference
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StandardReference
                title="pH Level"
                safe="6.5 - 8.5"
                source="WHO Guidelines"
              />
              <StandardReference
                title="Total Dissolved Solids"
                safe="< 500 mg/L"
                source="EPA Secondary Standards"
              />
              <StandardReference
                title="Hardness"
                safe="< 300 mg/L"
                source="WHO Guidelines"
              />
              <StandardReference
                title="Chloramines"
                safe="< 4 mg/L"
                source="EPA MRDL"
              />
              <StandardReference
                title="Conductivity"
                safe="< 800 μS/cm"
                source="WHO Guidelines"
              />
              <StandardReference
                title="Turbidity"
                safe="< 1 NTU"
                source="EPA Standards"
              />
              <StandardReference
                title="BOD"
                safe="< 3 mg/L"
                source="WHO Guidelines"
              />
              <StandardReference
                title="COD"
                safe="< 10 mg/L"
                source="WHO Guidelines"
              />
              <StandardReference
                title="E. coli / Coliform"
                safe="0 CFU/100mL"
                source="EPA MCL"
              />
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="mb-12">
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="text-xl font-semibold text-foreground mb-4">
              About This Tool
            </h3>
            <div className="prose prose-sm text-muted-foreground max-w-none">
              <p className="mb-4">
                This water quality analyzer uses internationally recognized standards from the 
                World Health Organization (WHO) and the United States Environmental Protection 
                Agency (EPA) to assess water potability.
              </p>
              <p className="mb-4">
                <strong className="text-foreground">How it works:</strong> Enter your water test results 
                for various parameters. The system compares your values against established safe 
                drinking water limits and provides an overall assessment.
              </p>
              <p className="mb-0">
                <strong className="text-foreground">Disclaimer:</strong> This tool provides a preliminary 
                assessment only. For definitive water quality testing, please consult a certified 
                laboratory or your local water authority.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            Water quality standards based on WHO and EPA guidelines
          </p>
        </div>
      </footer>
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
