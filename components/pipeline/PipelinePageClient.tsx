"use client"

import dynamic from "next/dynamic"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence } from "framer-motion"

import { DEFAULT_LECTURE_DURATION, INITIAL_VERSE_DETAILS } from "@/components/pipeline/constants"
import {
  ContextReferenceModal,
  CitationModal,
  HistoryModal,
  RecoveryNoticeStack,
} from "@/components/pipeline/PipelineModals"
import { PipelineSidebar } from "@/components/pipeline/PipelineSidebar"
import {
  ContextStep,
  ExtractionStep,
  PresentationStep,
} from "@/components/pipeline/PipelineSteps"
import type {
  Message,
  NotebookEntrySaveInput,
  PipelineStep,
  SavedSnippet,
  SessionState,
  TalkType,
  VerseData,
} from "@/components/pipeline/types"
import {
  appendNotebookEntry,
  buildNotebookCompileSource,
  buildLectureVerseData,
  canCompileNotebook,
  countSnippetWords,
  createEmptySessionState,
  createInitialMessages,
  createSessionId,
  createSessionSnapshot,
  getNotebookReadiness,
  getRequiredWordCount,
  hasMeaningfulSessionData,
  removeNotebookEntry,
  splitSlides,
  updateNotebookEntryContent,
} from "@/components/pipeline/utils"
import { useSessionPersistence } from "@/hooks/useSessionPersistence"
import { ENVY_DEMO_RESPONSE } from "@/lib/chat/demo-response"
import { askChatQuestion } from "@/lib/chat/client"
import { normalizeDownstreamChatResponse } from "@/lib/chat/normalize"
import {
  formatAssistantAnswer,
  stripCitationAppendix,
  type Citation,
} from "@/lib/chat/shared"
import type { CreateNotebookResponse } from "@/lib/notebooks/shared"

const SettingsModal = dynamic(() => import("@/components/SettingsModal"), {
  ssr: false,
})

type ActiveCitationSelection = {
  citation: Citation
  sourceMessageId: string | null
}

