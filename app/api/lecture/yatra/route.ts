import { NextRequest, NextResponse } from "next/server"

import { generateLectureContext } from "@/lib/lecture/server"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { location?: unknown }
    const location = typeof body.location === "string" ? body.location : ""
    const data = await generateLectureContext("yatra", location)

    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate lecture context"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
