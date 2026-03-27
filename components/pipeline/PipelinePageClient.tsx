"use client"

import dynamic from "next/dynamic"
import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence } from "framer-motion"

import { DEFAULT_LECTURE_DURATION, INITIAL_VERSE_DETAILS } from "@/components/pipeline/constants"
import { ContextReferenceModal, CitationModal, HistoryModal } from "@/components/pipeline/PipelineModals"
import { PipelineSidebar } from "@/components/pipeline/PipelineSidebar"
import {
  ContextStep,
  ExtractionStep,
  PresentationStep,
  SynthesisStep,
} from "@/components/pipeline/PipelineSteps"
import type {
  Message,
  PipelineStep,
  SavedSnippet,
  Session,
  SessionState,
  TalkType,
  VerseData,
} from "@/components/pipeline/types"
import {
  buildLectureVerseData,
  countSnippetWords,
  createEmptySessionState,
  createInitialMessages,
  createSessionId,
  createSessionSnapshot,
  getRequiredWordCount,
  hasMeaningfulSessionData,
  readStoredSessions,
  splitSlides,
  upsertSession,
} from "@/components/pipeline/utils"
import { ENVY_DEMO_RESPONSE } from "@/lib/chat/demo-response"
import { askChatQuestion } from "@/lib/chat/client"
import { parseBackendChatResponse, type Citation } from "@/lib/chat/shared"

