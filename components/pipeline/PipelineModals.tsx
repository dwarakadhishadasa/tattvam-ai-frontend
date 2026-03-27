import { AnimatePresence, motion } from "framer-motion"
import {
  BookOpen,
  ChevronRight,
  Clock,
  ExternalLink,
  History,
  Plus,
  Quote,
  Save,
  X,
} from "lucide-react"

import { YouTubeEmbed } from "@/components/pipeline/YouTubeEmbed"
import type { Session, TalkType, VerseData } from "@/components/pipeline/types"
import type { Citation } from "@/lib/chat/shared"

type ContextReferenceModalProps = {
  isOpen: boolean
  extractedVerseData: VerseData | null
  talkType: TalkType
  onClose: () => void
  onSaveSnippet: (content: string) => void
}

export function ContextReferenceModal({
  isOpen,
  extractedVerseData,
  talkType,
  onClose,
  onSaveSnippet,
}: ContextReferenceModalProps) {
  return (
    <AnimatePresence>
      {isOpen && extractedVerseData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            onClick={(event) => event.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="flex items-center justify-between p-6 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-900 text-white rounded-xl flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900">{extractedVerseData.title}</h3>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
                    Source Reference
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-900 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
              {extractedVerseData.verseText && (
                <div className="p-8 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <p className="text-zinc-800 font-serif text-xl leading-relaxed text-center italic whitespace-pre-wrap">
                    {extractedVerseData.verseText}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Translation</h4>
                <p className="text-zinc-700 text-lg leading-relaxed font-medium">
                  {extractedVerseData.translation}
                </p>
              </div>

              <div className="space-y-3 border-t border-zinc-100 pt-8">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  {talkType === "verse" ? "Purport" : "Key Points"}
                </h4>
                <div className="text-zinc-600 leading-relaxed text-[15px] whitespace-pre-wrap">
                  {extractedVerseData.purport}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-zinc-100 bg-zinc-50 flex justify-between items-center">
              {extractedVerseData.url ? (
                <a
                  href={extractedVerseData.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-bold text-zinc-500 hover:text-zinc-900 hover:border-zinc-300 transition-all shadow-sm group"
                >
                  <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  Source: prabhupadabooks.com
                </a>
              ) : (
                <div />
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    onSaveSnippet(
                      `${extractedVerseData.title}\n\n${extractedVerseData.translation}\n\n${extractedVerseData.purport}`,
                    )
                    onClose()
                  }}
                  className="inline-flex items-center gap-2 text-sm font-bold text-white bg-zinc-900 hover:bg-zinc-800 px-6 py-3 rounded-xl transition-all shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  Save to Knowledge Base
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

type CitationModalProps = {
  citation: Citation | null
  onClose: () => void
  onSaveSnippet: (content: string) => void
}

export function CitationModal({ citation, onClose, onSaveSnippet }: CitationModalProps) {
  return (
    <AnimatePresence>
      {citation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            onClick={(event) => event.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="flex items-center justify-between p-6 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-sm font-bold text-zinc-500">
                  {citation.number}
                </div>
                <h3 className="font-bold text-zinc-900">Source Citation</h3>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-900 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto hide-scrollbar">
              <div className="relative mb-6">
                <Quote className="absolute -top-2 -left-2 w-8 h-8 text-zinc-100 -z-10" />
                <p className="text-[15px] text-zinc-700 leading-relaxed font-medium italic">
                  &ldquo;{citation.text}&rdquo;
                </p>
              </div>

              {citation.url && (
                <div className="mt-4">
                  <YouTubeEmbed url={citation.url} />
                </div>
              )}
            </div>

            <div className="p-6 border-t border-zinc-100 bg-zinc-50 flex justify-between items-center">
              {citation.url ? (
                <a
                  href={citation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in YouTube
                </a>
              ) : (
                <div />
              )}

              <button
                onClick={() => {
                  onSaveSnippet(citation.text)
                  onClose()
                }}
                className="inline-flex items-center gap-2 text-sm font-bold text-white bg-zinc-900 hover:bg-zinc-800 px-5 py-2.5 rounded-xl transition-all shadow-sm"
              >
                <Save className="w-4 h-4" />
                Save Insight
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

type HistoryModalProps = {
  isOpen: boolean
  sessions: Session[]
  currentSessionId: string
  onClose: () => void
  onStartNewSession: () => void
  onLoadSession: (session: Session) => void
}

export function HistoryModal({
  isOpen,
  sessions,
  currentSessionId,
  onClose,
  onStartNewSession,
  onLoadSession,
}: HistoryModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            onClick={(event) => event.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="flex items-center justify-between p-6 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-100 text-zinc-900 rounded-xl flex items-center justify-center">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900">Session History</h3>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
                    Recent Activity
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-900 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <button
                onClick={onStartNewSession}
                className="w-full mb-6 flex items-center justify-center gap-2 py-4 border-2 border-dashed border-zinc-200 rounded-2xl text-zinc-500 hover:text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50 transition-all font-medium"
              >
                <Plus className="w-5 h-5" />
                Start New Session
              </button>

              <div className="space-y-3">
                {sessions.length === 0 ? (
                  <div className="text-center py-12 text-zinc-400">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No history found.</p>
                  </div>
                ) : (
                  sessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => onLoadSession(session)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between group ${
                        session.id === currentSessionId
                          ? "border-zinc-900 bg-zinc-50"
                          : "border-zinc-100 hover:border-zinc-300 hover:bg-zinc-50"
                      }`}
                    >
                      <div>
                        <h4 className="font-semibold text-zinc-900 mb-1">{session.title}</h4>
                        <div className="flex items-center gap-3 text-xs text-zinc-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(session.updatedAt).toLocaleDateString()}{" "}
                            {new Date(session.updatedAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className="px-2 py-0.5 bg-zinc-100 rounded-md capitalize">
                            {session.state.talkType || "New"}
                          </span>
                          <span className="px-2 py-0.5 bg-zinc-100 rounded-md">
                            Step {session.state.activeStep + 1}
                          </span>
                        </div>
                      </div>
                      <ChevronRight
                        className={`w-5 h-5 transition-transform ${
                          session.id === currentSessionId
                            ? "text-zinc-900"
                            : "text-zinc-300 group-hover:text-zinc-500 group-hover:translate-x-1"
                        }`}
                      />
                    </button>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
