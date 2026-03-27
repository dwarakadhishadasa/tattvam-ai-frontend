import { NextRequest, NextResponse } from "next/server"

import { generateLectureContext } from "@/lib/lecture/server"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { topic?: unknown }
    const topic = typeof body.topic === "string" ? body.topic : ""
    const data = await generateLectureContext("general", topic)

    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate lecture context"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
