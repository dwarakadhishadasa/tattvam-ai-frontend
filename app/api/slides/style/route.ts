import { NextRequest, NextResponse } from "next/server"

import { GeminiProviderUnavailableError } from "@/lib/gemini/errors"
import { generateGeminiTextFromParts } from "@/lib/gemini/server"

export const runtime = "nodejs"

const STYLE_PROMPT =
  "Analyze this presentation slide image. Extract the presentation style, themes, color palette, typography, and overall look and feel. Return a concise style prompt that can guide generation of new slides."

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { imageDataUrl?: unknown }
    const imageDataUrl = typeof body.imageDataUrl === "string" ? body.imageDataUrl : ""
    const imageData = parseImageDataUrl(imageDataUrl)

    if (!imageData) {
      return NextResponse.json({ error: "A valid base64 data URL is required" }, { status: 400 })
    }

    const style = await generateGeminiTextFromParts([
      {
        inlineData: imageData,
      },
      {
        text: STYLE_PROMPT,
      },
    ])

    return NextResponse.json({
      style: style || "Could not extract style.",
    })
  } catch (error) {
    if (error instanceof GeminiProviderUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    const message = error instanceof Error ? error.message : "Failed to extract slide style"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function parseImageDataUrl(imageDataUrl: string): { data: string; mimeType: string } | null {
  const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/)

  if (!match) {
    return null
  }

  return {
    mimeType: match[1],
    data: match[2],
  }
}
