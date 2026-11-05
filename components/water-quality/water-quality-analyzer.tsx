"use client"

import { useState, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ParameterInput } from "./parameter-input"
import { ResultDisplay } from "./result-display"
import { StandardsTable } from "./standards-table"
import { QualityDonutChart } from "./quality-donut-chart"
import { ReuseRecommendations } from "./reuse-recommendations"
import type { AnalyzedReading } from "@/lib/reuse/types"
import { Beaker, RotateCcw, FlaskConical, Atom, Bug, Droplets } from "lucide-react"

// Parameter Categories
const PHYSICAL_PARAMETERS = [
  {
    id: "ph",
    label: "pH Level",
    unit: "",
    min: 0,
    max: 14,
    safeMin: 6.5,
    safeMax: 8.5,
    warningMin: 6.0,
    warningMax: 9.0,
    description: "Measure of acidity or alkalinity. pH 7 is neutral.",
    category: "physical",
  },
  {
    id: "hardness",
    label: "Hardness",
    unit: "mg/L",
    min: 0,
    max: 1000,
    safeMin: 0,
    safeMax: 300,
    warningMin: 0,
    warningMax: 500,
    description: "Concentration of calcium and magnesium. High hardness can cause scale buildup.",
    category: "physical",
  },
  {
    id: "solids",
    label: "Total Dissolved Solids",
    unit: "mg/L",
    min: 0,
    max: 2000,
    safeMin: 0,
    safeMax: 500,
    warningMin: 0,
    warningMax: 1000,
    description: "Total amount of dissolved minerals, salts, and organic matter.",
    category: "physical",
  },
  {
    id: "turbidity",
    label: "Turbidity",
    unit: "NTU",
    min: 0,
    max: 10,
    safeMin: 0,
    safeMax: 1,
    warningMin: 0,
    warningMax: 4,
    description: "Measure of water clarity. High turbidity can harbor pathogens.",
    category: "physical",
  },
  {
    id: "conductivity",
    label: "Conductivity",
    unit: "μS/cm",
    min: 0,
    max: 2000,
    safeMin: 0,
    safeMax: 800,
    warningMin: 0,
    warningMax: 1500,
    description: "Measure of water's ability to conduct electricity. Indicates dissolved ions.",
    category: "physical",
  },
  {
    id: "temperature",
    label: "Temperature",
    unit: "°C",
    min: 0,
    max: 50,
    safeMin: 10,
    safeMax: 25,
    warningMin: 5,
    warningMax: 30,
    description: "Water temperature. Affects dissolved oxygen and biological activity.",
    category: "physical",
  },
  {
    id: "color",
    label: "Color",
    unit: "TCU",
    min: 0,
    max: 100,
    safeMin: 0,
    safeMax: 15,
    warningMin: 0,
    warningMax: 25,
    description: "True color units. High color may indicate organic contamination.",
    category: "physical",
  },
  {
    id: "odor",
    label: "Odor Threshold",
    unit: "TON",
    min: 0,
    max: 10,
    safeMin: 0,
    safeMax: 3,
    warningMin: 0,
    warningMax: 5,
    description: "Threshold odor number. Should be virtually undetectable.",
    category: "physical",
  },
]

