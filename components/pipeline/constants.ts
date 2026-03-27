import type { LucideIcon } from "lucide-react"
import { BookOpen, FileText, Image as ImageIcon, LayoutTemplate, Sparkles } from "lucide-react"

import type { Message, PipelineStep, TalkType, VerseDetails } from "@/components/pipeline/types"

export const DEFAULT_LECTURE_DURATION = 15

export const INITIAL_VERSE_DETAILS: VerseDetails = {
  book: "bg",
  verse: "",
}

export const TALK_TYPE_OPTIONS: Array<{
  id: Exclude<TalkType, null>
  label: string
  icon: LucideIcon
}> = [
  { id: "verse", label: "Verse Specific Lecture", icon: BookOpen },
  { id: "general", label: "General Lecture", icon: FileText },
  { id: "festival", label: "Festival Lecture", icon: Sparkles },
  { id: "yatra", label: "Yatra Talk", icon: ImageIcon },
]

export const PIPELINE_STEPS: Array<{
  id: PipelineStep
  title: string
  desc: string
  icon: LucideIcon
}> = [
  { id: 0, title: "Context", icon: LayoutTemplate, desc: "Define talk type" },
  { id: 1, title: "Extraction", icon: FileText, desc: "Chat, review, and compile" },
  { id: 2, title: "Presentation", icon: LayoutTemplate, desc: "Generate slides" },
]

export function createWelcomeMessage(): Message {
  return {
    id: "1",
    role: "assistant",
    content:
      "Welcome to **Tattvam AI**. I am connected to your NotebookLM transcripts. What would you like to explore today?",
  }
}
