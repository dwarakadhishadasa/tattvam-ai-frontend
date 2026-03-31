import type { FormEvent, RefObject } from "react"

import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Image as ImageIcon,
  LayoutTemplate,
  Loader2,
  Presentation,
  RefreshCw,
  Save,
  Send,
  Settings,
  Sparkles,
  Trash2,
  X,
} from "lucide-react"

import { TALK_TYPE_OPTIONS } from "@/components/pipeline/constants"
import { MessageMarkdown } from "@/components/pipeline/MessageMarkdown"
import type {
  Message,
  NotebookEntrySaveInput,
  NotebookReadiness,
  SavedSnippet,
  TalkType,
  VerseData,
  VerseDetails,
} from "@/components/pipeline/types"
import type { SlideDeckJobState } from "@/lib/slides/shared"

type ContextStepProps = {
  talkType: TalkType
  verseDetails: VerseDetails
  generalTopic: string
  festivalName: string
  yatraLocation: string
  contextError: string | null
  isFetchingContext: boolean
  onTalkTypeChange: (talkType: Exclude<TalkType, null>) => void
  onVerseDetailsChange: (value: VerseDetails) => void
  onGeneralTopicChange: (value: string) => void
  onFestivalNameChange: (value: string) => void
  onYatraLocationChange: (value: string) => void
  onContinue: () => void
}