const CHEMICAL_PARAMETERS = [
  {
    id: "chloramines",
    label: "Chloramines",
    unit: "mg/L",
    min: 0,
    max: 10,
    safeMin: 0,
    safeMax: 4,
    warningMin: 0,
    warningMax: 6,
    description: "Disinfection byproduct. Used as an alternative to chlorine.",
    category: "chemical",
  },
  {
    id: "sulfate",
    label: "Sulfate",
    unit: "mg/L",
    min: 0,
    max: 500,
    safeMin: 0,
    safeMax: 250,
    warningMin: 0,
    warningMax: 400,
    description: "Naturally occurring mineral. High levels can cause laxative effects.",
    category: "chemical",
  },
  {
    id: "organic_carbon",
    label: "Organic Carbon",
    unit: "mg/L",
    min: 0,
    max: 30,
    safeMin: 0,
    safeMax: 2,
    warningMin: 0,
    warningMax: 4,
    description: "Total organic carbon content. High levels indicate contamination risk.",
    category: "chemical",
  },
  {
    id: "trihalomethanes",
    label: "Trihalomethanes",
    unit: "μg/L",
    min: 0,
    max: 150,
    safeMin: 0,
    safeMax: 80,
    warningMin: 0,
    warningMax: 100,
    description: "Chlorination byproducts. Long-term exposure may increase cancer risk.",
    category: "chemical",
  },
  {
    id: "chloride",
    label: "Chloride",
    unit: "mg/L",
    min: 0,
    max: 500,
    safeMin: 0,
    safeMax: 250,
    warningMin: 0,
    warningMax: 350,
    description: "Common anion. High levels give salty taste and may corrode pipes.",
    category: "chemical",
  },
  {
    id: "nitrate",
    label: "Nitrate (NO3)",
    unit: "mg/L",
    min: 0,
    max: 100,
    safeMin: 0,
    safeMax: 10,
    warningMin: 0,
    warningMax: 20,
    description: "Agricultural runoff indicator. High levels dangerous for infants.",
    category: "chemical",
  },
  {
    id: "nitrite",
    label: "Nitrite (NO2)",
    unit: "mg/L",
    min: 0,
    max: 10,
    safeMin: 0,
    safeMax: 1,
    warningMin: 0,
    warningMax: 2,
    description: "Intermediate in nitrogen cycle. Indicates recent contamination.",
    category: "chemical",
  },
  {
    id: "fluoride",
    label: "Fluoride",
    unit: "mg/L",
    min: 0,
    max: 10,
    safeMin: 0,
    safeMax: 1.5,
    warningMin: 0,
    warningMax: 2,
    description: "Added for dental health. Excess causes fluorosis.",
    category: "chemical",
  },
  {
    id: "ammonia",
    label: "Ammonia",
    unit: "mg/L",
    min: 0,
    max: 5,
    safeMin: 0,
    safeMax: 0.5,
    warningMin: 0,
    warningMax: 1.5,
    description: "Indicator of recent pollution. Toxic to aquatic life.",
    category: "chemical",
  },
  {
    id: "dissolved_oxygen",
    label: "Dissolved Oxygen",
    unit: "mg/L",
    min: 0,
    max: 20,
    safeMin: 6,
    safeMax: 20,
    warningMin: 4,
    warningMax: 20,
    description: "Essential for aquatic life. Low DO indicates pollution.",
    category: "chemical",
  },
]

const BIOLOGICAL_PARAMETERS = [
  {
    id: "bod",
    label: "BOD (Biochemical Oxygen Demand)",
    unit: "mg/L",
    min: 0,
    max: 100,
    safeMin: 0,
    safeMax: 3,
    warningMin: 0,
    warningMax: 6,
    description: "Oxygen required by microorganisms. High BOD indicates organic pollution.",
    category: "biological",
  },
  {
    id: "cod",
    label: "COD (Chemical Oxygen Demand)",
    unit: "mg/L",
    min: 0,
    max: 200,
    safeMin: 0,
    safeMax: 10,
    warningMin: 0,
    warningMax: 25,
    description: "Measure of organic matter. Should be close to BOD for drinkable water.",
    category: "biological",
  },
  {
    id: "total_coliform",
    label: "Total Coliform",
    unit: "CFU/100mL",
    min: 0,
    max: 1000,
    safeMin: 0,
    safeMax: 0,
    warningMin: 0,
    warningMax: 1,
    description: "Indicator bacteria. Must be absent in drinking water.",
    category: "biological",
  },
  {
    id: "fecal_coliform",
    label: "Fecal Coliform",
    unit: "CFU/100mL",
    min: 0,
    max: 1000,
    safeMin: 0,
    safeMax: 0,
    warningMin: 0,
    warningMax: 0,
    description: "Indicates fecal contamination. Must be zero in drinking water.",
    category: "biological",
  },
  {
    id: "e_coli",
    label: "E. coli",
    unit: "CFU/100mL",
    min: 0,
    max: 1000,
    safeMin: 0,
    safeMax: 0,
    warningMin: 0,
    warningMax: 0,
    description: "Direct indicator of fecal contamination. Must be absent.",
    category: "biological",
  },
  {
    id: "heterotrophic_plate_count",
    label: "Heterotrophic Plate Count",
    unit: "CFU/mL",
    min: 0,
    max: 1000,
    safeMin: 0,
    safeMax: 500,
    warningMin: 0,
    warningMax: 750,
    description: "General bacterial contamination indicator.",
    category: "biological",
  },
  {
    id: "giardia",
    label: "Giardia Cysts",
    unit: "cysts/L",
    min: 0,
    max: 10,
    safeMin: 0,
    safeMax: 0,
    warningMin: 0,
    warningMax: 0,
    description: "Parasitic protozoan. Causes giardiasis. Must be absent.",
    category: "biological",
  },
  {
    id: "cryptosporidium",
    label: "Cryptosporidium",
    unit: "oocysts/L",
    min: 0,
    max: 10,
    safeMin: 0,
    safeMax: 0,
    warningMin: 0,
    warningMax: 0,
    description: "Parasitic protozoan. Resistant to chlorine. Must be absent.",
    category: "biological",
  },
  {
    id: "algae_count",
    label: "Algae Count",
    unit: "cells/mL",
    min: 0,
    max: 100000,
    safeMin: 0,
    safeMax: 2000,
    warningMin: 0,
    warningMax: 5000,
    description: "Blue-green algae can produce toxins. Monitor in source water.",
    category: "biological",
  },
  {
    id: "chlorophyll_a",
    label: "Chlorophyll-a",
    unit: "μg/L",
    min: 0,
    max: 100,
    safeMin: 0,
    safeMax: 10,
    warningMin: 0,
    warningMax: 25,
    description: "Indicator of algal biomass. High levels affect taste and odor.",
    category: "biological",
  },
]

