import { NextRequest, NextResponse } from "next/server"

import { generateGeminiText } from "@/lib/gemini/server"

import { processTask, tasks } from "../store"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const body = rawBody ? ((JSON.parse(rawBody) as { content?: unknown; style?: unknown })) : {}
  const content = typeof body.content === "string" ? body.content.trim() : ""
  const style = typeof body.style === "string" ? body.style.trim() : ""

  if (!content) {
    const taskId = crypto.randomUUID()

    tasks[taskId] = {
      status: "processing",
      url: null,
      error: null,
      error_code: null,
      metadata: null,
    }

    processTask(taskId)

    return NextResponse.json({
      ok: true,
      status: {
        task_id: taskId,
        status: "processing",
        url: null,
        error: null,
        error_code: null,
        metadata: null,
      },
    })
  }

  try {
    const slides = await generateGeminiText(createSlidePrompt(content, style))

    return NextResponse.json({
      ok: true,
      slides: slides || "Failed to generate slides.",
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate slide deck"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

function createSlidePrompt(content: string, style: string): string {
  return `Generate a markdown slide deck based on the following lecture content.

Apply this visual style/theme description to the content structure:
${style || "Use a clear, readable, presentation-ready structure."}

Lecture Content:
${content}

Format the output as a series of slides using markdown.
Use exactly "---" on a new line to separate each slide.
Use "#" for slide titles.`
}
