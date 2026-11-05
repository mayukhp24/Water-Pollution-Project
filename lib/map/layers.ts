import type { LayerBin, LayerDefinition, LayerId } from "./types"

// Colour ramps: "good → bad" uses cyan/green → red; rainfall uses a sequential blue ramp.
const GOOD_TO_BAD = ["#22d3ee", "#22c55e", "#eab308", "#f97316", "#ef4444"]
const RAIN = ["#cfe8ff", "#8cc4f5", "#4a9be6", "#1f6fd1", "#173f9c"]

export const MAP_LAYERS: LayerDefinition[] = [
  {
    id: "wqi",
    label: "Water Quality Index",
    shortLabel: "Water Quality",
    unit: "/100",
    icon: "droplets",
    description:
      "Composite index of pH, TDS, turbidity, BOD, nitrates and coliform for municipal and ground water. Higher is better.",
    higherIsBetter: true,
    bins: [
      { from: 0, label: "Very poor", color: GOOD_TO_BAD[4] },
      { from: 25, label: "Poor", color: GOOD_TO_BAD[3] },
      { from: 50, label: "Moderate", color: GOOD_TO_BAD[2] },
      { from: 70, label: "Good", color: GOOD_TO_BAD[1] },
      { from: 90, label: "Excellent", color: GOOD_TO_BAD[0] },
    ],
  },
  {
    id: "rainfall",
    label: "Annual Rainfall",
    shortLabel: "Rainfall",
    unit: "mm",
    icon: "cloud-rain",
    description:
      "Average annual rainfall across the south-west (Jun–Sep) and north-east (Oct–Dec) monsoons.",
    higherIsBetter: true,
    bins: [
      { from: 0, label: "< 700 mm", color: RAIN[0] },
      { from: 700, label: "700–1000 mm", color: RAIN[1] },
      { from: 1000, label: "1000–1300 mm", color: RAIN[2] },
      { from: 1300, label: "1300–1600 mm", color: RAIN[3] },
      { from: 1600, label: "> 1600 mm", color: RAIN[4] },
    ],
  },
  {
    id: "scarcity",
    label: "Water Scarcity Index",
    shortLabel: "Scarcity",
    unit: "/100",
    icon: "sun",
    description:
      "Demand-vs-supply stress combining per-capita availability, reservoir dependence and tanker reliance. Higher is worse.",
    higherIsBetter: false,
    bins: [
      { from: 0, label: "Low", color: GOOD_TO_BAD[0] },
      { from: 20, label: "Low–medium", color: GOOD_TO_BAD[1] },
      { from: 40, label: "Medium", color: GOOD_TO_BAD[2] },
      { from: 60, label: "High", color: GOOD_TO_BAD[3] },
      { from: 80, label: "Extreme", color: GOOD_TO_BAD[4] },
    ],
  },
  {
    id: "groundwater",
    label: "Groundwater Depth",
    shortLabel: "Groundwater",
    unit: "m bgl",
    icon: "arrow-down",
    description:
      "Pre-monsoon depth to the water table in metres below ground level. Deeper tables mean over-extraction.",
    higherIsBetter: false,
    bins: [
      { from: 0, label: "< 5 m", color: GOOD_TO_BAD[0] },
      { from: 5, label: "5–10 m", color: GOOD_TO_BAD[1] },
      { from: 10, label: "10–20 m", color: GOOD_TO_BAD[2] },
      { from: 20, label: "20–40 m", color: GOOD_TO_BAD[3] },
      { from: 40, label: "> 40 m", color: GOOD_TO_BAD[4] },
    ],
  },
  {
    id: "tds",
    label: "Total Dissolved Solids",
    shortLabel: "TDS",
    unit: "mg/L",
    icon: "flask",
    description:
      "Dissolved salts and minerals in groundwater. BIS 10500 acceptable limit is 500 mg/L, permissible 2000 mg/L.",
    higherIsBetter: false,
    bins: [
      { from: 0, label: "< 300 Excellent", color: GOOD_TO_BAD[0] },
      { from: 300, label: "300–500 Good", color: GOOD_TO_BAD[1] },
      { from: 500, label: "500–900 Fair", color: GOOD_TO_BAD[2] },
      { from: 900, label: "900–1200 Poor", color: GOOD_TO_BAD[3] },
      { from: 1200, label: "> 1200 Unfit", color: GOOD_TO_BAD[4] },
    ],
  },
  {
    id: "floodRisk",
    label: "Flood Risk",
    shortLabel: "Flood Risk",
    unit: "/100",
    icon: "waves",
    description:
      "Likelihood of urban or riverine flooding from low elevation, encroached water bodies and drainage capacity.",
    higherIsBetter: false,
    bins: [
      { from: 0, label: "Very low", color: GOOD_TO_BAD[0] },
      { from: 20, label: "Low", color: GOOD_TO_BAD[1] },
      { from: 40, label: "Moderate", color: GOOD_TO_BAD[2] },
      { from: 60, label: "High", color: GOOD_TO_BAD[3] },
      { from: 80, label: "Severe", color: GOOD_TO_BAD[4] },
    ],
  },
]

export function getLayer(layers: LayerDefinition[], id: LayerId): LayerDefinition {
  return layers.find((l) => l.id === id) ?? layers[0]
}

export function getBin(layer: LayerDefinition, value: number): LayerBin {
  let match = layer.bins[0]
  for (const bin of layer.bins) {
    if (value >= bin.from) match = bin
  }
  return match
}