const ALL_PARAMETERS = [...PHYSICAL_PARAMETERS, ...CHEMICAL_PARAMETERS, ...BIOLOGICAL_PARAMETERS]

type ParameterValues = Record<string, string>

export function WaterQualityAnalyzer() {
  const [values, setValues] = useState<ParameterValues>(
    ALL_PARAMETERS.reduce((acc, param) => ({ ...acc, [param.id]: "" }), {})
  )
  const [result, setResult] = useState<"safe" | "unsafe" | "warning" | null>(null)
  const [confidence, setConfidence] = useState(0)
  const [issues, setIssues] = useState<string[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [activeTab, setActiveTab] = useState("physical")
  // Snapshot of the inputs at the moment of analysis, so editing a field doesn't re-run reuse advice.
  const [analyzedReadings, setAnalyzedReadings] = useState<AnalyzedReading[] | null>(null)

  const getParameterStatus = useCallback(
    (id: string, value: string): "safe" | "warning" | "danger" | "neutral" => {
      if (!value) return "neutral"
      const numValue = parseFloat(value)
      const param = ALL_PARAMETERS.find((p) => p.id === id)
      if (!param || isNaN(numValue)) return "neutral"

      if (numValue >= param.safeMin && numValue <= param.safeMax) {
        return "safe"
      } else if (numValue >= param.warningMin && numValue <= param.warningMax) {
        return "warning"
      }
      return "danger"
    },
    []
  )

  const handleValueChange = (id: string, value: string) => {
    setValues((prev) => ({ ...prev, [id]: value }))
  }

  const handleReset = () => {
    setValues(ALL_PARAMETERS.reduce((acc, param) => ({ ...acc, [param.id]: "" }), {}))
    setResult(null)
    setConfidence(0)
    setIssues([])
    setAnalyzedReadings(null)
  }

  const chartData = useMemo(() => {
    let safeCount = 0
    let warningCount = 0
    let dangerCount = 0
    let neutralCount = 0

    ALL_PARAMETERS.forEach((param) => {
      const status = getParameterStatus(param.id, values[param.id])
      if (status === "safe") safeCount++
      else if (status === "warning") warningCount++
      else if (status === "danger") dangerCount++
      else neutralCount++
    })

    return {
      safeCount,
      warningCount,
      dangerCount,
      neutralCount,
      totalParameters: ALL_PARAMETERS.length,
    }
  }, [values, getParameterStatus])

  const analyzeWater = async () => {
    setIsAnalyzing(true)
    
    // Simulate analysis delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const filledParams = ALL_PARAMETERS.filter((param) => values[param.id])
    const detectedIssues: string[] = []
    let safeCount = 0
    let warningCount = 0
    let dangerCount = 0

    filledParams.forEach((param) => {
      const status = getParameterStatus(param.id, values[param.id])
      if (status === "safe") safeCount++
      if (status === "warning") {
        warningCount++
        detectedIssues.push(`${param.label} is slightly outside optimal range`)
      }
      if (status === "danger") {
        dangerCount++
        detectedIssues.push(`${param.label} exceeds safe limits (${values[param.id]} ${param.unit})`)
      }
    })

    const totalParams = filledParams.length
    const calculatedConfidence = totalParams > 0 
      ? Math.round((totalParams / ALL_PARAMETERS.length) * 100)
      : 0

    let analysisResult: "safe" | "unsafe" | "warning"
    if (dangerCount > 0) {
      analysisResult = "unsafe"
    } else if (warningCount > 0) {
      analysisResult = "warning"
    } else {
      analysisResult = "safe"
    }

    setResult(analysisResult)
    setConfidence(calculatedConfidence)
    setIssues(detectedIssues)
    setAnalyzedReadings(
      filledParams.map((param) => ({
        id: param.id,
        label: param.label,
        value: parseFloat(values[param.id]),
        unit: param.unit,
        status: getParameterStatus(param.id, values[param.id]) as AnalyzedReading["status"],
        safeMin: param.safeMin,
        safeMax: param.safeMax,
      })),
    )
    setIsAnalyzing(false)
  }

  const getTableParameters = (category: string) => {
    const params = category === "physical" 
      ? PHYSICAL_PARAMETERS 
      : category === "chemical" 
        ? CHEMICAL_PARAMETERS 
        : BIOLOGICAL_PARAMETERS

    return params.map((param) => ({
      name: param.label,
      value: values[param.id] ? parseFloat(values[param.id]) : null,
      unit: param.unit,
      safeMin: param.safeMin,
      safeMax: param.safeMax,
      status: getParameterStatus(param.id, values[param.id]),
    }))
  }

  const hasAnyValue = Object.values(values).some((v) => v !== "")

  const renderParameterInputs = (params: typeof ALL_PARAMETERS) => (
    <div className="grid gap-4 sm:grid-cols-2">
      {params.map((param) => (
        <ParameterInput
          key={param.id}
          label={param.label}
          value={values[param.id]}
          onChange={(value) => handleValueChange(param.id, value)}
          unit={param.unit}
          min={param.min}
          max={param.max}
          safeMin={param.safeMin}
          safeMax={param.safeMax}
          description={param.description}
          currentStatus={getParameterStatus(param.id, values[param.id])}
        />
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Form */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Beaker className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Water Parameters</CardTitle>
                <CardDescription>
                  Enter your water test measurements across categories
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="physical" className="flex items-center gap-2">
                  <Droplets className="w-4 h-4" />
                  <span className="hidden sm:inline">Physical</span>
                </TabsTrigger>
                <TabsTrigger value="chemical" className="flex items-center gap-2">
                  <Atom className="w-4 h-4" />
                  <span className="hidden sm:inline">Chemical</span>
                </TabsTrigger>
                <TabsTrigger value="biological" className="flex items-center gap-2">
                  <Bug className="w-4 h-4" />
                  <span className="hidden sm:inline">Biological</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="physical" className="mt-0">
                <div className="max-h-[400px] overflow-y-auto pr-2">
                  {renderParameterInputs(PHYSICAL_PARAMETERS)}
                </div>
              </TabsContent>
              
              <TabsContent value="chemical" className="mt-0">
                <div className="max-h-[400px] overflow-y-auto pr-2">
                  {renderParameterInputs(CHEMICAL_PARAMETERS)}
                </div>
              </TabsContent>
              
              <TabsContent value="biological" className="mt-0">
                <div className="max-h-[400px] overflow-y-auto pr-2">
                  {renderParameterInputs(BIOLOGICAL_PARAMETERS)}
                </div>
              </TabsContent>
            </Tabs>
  
            <div className="flex gap-3 pt-4 border-t border-border">
              <Button
                onClick={analyzeWater}
                disabled={!hasAnyValue || isAnalyzing}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isAnalyzing ? (
                  <>
                    <FlaskConical className="w-4 h-4 mr-2 animate-pulse" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <FlaskConical className="w-4 h-4 mr-2" />
                    Analyze Water Quality
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={!hasAnyValue && result === null}
                className="border-border text-foreground hover:bg-secondary"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="sr-only">Reset</span>
              </Button>
            </div>
          </CardContent>
        </Card>
  
        {/* Results Section */}
        <div className="space-y-6">
          {/* Donut Chart */}
          <QualityDonutChart data={chartData} result={result} />
  
          {/* Result Display */}
          <ResultDisplay result={result} confidence={confidence} issues={issues} />
  
          {/* Standards Table */}
          {hasAnyValue && (
            <Tabs defaultValue="physical" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="physical">Physical</TabsTrigger>
                <TabsTrigger value="chemical">Chemical</TabsTrigger>
                <TabsTrigger value="biological">Biological</TabsTrigger>
              </TabsList>
              <TabsContent value="physical">
                <StandardsTable parameters={getTableParameters("physical")} />
              </TabsContent>
              <TabsContent value="chemical">
                <StandardsTable parameters={getTableParameters("chemical")} />
              </TabsContent>
              <TabsContent value="biological">
                <StandardsTable parameters={getTableParameters("biological")} />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      {/* Reuse Recommendations */}
      {result && analyzedReadings && analyzedReadings.length > 0 && (
        <ReuseRecommendations readings={analyzedReadings} drinkingResult={result} />
      )}
    </div>
  )
}