export function ContextStep({
  talkType,
  verseDetails,
  generalTopic,
  festivalName,
  yatraLocation,
  contextError,
  isFetchingContext,
  onTalkTypeChange,
  onVerseDetailsChange,
  onGeneralTopicChange,
  onFestivalNameChange,
  onYatraLocationChange,
  onContinue,
}: ContextStepProps) {
  return (
    <motion.div
      key="step0"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      className="h-full flex items-center justify-center p-8 overflow-y-auto hide-scrollbar"
    >
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-zinc-100 shadow-[0_8px_40px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="p-10 text-center border-b border-zinc-100 bg-zinc-50/50">
          <div className="w-16 h-16 bg-white border border-zinc-200 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <LayoutTemplate className="w-8 h-8 text-zinc-900" />
          </div>
          <h2 className="text-3xl font-bold text-zinc-900 tracking-tight mb-3">
            What is the talk about?
          </h2>
          <p className="text-zinc-500 max-w-md mx-auto">
            Select the type of lecture to help us provide better context and extraction.
          </p>
        </div>

        <div className="p-10 space-y-8">
          <div className="grid grid-cols-2 gap-4">
            {TALK_TYPE_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => onTalkTypeChange(option.id)}
                className={`p-6 rounded-2xl border-2 text-left transition-all duration-300 flex flex-col gap-3 ${
                  talkType === option.id
                    ? "border-zinc-900 bg-zinc-50 shadow-md"
                    : "border-zinc-100 hover:border-zinc-200 bg-white"
                }`}
              >
                <option.icon
                  className={`w-6 h-6 ${talkType === option.id ? "text-zinc-900" : "text-zinc-400"}`}
                />
                <span className={`font-bold ${talkType === option.id ? "text-zinc-900" : "text-zinc-500"}`}>
                  {option.label}
                </span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {talkType === "verse" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4 p-6 bg-zinc-50 rounded-2xl border border-zinc-100"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                      Book
                    </label>
                    <select
                      value={verseDetails.book}
                      onChange={(event) =>
                        onVerseDetailsChange({ ...verseDetails, book: event.target.value })
                      }
                      className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 outline-none focus:border-zinc-400 transition-colors"
                    >
                      <option value="bg">Bhagavad Gita</option>
                      <option value="sb">Srimad Bhagavatam</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                      Verse Number(s)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., 1.1 or 1.1.1"
                      value={verseDetails.verse}
                      onChange={(event) =>
                        onVerseDetailsChange({ ...verseDetails, verse: event.target.value })
                      }
                      className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 outline-none focus:border-zinc-400 transition-colors"
                    />
                  </div>
                </div>
                <p className="text-xs text-zinc-400 italic">
                  We will extract the verse, translation, and purport from prabhupadabooks.com
                </p>
              </motion.div>
            )}

            {talkType === "general" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4 p-6 bg-zinc-50 rounded-2xl border border-zinc-100"
              >
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    Topic
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., The Importance of Sadhu Sanga"
                    value={generalTopic}
                    onChange={(event) => onGeneralTopicChange(event.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 outline-none focus:border-zinc-400 transition-colors"
                  />
                </div>
              </motion.div>
            )}

            {talkType === "festival" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4 p-6 bg-zinc-50 rounded-2xl border border-zinc-100"
              >
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    Festival Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Janmashtami or Gaura Purnima"
                    value={festivalName}
                    onChange={(event) => onFestivalNameChange(event.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 outline-none focus:border-zinc-400 transition-colors"
                  />
                </div>
              </motion.div>
            )}

            {talkType === "yatra" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4 p-6 bg-zinc-50 rounded-2xl border border-zinc-100"
              >
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Vrindavan or Mayapur"
                    value={yatraLocation}
                    onChange={(event) => onYatraLocationChange(event.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 outline-none focus:border-zinc-400 transition-colors"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {contextError && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-3">
              <X className="w-4 h-4 shrink-0" />
              <p>{contextError}</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-zinc-50/50 border-t border-zinc-100 flex justify-end items-center">
          <button
            onClick={onContinue}
            disabled={!talkType || isFetchingContext}
            className="flex items-center gap-2 bg-zinc-900 text-white px-8 py-3 rounded-xl font-medium hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isFetchingContext ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Fetching Context...
              </>
            ) : (
              <>
                Continue to Extraction <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

type ExtractionStepProps = {
  extractedVerseData: VerseData | null
  contextError: string | null
  messages: Message[]
  inputMessage: string
  savedSnippets: SavedSnippet[]
  activeNotebookEntryId: string | null
  isFetchingContext: boolean
  isChatting: boolean
  lectureDuration: number
  wordCount: number
  requiredWordCount: number
  canCompile: boolean
  notebookReadiness: NotebookReadiness
  isGeneratingNotebook: boolean
  notebookGenerationError: string | null
  messagesEndRef: RefObject<HTMLDivElement | null>
  onBackToContext: () => void
  onOpenContext: () => void
  onInputMessageChange: (value: string) => void
  onSendMessage: () => void
  onSaveSnippet: (entry: NotebookEntrySaveInput) => void
  onRemoveSnippet: (id: string) => void
  onOpenNotebookEntry: (id: string) => void
  onCloseNotebookEntry: () => void
  onUpdateNotebookEntry: (id: string, content: string) => void
  onGenerateNotebook: () => void
  onSelectCitation: (selection: {
    citation: NonNullable<Message["citations"]>[number]
    sourceMessageId: string | null
  }) => void
}

export function ExtractionStep({
  extractedVerseData,
  contextError,
  messages,
  inputMessage,
  savedSnippets,
  activeNotebookEntryId,
  isFetchingContext,
  isChatting,
  lectureDuration,
  wordCount,
  requiredWordCount,
  canCompile,
  notebookReadiness,
  isGeneratingNotebook,
  notebookGenerationError,
  messagesEndRef,
  onBackToContext,
  onOpenContext,
  onInputMessageChange,
  onSendMessage,
  onSaveSnippet,
  onRemoveSnippet,
  onOpenNotebookEntry,
  onCloseNotebookEntry,
  onUpdateNotebookEntry,
  onGenerateNotebook,
  onSelectCitation,
}: ExtractionStepProps) {
  const activeEntry =
    savedSnippets.find((snippet) => snippet.id === activeNotebookEntryId) ?? null
  const hasSufficientContent = notebookReadiness === "ready"

  return (
    <motion.div
      key="step1"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="relative h-full flex overflow-hidden"
    >
      <div className="flex-1 flex flex-col relative">
        <div className="bg-white border-b border-zinc-100 p-4 flex items-center justify-between shadow-sm z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToContext}
              className="p-2 hover:bg-zinc-50 rounded-lg text-zinc-400 hover:text-zinc-900 transition-colors"
              title="Change Context"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <div>
              <h2 className="font-bold text-zinc-900 text-sm">
                {extractedVerseData?.title || "Lecture Context"}
              </h2>
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
                Extraction Phase
              </p>
            </div>
          </div>

          {extractedVerseData && (
            <button
              onClick={onOpenContext}
              className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 text-white rounded-full text-xs font-bold hover:bg-zinc-800 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-zinc-200/50 border border-zinc-800"
            >
              <BookOpen className="w-3.5 h-3.5" />
              View Reference
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-8 hide-scrollbar pb-32 chat-messages-container">
          <div className="max-w-3xl mx-auto space-y-8">
            {isFetchingContext && !extractedVerseData && (
              <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600 shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                <p>Fetching lecture reference in the background. You can start extraction now.</p>
              </div>
            )}

            {contextError && !extractedVerseData && (
              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                <p>{contextError}</p>
              </div>
            )}

            {messages.map((message) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={message.id}
                className={`flex gap-4 ${message.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    message.role === "user"
                      ? "bg-zinc-200 text-zinc-600"
                      : "bg-zinc-900 text-white"
                  }`}
                >
                  {message.role === "user" ? (
                    <div className="w-3 h-3 rounded-full bg-zinc-400" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                </div>
                <div
                  className={`group relative max-w-[80%] ${
                    message.role === "user"
                      ? "bg-zinc-100 px-5 py-3 rounded-2xl rounded-tr-sm"
                      : message.status === "error"
                        ? "rounded-2xl border border-red-100 bg-red-50 px-5 py-4"
                        : "pt-1"
                  }`}
                >
                  {message.role === "assistant" && message.targetLabel ? (
                    <div className="mb-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                          message.status === "error"
                            ? "bg-red-100 text-red-700"
                            : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {message.targetLabel}
                      </span>
                    </div>
                  ) : null}

                  <div
                    className={`chat-content text-[15px] ${
                      message.role === "user"
                        ? "text-zinc-800"
                        : message.status === "error"
                          ? "text-red-700"
                          : "text-zinc-700"
                    }`}
                  >
                    {message.role === "user" ? (
                      message.content
                    ) : message.status === "error" ? (
                      <p>{message.content}</p>
                    ) : (
                      <MessageMarkdown
                        content={message.content}
                        citations={message.citations}
                        onCitationSelect={(citation) =>
                          onSelectCitation({
                            citation,
                            sourceMessageId: message.id,
                          })
                        }
                      />
                    )}
                  </div>

                  {message.role === "assistant" && message.status !== "error" && (
                    <div className="mt-6 flex items-center gap-3">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() =>
                          onSaveSnippet({
                            sourceMessageId: message.id,
                            sourceType: "response",
                            sourceContent: message.content,
                          })
                        }
                        className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-zinc-900 bg-white border border-zinc-200 shadow-sm px-4 py-2 rounded-full transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Save Full Response
                      </motion.button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {isChatting && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="pt-2 flex gap-1">
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 1.4, delay: 0 }}
                    className="w-1.5 h-1.5 bg-zinc-400 rounded-full"
                  />
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 1.4, delay: 0.2 }}
                    className="w-1.5 h-1.5 bg-zinc-400 rounded-full"
                  />
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 1.4, delay: 0.4 }}
                    className="w-1.5 h-1.5 bg-zinc-400 rounded-full"
                  />
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#FAFAFA] via-[#FAFAFA] to-transparent pt-20">
          <div className="max-w-3xl mx-auto relative">
            <form
              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                event.preventDefault()
                onSendMessage()
              }}
              className="relative flex items-center bg-white border border-zinc-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-full overflow-hidden focus-within:ring-2 focus-within:ring-zinc-900/10 focus-within:border-zinc-300 transition-all"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(event) => onInputMessageChange(event.target.value)}
                placeholder="Ask NotebookLM about the lectures..."
                disabled={isChatting}
                className="flex-1 bg-transparent px-6 py-4 outline-none text-[15px] placeholder:text-zinc-400"
              />
              <button
                type="submit"
                disabled={isChatting || !inputMessage.trim()}
                className="mr-2 w-10 h-10 flex items-center justify-center rounded-full bg-zinc-900 text-white disabled:opacity-50 disabled:bg-zinc-200 disabled:text-zinc-400 transition-colors"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </form>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {activeEntry && (
          <>
            <motion.button
              type="button"
              aria-label="Close notebook editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 bg-transparent"
              onClick={onCloseNotebookEntry}
            />

            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.22 }}
              className="absolute inset-y-6 right-[27rem] z-30 w-[28rem] rounded-[2rem] border border-zinc-200 bg-white/96 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.14)] backdrop-blur"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex h-full flex-col gap-4">
                <div className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-4">
                  <p className="text-sm font-semibold text-zinc-900">Notebook Editor</p>
                  <button
                    onClick={onCloseNotebookEntry}
                    className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-900"
                  >
                    Close
                  </button>
                </div>

                <textarea
                  value={activeEntry.content}
                  onChange={(event) =>
                    onUpdateNotebookEntry(activeEntry.id, event.target.value)
                  }
                  className="min-h-0 flex-1 resize-none rounded-[1.5rem] border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm leading-relaxed text-zinc-700 outline-none transition-colors focus:border-zinc-400 focus:bg-white"
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="w-[26rem] bg-white border-l border-zinc-100 flex flex-col shadow-[-4px_0_24px_rgba(0,0,0,0.01)] z-10">
        <div className="p-6 border-b border-zinc-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-zinc-900">Notebook Workspace</h2>
              <p className="text-sm text-zinc-500 mt-1">
                Review, trim, and compile your saved material.
              </p>
            </div>
            <div className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
              {savedSnippets.length} saved
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-hidden bg-zinc-50/60 flex flex-col">
          <div className="p-4 space-y-3 overflow-y-auto hide-scrollbar">
            <AnimatePresence initial={false}>
              {savedSnippets.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-2xl border border-dashed border-zinc-200 bg-white px-6 py-10 text-center text-sm text-zinc-400"
                >
                  No notebook entries yet. Save a response, citation, or context block to start
                  building this workspace.
                </motion.div>
              ) : (
                savedSnippets.map((snippet, index) => {
                  const isActive = snippet.id === activeNotebookEntryId
                  const label =
                    snippet.sourceType === "response"
                      ? "Response"
                      : snippet.sourceType === "citation"
                        ? "Citation"
                        : "Context"

                  return (
                    <motion.div
                      key={snippet.id}
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97, height: 0, marginBottom: 0 }}
                      className={`rounded-2xl border p-4 shadow-sm transition-all ${
                        isActive
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 bg-white hover:border-zinc-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          onClick={() => onOpenNotebookEntry(snippet.id)}
                          className="flex-1 text-left"
                        >
                          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]">
                            <span
                              className={`rounded-full px-2 py-1 ${
                                isActive
                                  ? "bg-white/15 text-white"
                                  : "bg-zinc-100 text-zinc-600"
                              }`}
                            >
                              {label}
                            </span>
                            {snippet.isEdited && <span>Edited</span>}
                          </div>
                          <p className="mt-3 text-sm font-semibold">
                            Entry {index + 1}
                          </p>
                          <p
                            className={`mt-2 line-clamp-4 text-sm leading-relaxed ${
                              isActive ? "text-zinc-100" : "text-zinc-600"
                            }`}
                          >
                            {snippet.content}
                          </p>
                        </button>
                        <button
                          onClick={() => onRemoveSnippet(snippet.id)}
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
                            isActive
                              ? "border-white/20 text-white hover:bg-white/10"
                              : "border-zinc-200 text-zinc-400 hover:border-red-200 hover:text-red-500"
                          }`}
                          title="Remove notebook entry"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  )
                })
              )}
            </AnimatePresence>
          </div>

          <div className="border-t border-zinc-200 bg-white p-4 space-y-4">
            {canCompile && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        hasSufficientContent
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {hasSufficientContent ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Clock className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">
                        {hasSufficientContent ? "Ready to Generate Slides" : "More Content Recommended"}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {wordCount} of ~{requiredWordCount} words for a {lectureDuration}-minute talk
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                      hasSufficientContent
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {notebookReadiness}
                  </span>
                </div>
              </div>
            )}

            {notebookGenerationError && (
              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                <p>{notebookGenerationError}</p>
              </div>
            )}

            <button
              onClick={onGenerateNotebook}
              disabled={!canCompile || isGeneratingNotebook}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition-all hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGeneratingNotebook ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Notebook...
                </>
              ) : (
                <>
                  Generate Slides
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

type PresentationStepProps = {
  notebookName: string
  extractedStyle: string
  slideDeckTaskId: string | null
  slideDeckState: SlideDeckJobState
  slideDeckError: string | null
  slideDeckErrorCode: string | null
  requestedAtLabel: string | null
  lastCheckedAtLabel: string | null
  nextCheckAtLabel: string | null
  completedAtLabel: string | null
  isStartingSlideDeck: boolean
  canBuildPowerPoint: boolean
  onBuildPowerPoint: () => void
  onRetryBuild: () => void
  onDownloadPowerPoint: () => void
}

export function PresentationStep({
  notebookName,
  extractedStyle,
  slideDeckTaskId,
  slideDeckState,
  slideDeckError,
  slideDeckErrorCode,
  requestedAtLabel,
  lastCheckedAtLabel,
  nextCheckAtLabel,
  completedAtLabel,
  isStartingSlideDeck,
  canBuildPowerPoint,
  onBuildPowerPoint,
  onRetryBuild,
  onDownloadPowerPoint,
}: PresentationStepProps) {
  const isWaiting = slideDeckState === "pending" || slideDeckState === "inProgress"

  return (
    <motion.div
      key="step3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="h-full flex p-6"
    >
      <div className="flex-1 bg-white rounded-3xl border border-zinc-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col overflow-hidden relative">
        <div className="flex-1 flex items-center justify-center bg-zinc-50/50 p-8">
          <div className="w-full max-w-3xl rounded-[2rem] border border-zinc-200 bg-white p-10 shadow-sm">
            <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-3xl border border-zinc-100 bg-zinc-50">
              {slideDeckState === "completed" ? (
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              ) : slideDeckState === "failed" ? (
                <X className="h-10 w-10 text-red-400" />
              ) : isWaiting || isStartingSlideDeck ? (
                <Loader2 className="h-10 w-10 animate-spin text-zinc-400" />
              ) : (
                <Presentation className="h-10 w-10 text-zinc-300" />
              )}
            </div>

            <div className="text-center">
              <h3 className="text-3xl font-bold tracking-tight text-zinc-900">
                {slideDeckState === "completed"
                  ? "PowerPoint Ready"
                  : slideDeckState === "failed"
                    ? "Build Needs Attention"
                    : slideDeckState === "pending"
                      ? "PowerPoint Queued"
                      : slideDeckState === "inProgress" || isStartingSlideDeck
                        ? "Building PowerPoint"
                        : "Ready to Build PowerPoint"}
              </h3>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-zinc-500">
                {slideDeckState === "completed"
                  ? `Your deck for "${notebookName}" is ready to download.`
                  : slideDeckState === "failed"
                    ? "The last build did not complete. You can retry the same notebook with the current visual instructions."
                  : isWaiting || isStartingSlideDeck
                      ? `We're generating a .pptx deck from "${notebookName}". You can stay on this page or come back later and we'll keep checking in about a minute.`
                      : `We'll use the content from "${notebookName}" and your extracted visual instructions to build a downloadable .pptx deck.`}
              </p>
            </div>

            {!extractedStyle && slideDeckState === "idle" && (
              <div className="mx-auto mt-8 flex max-w-lg items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                <Settings className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  No visual style extracted yet. Add one in <strong>Visual Settings</strong> before
                  starting the PowerPoint build.
                </p>
              </div>
            )}

            <div className="mt-8 grid gap-3 rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-5 text-left text-sm text-zinc-600">
              {slideDeckTaskId && (
                <p>
                  <span className="font-semibold text-zinc-900">Task ID:</span> {slideDeckTaskId}
                </p>
              )}
              {requestedAtLabel && (
                <p>
                  <span className="font-semibold text-zinc-900">Requested:</span> {requestedAtLabel}
                </p>
              )}
              {lastCheckedAtLabel && (
                <p>
                  <span className="font-semibold text-zinc-900">Last checked:</span>{" "}
                  {lastCheckedAtLabel}
                </p>
              )}
              {nextCheckAtLabel && isWaiting && (
                <p>
                  <span className="font-semibold text-zinc-900">Next check:</span> around{" "}
                  {nextCheckAtLabel}
                </p>
              )}
              {completedAtLabel && slideDeckState === "completed" && (
                <p>
                  <span className="font-semibold text-zinc-900">Completed:</span>{" "}
                  {completedAtLabel}
                </p>
              )}
              {slideDeckError && (
                <p className="text-red-600">
                  <span className="font-semibold text-red-700">Error:</span> {slideDeckError}
                  {slideDeckErrorCode ? ` (${slideDeckErrorCode})` : ""}
                </p>
              )}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {slideDeckState === "completed" ? (
                <>
                  <button
                    onClick={onDownloadPowerPoint}
                    className="flex items-center gap-2 rounded-xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-zinc-800"
                  >
                    <Download className="h-4 w-4" />
                    Download .pptx
                  </button>
                  <button
                    onClick={onRetryBuild}
                    className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-6 py-3 text-sm font-medium text-zinc-700 transition-all hover:bg-zinc-50"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Rebuild PowerPoint
                  </button>
                </>
              ) : slideDeckState === "failed" ? (
                <button
                  onClick={onRetryBuild}
                  className="flex items-center gap-2 rounded-xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-zinc-800"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry Build
                </button>
              ) : (
                <button
                  onClick={onBuildPowerPoint}
                  disabled={!canBuildPowerPoint || isStartingSlideDeck || isWaiting}
                  className="flex items-center gap-2 rounded-xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isStartingSlideDeck ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Starting Build...
                    </>
                  ) : isWaiting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Waiting for Next Check
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Build PowerPoint
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
