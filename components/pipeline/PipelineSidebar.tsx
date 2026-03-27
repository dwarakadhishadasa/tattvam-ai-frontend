import { CheckCircle2, History, Settings, Sparkles } from "lucide-react"

import { PIPELINE_STEPS } from "@/components/pipeline/constants"
import type { PipelineStep } from "@/components/pipeline/types"

type PipelineSidebarProps = {
  activeStep: PipelineStep
  hasExtractedContext: boolean
  savedSnippetCount: number
  hasGeneratedNotebook: boolean
  onStepChange: (step: PipelineStep) => void
  onOpenHistory: () => void
  onOpenSettings: () => void
}

export function PipelineSidebar({
  activeStep,
  hasExtractedContext,
  savedSnippetCount,
  hasGeneratedNotebook,
  onStepChange,
  onOpenHistory,
  onOpenSettings,
}: PipelineSidebarProps) {
  return (
    <aside className="w-72 bg-white border-r border-zinc-100 flex flex-col p-6 z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      <div className="mb-12 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="font-semibold text-lg tracking-tight leading-none">Tattvam AI</h1>
          <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider mt-1">
            Lecture Synthesis
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-8 relative">
        <div className="absolute left-[15px] top-6 bottom-10 w-[2px] bg-zinc-100 -z-10" />

        {PIPELINE_STEPS.map((step) => {
          const isActive = activeStep === step.id
          const isCompleted = activeStep > step.id
          const Icon = step.icon

          let isAccessible = true
          if (step.id === 1) {
            isAccessible = hasExtractedContext
          }
          if (step.id === 2) {
            isAccessible = savedSnippetCount > 0
          }
          if (step.id === 3) {
            isAccessible = hasGeneratedNotebook
          }

          return (
            <button
              key={step.id}
              onClick={() => isAccessible && onStepChange(step.id)}
              disabled={!isAccessible}
              className={`w-full text-left relative flex gap-4 p-2 rounded-xl transition-all duration-300 ${
                isActive
                  ? "opacity-100 bg-zinc-50"
                  : isAccessible
                    ? "opacity-70 hover:opacity-100 hover:bg-zinc-50/50 cursor-pointer"
                    : "opacity-40 cursor-not-allowed"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300 ${
                  isActive
                    ? "bg-zinc-900 text-white shadow-md"
                    : isCompleted
                      ? "bg-zinc-900 text-white"
                      : "bg-white border-2 border-zinc-200 text-zinc-400"
                }`}
              >
                {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <div>
                <h3 className={`font-medium ${isActive ? "text-zinc-900" : "text-zinc-500"}`}>
                  {step.title}
                </h3>
                <p className="text-sm text-zinc-400 mt-0.5">{step.desc}</p>
              </div>
            </button>
          )
        })}
      </nav>

      <div className="mt-auto space-y-4 pt-6 border-t border-zinc-100">
        <button
          onClick={onOpenHistory}
          className="w-full flex items-center gap-3 p-3 rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition-all group"
        >
          <History className="w-5 h-5 group-hover:-rotate-12 transition-transform duration-500" />
          <span className="font-medium">History</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-3 p-3 rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition-all group"
        >
          <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform duration-500" />
          <span className="font-medium">Settings</span>
        </button>

        <div className="flex items-center justify-between text-sm px-3">
          <span className="text-zinc-500 font-medium">Saved Snippets</span>
          <span className="bg-zinc-100 text-zinc-900 px-2.5 py-0.5 rounded-full font-semibold">
            {savedSnippetCount}
          </span>
        </div>
      </div>
    </aside>
  )
}