export default function PipelinePageClient() {
  const [activeStep, setActiveStep] = useState<PipelineStep>(0)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const [talkType, setTalkType] = useState<TalkType>(null)
  const [verseDetails, setVerseDetails] = useState(() => ({ ...INITIAL_VERSE_DETAILS }))
  const [generalTopic, setGeneralTopic] = useState("")
  const [festivalName, setFestivalName] = useState("")
  const [yatraLocation, setYatraLocation] = useState("")
  const [extractedVerseData, setExtractedVerseData] = useState<VerseData | null>(null)
  const [isFetchingContext, setIsFetchingContext] = useState(false)
  const [contextError, setContextError] = useState<string | null>(null)

  const [messages, setMessages] = useState<Message[]>(() => createInitialMessages())
  const [inputMessage, setInputMessage] = useState("")
  const [savedSnippets, setSavedSnippets] = useState<SavedSnippet[]>([])
  const [isChatting, setIsChatting] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const slidesContainerRef = useRef<HTMLDivElement>(null)
  const contextRequestIdRef = useRef(0)
  const [activeCitation, setActiveCitation] = useState<ActiveCitationSelection | null>(null)

  const [notebookName, setNotebookName] = useState("")
  const [activeNotebookEntryId, setActiveNotebookEntryId] = useState<string | null>(null)
  const [isGeneratingNotebook, setIsGeneratingNotebook] = useState(false)
  const [notebookGenerationError, setNotebookGenerationError] = useState<string | null>(null)
  const [generatedNotebookId, setGeneratedNotebookId] = useState<string | null>(null)
  const [lectureDuration, setLectureDuration] = useState(DEFAULT_LECTURE_DURATION)

  const [slideImage, setSlideImage] = useState<string | null>(null)
  const [extractedStyle, setExtractedStyle] = useState("")
  const [isGeneratingSlides, setIsGeneratingSlides] = useState(false)
  const [generatedSlides, setGeneratedSlides] = useState("")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)

  const [isContextModalOpen, setIsContextModalOpen] = useState(false)

  const [isHistoryOpen, setIsHistoryOpen] = useState(false)

  const slides = useMemo(() => splitSlides(generatedSlides), [generatedSlides])
  const wordCount = useMemo(() => countSnippetWords(savedSnippets), [savedSnippets])
  const canCompile = useMemo(() => canCompileNotebook(savedSnippets), [savedSnippets])
  const notebookReadiness = useMemo(
    () => getNotebookReadiness(savedSnippets, lectureDuration),
    [savedSnippets, lectureDuration],
  )
  const requiredWordCount = useMemo(
    () => getRequiredWordCount(lectureDuration),
    [lectureDuration],
  )

  const currentSessionState = useMemo<SessionState>(
    () => ({
      activeStep,
      talkType,
      verseDetails,
      generalTopic,
      festivalName,
      yatraLocation,
      extractedVerseData,
      messages,
      savedSnippets,
      notebookName,
      activeNotebookEntryId,
      generatedNotebookId,
      generatedSlides,
    }),
    [
      activeStep,
      talkType,
      verseDetails,
      generalTopic,
      festivalName,
      yatraLocation,
      extractedVerseData,
      messages,
      savedSnippets,
      notebookName,
      activeNotebookEntryId,
      generatedNotebookId,
      generatedSlides,
    ],
  )

  const applySessionState = useCallback((sessionState: SessionState) => {
    setActiveStep(sessionState.activeStep)
    setTalkType(sessionState.talkType)
    setVerseDetails(sessionState.verseDetails)
    setGeneralTopic(sessionState.generalTopic)
    setFestivalName(sessionState.festivalName)
    setYatraLocation(sessionState.yatraLocation)
    setExtractedVerseData(sessionState.extractedVerseData)
    setMessages(
      sessionState.messages.map((message) =>
        message.role === "assistant"
          ? {
              ...message,
              content: stripCitationAppendix(message.content),
            }
          : message,
      ),
    )
    setSavedSnippets(sessionState.savedSnippets)
    setNotebookName(sessionState.notebookName)
    setActiveNotebookEntryId(
      sessionState.savedSnippets.some(
        (snippet) => snippet.id === sessionState.activeNotebookEntryId,
      )
        ? sessionState.activeNotebookEntryId
        : null,
    )
    setGeneratedNotebookId(sessionState.generatedNotebookId)
    setGeneratedSlides(sessionState.generatedSlides)
    setInputMessage("")
    setContextError(null)
    setNotebookGenerationError(null)
    setActiveCitation(null)
    setIsContextModalOpen(false)
    setCurrentSlideIndex(0)
  }, [])

  const {
    currentSessionId,
    sessionIndex,
    notices,
    loadSession,
    startNewSession,
    clearVisualCache,
  } = useSessionPersistence({
    currentSessionState,
    lectureDuration,
    slideImage,
    extractedStyle,
    createSessionId,
    createEmptySessionState,
    createSessionSnapshot,
    hasMeaningfulSessionData,
    onRestoreSessionState: applySessionState,
    onRestoreLectureDuration: setLectureDuration,
    onRestoreSlideImage: setSlideImage,
    onRestoreExtractedStyle: setExtractedStyle,
  })

  const visualCacheMessage = useMemo(() => {
    const visualNotice = notices.find(
      (notice) =>
        notice.code === "visual-settings-missing" || notice.code === "visual-cache-cleared",
    )

    return visualNotice?.message ?? null
  }, [notices])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
      if (!document.fullscreenElement) {
        setCurrentSlideIndex(0)
      }
    }

    document.addEventListener("fullscreenchange", onFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange)
  }, [])

  useEffect(() => {
    if (!isFullscreen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (slides.length === 0) {
        return
      }

      if (event.key === "ArrowRight" || event.key === " ") {
        setCurrentSlideIndex((previousIndex) => Math.min(previousIndex + 1, slides.length - 1))
      } else if (event.key === "ArrowLeft") {
        setCurrentSlideIndex((previousIndex) => Math.max(previousIndex - 1, 0))
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isFullscreen, slides.length])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveCitation(null)
      }
    }

    if (activeCitation) {
      window.addEventListener("keydown", handleKeyDown)
    }

    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [activeCitation])

  async function handleFetchContext() {
    if (!talkType) {
      return
    }

    const requestId = contextRequestIdRef.current + 1
    contextRequestIdRef.current = requestId
    setContextError(null)
    setExtractedVerseData(null)

    if (talkType === "general" || talkType === "festival") {
      setIsFetchingContext(false)
      setActiveStep(1)
      return
    }

    setIsFetchingContext(true)
    setActiveStep(1)

    try {
      if (talkType === "verse") {
        const data = await fetchJson<VerseData>(
          `/api/verse?book=${verseDetails.book}&verse=${verseDetails.verse}`,
        )
        if (contextRequestIdRef.current === requestId) {
          setExtractedVerseData(data)
        }
      } else if (talkType === "yatra") {
        const data = await fetchJson<{ overview: string; keyPoints: string[] }>(
          "/api/lecture/yatra",
          {
            method: "POST",
            body: JSON.stringify({ location: yatraLocation }),
          },
        )
        if (contextRequestIdRef.current === requestId) {
          setExtractedVerseData(buildLectureVerseData("yatra", yatraLocation, data))
        }
      }
    } catch (error) {
      if (contextRequestIdRef.current === requestId) {
        const message = error instanceof Error ? error.message : "Failed to fetch context"
        setContextError(message)
      }
    } finally {
      if (contextRequestIdRef.current === requestId) {
        setIsFetchingContext(false)
      }
    }
  }

  async function handleSendMessage() {
    if (!inputMessage.trim()) {
      return
    }

    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage,
    }

    setMessages((previousMessages) => [...previousMessages, newUserMessage])
    setInputMessage("")
    setIsChatting(true)

    try {
      if (newUserMessage.content.toLowerCase().includes("envy")) {
        const parsedDemoResponse = normalizeDownstreamChatResponse(ENVY_DEMO_RESPONSE)

        if (parsedDemoResponse) {
          setMessages((previousMessages) => [
            ...previousMessages,
            {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content: formatAssistantAnswer(parsedDemoResponse.result.answerBody),
              citations: parsedDemoResponse.result.citations,
            },
          ])
          return
        }
      }

      const response = await askChatQuestion(newUserMessage.content)

      setMessages((previousMessages) => [
        ...previousMessages,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: formatAssistantAnswer(response.result.answerBody),
          citations: response.result.citations,
        },
      ])
    } catch (error) {
      console.error("Chat error:", error)
      setMessages((previousMessages) => [
        ...previousMessages,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "Error connecting to the AI.",
        },
      ])
    } finally {
      setIsChatting(false)
    }
  }

  function handleSaveSnippet(entry: NotebookEntrySaveInput) {
    setSavedSnippets((previousSnippets) => appendNotebookEntry(previousSnippets, entry))
  }

  function handleRemoveSnippet(id: string) {
    setSavedSnippets((previousSnippets) => removeNotebookEntry(previousSnippets, id))
    setActiveNotebookEntryId((previousEntryId) => (previousEntryId === id ? null : previousEntryId))
  }

  function handleUpdateSnippet(id: string, content: string) {
    setSavedSnippets((previousSnippets) =>
      updateNotebookEntryContent(previousSnippets, id, content),
    )
  }

  async function handleGenerateNotebook() {
    if (!canCompile || isGeneratingNotebook) {
      return
    }

    setIsGeneratingNotebook(true)
    setNotebookGenerationError(null)
    const nextNotebookName = notebookName.trim() || "Untitled Workspace"

    if (!notebookName.trim()) {
      setNotebookName(nextNotebookName)
    }

    try {
      const data = await fetchJson<CreateNotebookResponse>("/api/notebooks", {
        method: "POST",
        body: JSON.stringify({ title: nextNotebookName }),
      })

      setNotebookName(data.notebook.title)
      setGeneratedNotebookId(data.notebook.id)
      setGeneratedSlides("")
      setIsGeneratingNotebook(false)
      setActiveNotebookEntryId(null)
      setActiveStep(2)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create notebook"
      setNotebookGenerationError(message)
      setIsGeneratingNotebook(false)
    }
  }

  async function handleGenerateSlides() {
    if (!extractedStyle || !generatedNotebookId) {
      return
    }

    setIsGeneratingSlides(true)

    try {
      const data = await fetchJson<{ ok: boolean; slides: string }>("/api/slides/generate", {
        method: "POST",
        body: JSON.stringify({
          style: extractedStyle,
          content: buildNotebookCompileSource(savedSnippets),
        }),
      })

      setGeneratedSlides(data.slides || "Failed to generate slides.")
    } catch (error) {
      console.error("Slide generation error:", error)
      setGeneratedSlides("Error generating slides.")
    } finally {
      setIsGeneratingSlides(false)
    }
  }

  function handleToggleFullscreen() {
    if (!slidesContainerRef.current) {
      return
    }

    if (document.fullscreenElement) {
      void document.exitFullscreen()
      return
    }

    void slidesContainerRef.current.requestFullscreen()
  }

  return (
    <div className="flex h-screen bg-[#FAFAFA] text-zinc-900 font-sans overflow-hidden">
      <RecoveryNoticeStack notices={notices} />

      <PipelineSidebar
        activeStep={activeStep}
        hasExtractedContext={
          Boolean(extractedVerseData) || talkType === "general" || talkType === "festival"
        }
        savedSnippetCount={savedSnippets.length}
        hasGeneratedNotebook={Boolean(generatedNotebookId)}
        onStepChange={setActiveStep}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {activeStep === 0 && (
            <ContextStep
              talkType={talkType}
              verseDetails={verseDetails}
              generalTopic={generalTopic}
              festivalName={festivalName}
              yatraLocation={yatraLocation}
              contextError={contextError}
              isFetchingContext={isFetchingContext}
              onTalkTypeChange={setTalkType}
              onVerseDetailsChange={setVerseDetails}
              onGeneralTopicChange={setGeneralTopic}
              onFestivalNameChange={setFestivalName}
              onYatraLocationChange={setYatraLocation}
              onContinue={handleFetchContext}
            />
          )}

          {activeStep === 1 && (
            <ExtractionStep
              extractedVerseData={extractedVerseData}
              contextError={contextError}
              messages={messages}
              inputMessage={inputMessage}
              savedSnippets={savedSnippets}
              activeNotebookEntryId={activeNotebookEntryId}
              isFetchingContext={isFetchingContext}
              isChatting={isChatting}
              lectureDuration={lectureDuration}
              wordCount={wordCount}
              requiredWordCount={requiredWordCount}
              canCompile={canCompile}
              notebookReadiness={notebookReadiness}
              isGeneratingNotebook={isGeneratingNotebook}
              notebookGenerationError={notebookGenerationError}
              messagesEndRef={messagesEndRef}
              onBackToContext={() => setActiveStep(0)}
              onOpenContext={() => setIsContextModalOpen(true)}
              onInputMessageChange={setInputMessage}
              onSendMessage={handleSendMessage}
              onSaveSnippet={handleSaveSnippet}
              onRemoveSnippet={handleRemoveSnippet}
              onOpenNotebookEntry={setActiveNotebookEntryId}
              onCloseNotebookEntry={() => setActiveNotebookEntryId(null)}
              onUpdateNotebookEntry={handleUpdateSnippet}
              onGenerateNotebook={handleGenerateNotebook}
              onSelectCitation={setActiveCitation}
            />
          )}

          {activeStep === 2 && (
            <PresentationStep
              notebookName={notebookName}
              extractedStyle={extractedStyle}
              generatedSlides={generatedSlides}
              slides={slides}
              slidesContainerRef={slidesContainerRef}
              isGeneratingSlides={isGeneratingSlides}
              isFullscreen={isFullscreen}
              currentSlideIndex={currentSlideIndex}
              onGenerateSlides={handleGenerateSlides}
              onClearSlides={() => setGeneratedSlides("")}
              onToggleFullscreen={handleToggleFullscreen}
            />
          )}
        </AnimatePresence>
      </main>

      <ContextReferenceModal
        isOpen={isContextModalOpen}
        extractedVerseData={extractedVerseData}
        talkType={talkType}
        onClose={() => setIsContextModalOpen(false)}
        onSaveSnippet={handleSaveSnippet}
      />

      <CitationModal
        citationSelection={activeCitation}
        onClose={() => setActiveCitation(null)}
        onSaveSnippet={handleSaveSnippet}
      />

      <HistoryModal
        isOpen={isHistoryOpen}
        sessions={sessionIndex}
        currentSessionId={currentSessionId}
        notices={notices}
        onClose={() => setIsHistoryOpen(false)}
        onStartNewSession={() => {
          startNewSession()
          setIsHistoryOpen(false)
        }}
        onLoadSession={async (sessionId) => {
          await loadSession(sessionId)
          setIsHistoryOpen(false)
        }}
      />

      {isSettingsOpen && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          slideImage={slideImage}
          setSlideImage={setSlideImage}
          extractedStyle={extractedStyle}
          setExtractedStyle={setExtractedStyle}
          lectureDuration={lectureDuration}
          setLectureDuration={setLectureDuration}
          visualCacheMessage={visualCacheMessage}
          onClearVisualCache={clearVisualCache}
        />
      )}
    </div>
  )
}

async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  })

  const data = (await response.json()) as T & {
    error?: unknown
    detail?: unknown
  }

  if (!response.ok) {
    const message =
      typeof data.error === "string"
        ? data.error
        : typeof data.detail === "string"
          ? data.detail
          : "Request failed"
    throw new Error(message)
  }

  return data
}
