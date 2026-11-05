import { NextResponse } from "next/server"
import Groq from "groq-sdk"
import { isLanguageCode, languageName } from "@/lib/i18n/languages"

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GROQ_API_KEY

    if (!apiKey || apiKey === "your_key_here") {
      return NextResponse.json(
        { error: "Groq API key not configured. Please set your GROQ_API_KEY in .env.local" },
        { status: 400 }
      )
    }

    const groq = new Groq({ apiKey })

    const body = await req.json()
    const { messages, message } = body
    const language = isLanguageCode(body.language) ? languageName(body.language) : "English"

    // Support both an array of messages or a single message string
    const formattedMessages: Array<{ role: "user" | "assistant" | "system"; content: string }> = []

    if (Array.isArray(messages)) {
      formattedMessages.push(...messages)
    } else if (typeof message === "string" && message.trim()) {
      formattedMessages.push({ role: "user", content: message.trim() })
    } else {
      return NextResponse.json(
        { error: "Please provide a message or messages array." },
        { status: 400 }
      )
    }

    const model = process.env.GROQ_MODEL || "openai/gpt-oss-20b"

    const chatCompletion = await groq.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are AquaCheck Assistant, a helpful and friendly AI assistant that answers questions about water quality, water safety standards, and general questions clearly and concisely." +
            (language === "English"
              ? ""
              : ` The user's interface language is ${language}: reply in ${language} using its native script, unless the user writes in a different language, in which case reply in theirs.`),
        },
        ...formattedMessages,
      ],
    })

    const reply =
      chatCompletion.choices[0]?.message?.content ||
      "I'm sorry, I couldn't generate a response."

    return NextResponse.json({ reply })
  } catch (error: any) {
    console.error("Groq API Error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to communicate with Groq AI." },
      { status: 500 }
    )
  }
}
