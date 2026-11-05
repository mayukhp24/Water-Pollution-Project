export function formatValue(value: number): string {
  return value.toLocaleString("en-IN", { maximumFractionDigits: 1 })
}

export function formatPopulation(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`
  return String(value)
}