const SettingsModal = dynamic(() => import("@/components/SettingsModal"), {
  ssr: false,
})

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
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null)

  const [notebookName, setNotebookName] = useState("")
  const [isGeneratingNotebook, setIsGeneratingNotebook] = useState(false)
  const [generatedNotebookId, setGeneratedNotebookId] = useState<string | null>(null)
  const [lectureDuration, setLectureDuration] = useState(DEFAULT_LECTURE_DURATION)

  const [slideImage, setSlideImage] = useState<string | null>(null)
  const [extractedStyle, setExtractedStyle] = useState("")
  const [isGeneratingSlides, setIsGeneratingSlides] = useState(false)
  const [generatedSlides, setGeneratedSlides] = useState("")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)

  const [isContextModalOpen, setIsContextModalOpen] = useState(false)

  const [sessions, setSessions] = useState<Session[]>([])
  const [currentSessionId, setCurrentSessionId] = useState("")
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)

  const slides = useMemo(() => splitSlides(generatedSlides), [generatedSlides])
  const wordCount = useMemo(() => countSnippetWords(savedSnippets), [savedSnippets])
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
      generatedNotebookId,
      generatedSlides,
    ],
  )

  useEffect(() => {
    const cachedImage = localStorage.getItem("slide_image_cache")
    const cachedStyle = localStorage.getItem("slide_style_cache")
    const cachedDuration = localStorage.getItem("lecture_duration_cache")
    const savedSessions = localStorage.getItem("tattvam_sessions")

    if (cachedImage) {
      setSlideImage(cachedImage)
    }
    if (cachedStyle) {
      setExtractedStyle(cachedStyle)
    }
    if (cachedDuration) {
      setLectureDuration(Number(cachedDuration))
    }

    setSessions(readStoredSessions(savedSessions))
    setCurrentSessionId(createSessionId())
  }, [])

  useEffect(() => {
    if (slideImage) {
      localStorage.setItem("slide_image_cache", slideImage)
    } else {
      localStorage.removeItem("slide_image_cache")
    }

    if (extractedStyle) {
      localStorage.setItem("slide_style_cache", extractedStyle)
    } else {
      localStorage.removeItem("slide_style_cache")
    }

    localStorage.setItem("lecture_duration_cache", lectureDuration.toString())
  }, [slideImage, extractedStyle, lectureDuration])

  useEffect(() => {
    if (!currentSessionId || !hasMeaningfulSessionData(currentSessionState)) {
      return
    }

    setSessions((previousSessions) => {
      const nextSessions = upsertSession(
        previousSessions,
        createSessionSnapshot(currentSessionId, currentSessionState),
      )
      localStorage.setItem("tattvam_sessions", JSON.stringify(nextSessions))
      return nextSessions
    })
  }, [currentSessionId, currentSessionState])

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

    setIsFetchingContext(true)
    setContextError(null)

    try {
      if (talkType === "verse") {
        const data = await fetchJson<VerseData>(
          `/api/verse?book=${verseDetails.book}&verse=${verseDetails.verse}`,
        )
        setExtractedVerseData(data)
      } else if (talkType === "general") {
        const data = await fetchJson<{ overview: string; keyPoints: string[] }>(
          "/api/lecture/general",
          {
            method: "POST",
            body: JSON.stringify({ topic: generalTopic }),
          },
        )
        setExtractedVerseData(buildLectureVerseData("general", generalTopic, data))
      } else if (talkType === "festival") {
        const data = await fetchJson<{ overview: string; keyPoints: string[] }>(
          "/api/lecture/festival",
          {
            method: "POST",
            body: JSON.stringify({ festivalName }),
          },
        )
        setExtractedVerseData(buildLectureVerseData("festival", festivalName, data))
      } else if (talkType === "yatra") {
        const data = await fetchJson<{ overview: string; keyPoints: string[] }>(
          "/api/lecture/yatra",
          {
            method: "POST",
            body: JSON.stringify({ location: yatraLocation }),
          },
        )
        setExtractedVerseData(buildLectureVerseData("yatra", yatraLocation, data))
      }

      setActiveStep(1)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch context"
      setContextError(message)
    } finally {
      setIsFetchingContext(false)
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
        const parsedDemoResponse = parseBackendChatResponse(ENVY_DEMO_RESPONSE)

        if (parsedDemoResponse) {
          setMessages((previousMessages) => [
            ...previousMessages,
            {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content: parsedDemoResponse.cleanAnswer,
              citations: parsedDemoResponse.citations,
            },
          ])
          return
        }
      }

      const response = await askChatQuestion(newUserMessage.content)
      const parsedResponse = parseBackendChatResponse(response)

      if (!parsedResponse) {
        throw new Error("Malformed chat response")
      }

      setMessages((previousMessages) => [
        ...previousMessages,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: parsedResponse.cleanAnswer,
          citations: parsedResponse.citations,
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

  function handleSaveSnippet(content: string) {
    setSavedSnippets((previousSnippets) => {
      if (previousSnippets.some((snippet) => snippet.content === content)) {
        return previousSnippets
      }

      return [...previousSnippets, { id: Date.now().toString(), content }]
    })
  }

  function handleRemoveSnippet(id: string) {
    setSavedSnippets((previousSnippets) =>
      previousSnippets.filter((snippet) => snippet.id !== id),
    )
  }

  async function handleGenerateNotebook() {
    if (savedSnippets.length === 0) {
      return
    }

    setIsGeneratingNotebook(true)
    const nextNotebookName = notebookName.trim() || "Untitled Workspace"

    if (!notebookName.trim()) {
      setNotebookName(nextNotebookName)
    }

    window.setTimeout(() => {
      setGeneratedNotebookId(`nb_${Date.now()}`)
      setIsGeneratingNotebook(false)
      setActiveStep(3)
    }, 2500)
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
          content: savedSnippets.map((snippet) => snippet.content).join("\n\n"),
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

  function applySessionState(sessionState: SessionState) {
    setActiveStep(sessionState.activeStep)
    setTalkType(sessionState.talkType)
    setVerseDetails(sessionState.verseDetails)
    setGeneralTopic(sessionState.generalTopic)
    setFestivalName(sessionState.festivalName)
    setYatraLocation(sessionState.yatraLocation)
    setExtractedVerseData(sessionState.extractedVerseData)
    setMessages(sessionState.messages)
    setSavedSnippets(sessionState.savedSnippets)
    setNotebookName(sessionState.notebookName)
    setGeneratedNotebookId(sessionState.generatedNotebookId)
    setGeneratedSlides(sessionState.generatedSlides)
    setInputMessage("")
    setContextError(null)
    setActiveCitation(null)
    setIsContextModalOpen(false)
    setCurrentSlideIndex(0)
  }

  function loadSession(session: Session) {
    setCurrentSessionId(session.id)
    applySessionState(session.state)
    setIsHistoryOpen(false)
  }

  function startNewSession() {
    setCurrentSessionId(createSessionId())
    applySessionState(createEmptySessionState())
    setIsHistoryOpen(false)
  }

  return (
    <div className="flex h-screen bg-[#FAFAFA] text-zinc-900 font-sans overflow-hidden">
      <PipelineSidebar
        activeStep={activeStep}
        hasExtractedContext={Boolean(extractedVerseData)}
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
              messages={messages}
              inputMessage={inputMessage}
              savedSnippets={savedSnippets}
              isChatting={isChatting}
              messagesEndRef={messagesEndRef}
              onBackToContext={() => setActiveStep(0)}
              onOpenContext={() => setIsContextModalOpen(true)}
              onInputMessageChange={setInputMessage}
              onSendMessage={handleSendMessage}
              onSaveSnippet={handleSaveSnippet}
              onRemoveSnippet={handleRemoveSnippet}
              onProceedToSynthesis={() => setActiveStep(2)}
              onSelectCitation={setActiveCitation}
            />
          )}

          {activeStep === 2 && (
            <SynthesisStep
              notebookName={notebookName}
              savedSnippets={savedSnippets}
              lectureDuration={lectureDuration}
              wordCount={wordCount}
              requiredWordCount={requiredWordCount}
              isGeneratingNotebook={isGeneratingNotebook}
              onNotebookNameChange={setNotebookName}
              onRemoveSnippet={handleRemoveSnippet}
              onBackToChat={() => setActiveStep(1)}
              onGenerateNotebook={handleGenerateNotebook}
            />
          )}

          {activeStep === 3 && (
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
        citation={activeCitation}
        onClose={() => setActiveCitation(null)}
        onSaveSnippet={handleSaveSnippet}
      />

      <HistoryModal
        isOpen={isHistoryOpen}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onClose={() => setIsHistoryOpen(false)}
        onStartNewSession={startNewSession}
        onLoadSession={loadSession}
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
