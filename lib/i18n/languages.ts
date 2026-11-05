export const LANGUAGES = [
  { code: "en", label: "English", english: "English" },
  { code: "hi", label: "हिन्दी", english: "Hindi" },
  { code: "ta", label: "தமிழ்", english: "Tamil" },
  { code: "te", label: "తెలుగు", english: "Telugu" },
  { code: "kn", label: "ಕನ್ನಡ", english: "Kannada" },
  { code: "ml", label: "മലയാളം", english: "Malayalam" },
  { code: "bn", label: "বাংলা", english: "Bengali" },
  { code: "mr", label: "मराठी", english: "Marathi" },
  { code: "gu", label: "ગુજરાતી", english: "Gujarati" },
  { code: "pa", label: "ਪੰਜਾਬੀ", english: "Punjabi" },
] as const

export type LanguageCode = (typeof LANGUAGES)[number]["code"]

export const DEFAULT_LANGUAGE: LanguageCode = "en"

export function isLanguageCode(value: unknown): value is LanguageCode {
  return LANGUAGES.some((l) => l.code === value)
}

export function languageName(code: LanguageCode): string {
  return LANGUAGES.find((l) => l.code === code)?.english ?? "English"
}
