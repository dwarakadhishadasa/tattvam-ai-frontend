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
  createEmptySlideDeckState,
  createFailedSlideDeckState,
  getNextSlideDeckPollAt,
  isSlideDeckJobActive,
  mergeSlideDeckJobIntoSessionState,
  SLIDE_DECK_POLL_INTERVAL_MS,
} from "@/components/pipeline/slideDeck"
import { shouldAutoScrollToLatestMessage } from "@/components/pipeline/chatScroll"
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
  updateNotebookEntryContent,
} from "@/components/pipeline/utils"
import { useSessionPersistence } from "@/hooks/useSessionPersistence"
import { ENVY_DEMO_RESPONSE } from "@/lib/chat/demo-response"
import { streamChatQuestion } from "@/lib/chat/client"
import { normalizeDownstreamChatResponse } from "@/lib/chat/normalize"
import {
  formatAssistantAnswer,
  stripCitationAppendix,
  type Citation,
} from "@/lib/chat/shared"
import type { SlideDeckJobResponse } from "@/lib/slides/shared"
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
  const previousMessageCountRef = useRef(messages.length)
  const contextRequestIdRef = useRef(0)
  const previousSlideDeckStateRef = useRef<SessionState["slideDeckState"]>("idle")
  const [activeCitation, setActiveCitation] = useState<ActiveCitationSelection | null>(null)

  const [notebookName, setNotebookName] = useState("")
  const [activeNotebookEntryId, setActiveNotebookEntryId] = useState<string | null>(null)
  const [isGeneratingNotebook, setIsGeneratingNotebook] = useState(false)
  const [notebookGenerationError, setNotebookGenerationError] = useState<string | null>(null)
  const [generatedNotebookId, setGeneratedNotebookId] = useState<string | null>(null)
  const [lectureDuration, setLectureDuration] = useState(DEFAULT_LECTURE_DURATION)

  const [slideImage, setSlideImage] = useState<string | null>(null)
  const [extractedStyle, setExtractedStyle] = useState("")
  const [generatedSlides, setGeneratedSlides] = useState("")
  const [isStartingSlideDeck, setIsStartingSlideDeck] = useState(false)
  const [slideDeckTaskId, setSlideDeckTaskId] = useState<string | null>(null)
  const [slideDeckState, setSlideDeckState] = useState<SessionState["slideDeckState"]>("idle")
  const [slideDeckError, setSlideDeckError] = useState<string | null>(null)
  const [slideDeckErrorCode, setSlideDeckErrorCode] = useState<string | null>(null)
  const [slideDeckRequestedAt, setSlideDeckRequestedAt] = useState<number | null>(null)
  const [slideDeckLastCheckedAt, setSlideDeckLastCheckedAt] = useState<number | null>(null)
  const [slideDeckCompletedAt, setSlideDeckCompletedAt] = useState<number | null>(null)

  const [isContextModalOpen, setIsContextModalOpen] = useState(false)

  const [isHistoryOpen, setIsHistoryOpen] = useState(false)

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
      slideDeckTaskId,
      slideDeckState,
      slideDeckError,
      slideDeckErrorCode,
      slideDeckRequestedAt,
      slideDeckLastCheckedAt,
      slideDeckCompletedAt,
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
      slideDeckTaskId,
      slideDeckState,
      slideDeckError,
      slideDeckErrorCode,
      slideDeckRequestedAt,
      slideDeckLastCheckedAt,
      slideDeckCompletedAt,
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
    setSlideDeckTaskId(sessionState.slideDeckTaskId)
    setSlideDeckState(sessionState.slideDeckState)
    setSlideDeckError(sessionState.slideDeckError)
    setSlideDeckErrorCode(sessionState.slideDeckErrorCode)
    setSlideDeckRequestedAt(sessionState.slideDeckRequestedAt)
    setSlideDeckLastCheckedAt(sessionState.slideDeckLastCheckedAt)
    setSlideDeckCompletedAt(sessionState.slideDeckCompletedAt)
    setInputMessage("")
    setContextError(null)
    setNotebookGenerationError(null)
    setActiveCitation(null)
    setIsContextModalOpen(false)
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
    const shouldAutoScroll = shouldAutoScrollToLatestMessage(
      previousMessageCountRef.current,
      messages,
    )
    previousMessageCountRef.current = messages.length

    if (!shouldAutoScroll) {
      return
    }

    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

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

  const applySlideDeckState = useCallback(
    (nextState: ReturnType<typeof createEmptySlideDeckState>) => {
      setSlideDeckTaskId(nextState.slideDeckTaskId)
      setSlideDeckState(nextState.slideDeckState)
      setSlideDeckError(nextState.slideDeckError)
      setSlideDeckErrorCode(nextState.slideDeckErrorCode)
      setSlideDeckRequestedAt(nextState.slideDeckRequestedAt)
      setSlideDeckLastCheckedAt(nextState.slideDeckLastCheckedAt)
      setSlideDeckCompletedAt(nextState.slideDeckCompletedAt)
    },
    [],
  )

  const clearSlideDeckState = useCallback(() => {
    applySlideDeckState(createEmptySlideDeckState())
  }, [applySlideDeckState])

  const applySlideDeckJobResult = useCallback(
    (job: SlideDeckJobResponse["job"], checkedAt: number) => {
      applySlideDeckState(
        mergeSlideDeckJobIntoSessionState(
          {
            slideDeckTaskId,
            slideDeckState,
            slideDeckError,
            slideDeckErrorCode,
            slideDeckRequestedAt,
            slideDeckLastCheckedAt,
            slideDeckCompletedAt,
          },
          job,
          checkedAt,
        ),
      )
    },
    [
      applySlideDeckState,
      slideDeckCompletedAt,
      slideDeckError,
      slideDeckErrorCode,
      slideDeckLastCheckedAt,
      slideDeckRequestedAt,
      slideDeckState,
      slideDeckTaskId,
    ],
  )

  const canBuildPowerPoint = useMemo(
    () => Boolean(generatedNotebookId && extractedStyle.trim()),
    [generatedNotebookId, extractedStyle],
  )

  const nextSlideDeckPollAt = useMemo(
    () => getNextSlideDeckPollAt(slideDeckRequestedAt, slideDeckLastCheckedAt),
    [slideDeckLastCheckedAt, slideDeckRequestedAt],
  )

  const requestedAtLabel = useMemo(
    () => formatTimestamp(slideDeckRequestedAt),
    [slideDeckRequestedAt],
  )
  const lastCheckedAtLabel = useMemo(
    () => formatTimestamp(slideDeckLastCheckedAt),
    [slideDeckLastCheckedAt],
  )
  const nextCheckAtLabel = useMemo(
    () => formatTimestamp(nextSlideDeckPollAt),
    [nextSlideDeckPollAt],
  )
  const completedAtLabel = useMemo(
    () => formatTimestamp(slideDeckCompletedAt),
    [slideDeckCompletedAt],
  )

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
    const question = inputMessage.trim()

    if (!question) {
      return
    }

    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: question,
    }

    setMessages((previousMessages) => [...previousMessages, newUserMessage])
    setInputMessage("")
    setIsChatting(true)

    try {
      if (question.toLowerCase().includes("envy")) {
        const parsedDemoResponse = normalizeDownstreamChatResponse(ENVY_DEMO_RESPONSE)

        if (parsedDemoResponse) {
          setMessages((previousMessages) => [
            ...previousMessages,
            {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content: formatAssistantAnswer(parsedDemoResponse.result.answerBody),
              citations: parsedDemoResponse.result.citations,
              status: "complete",
            },
          ])
          return
        }
      }

      await streamChatQuestion(question, {
        onTargetCompleted: (event) => {
          setMessages((previousMessages) =>
            upsertTargetAssistantMessage(previousMessages, {
              id: `${newUserMessage.id}:${event.target.key}`,
              role: "assistant",
              content: formatAssistantAnswer(event.result.answerBody),
              citations: event.result.citations,
              targetKey: event.target.key,
              targetLabel: event.target.label,
              status: "complete",
            }),
          )
        },
        onTargetFailed: (event) => {
          setMessages((previousMessages) =>
            upsertTargetAssistantMessage(previousMessages, {
              id: `${newUserMessage.id}:${event.target.key}`,
              role: "assistant",
              content: event.error,
              targetKey: event.target.key,
              targetLabel: event.target.label,
              status: "error",
            }),
          )
        },
      })
    } catch (error) {
      console.error("Chat error:", error)
      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : "Error connecting to the AI."
      setMessages((previousMessages) => [
        ...previousMessages,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: message,
          status: "error",
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
      const sourceText = buildNotebookCompileSource(savedSnippets)

      const data = await fetchJson<CreateNotebookResponse>("/api/notebooks", {
        method: "POST",
        body: JSON.stringify({
          title: nextNotebookName,
          sourceText,
        }),
      })

      setNotebookName(data.notebook.title)
      setGeneratedNotebookId(data.notebook.id)
      setGeneratedSlides("")
      clearSlideDeckState()
      setIsGeneratingNotebook(false)
      setActiveNotebookEntryId(null)
      setActiveStep(2)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create notebook"
      setNotebookGenerationError(message)
      setIsGeneratingNotebook(false)
    }
  }

  async function handleBuildPowerPoint() {
    if (!generatedNotebookId || !extractedStyle.trim() || isStartingSlideDeck) {
      return
    }

    const requestedAt = Date.now()
    setIsStartingSlideDeck(true)
    setGeneratedSlides("")
    clearSlideDeckState()

    try {
      const data = await fetchJson<SlideDeckJobResponse>("/api/slides/jobs", {
        method: "POST",
        body: JSON.stringify({
          notebookId: generatedNotebookId,
          instructions: extractedStyle.trim(),
        }),
      })

      applySlideDeckState({
        ...mergeSlideDeckJobIntoSessionState(createEmptySlideDeckState(), data.job, Date.now()),
        slideDeckRequestedAt: requestedAt,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start PowerPoint build"
      applySlideDeckState(
        createFailedSlideDeckState(message, null, requestedAt, Date.now(), null),
      )
    } finally {
      setIsStartingSlideDeck(false)
    }
  }

  const pollSlideDeckJob = useCallback(async () => {
    if (!generatedNotebookId || !slideDeckTaskId) {
      return
    }

    const checkedAt = Date.now()

    try {
      const data = await fetchJson<SlideDeckJobResponse>(
        `/api/slides/jobs/${encodeURIComponent(generatedNotebookId)}/${encodeURIComponent(slideDeckTaskId)}`,
      )
      applySlideDeckJobResult(data.job, checkedAt)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to check PowerPoint build"
      applySlideDeckState(
        createFailedSlideDeckState(
          message,
          slideDeckErrorCode,
          slideDeckRequestedAt,
          checkedAt,
          slideDeckTaskId,
        ),
      )
    }
  }, [
    applySlideDeckJobResult,
    applySlideDeckState,
    generatedNotebookId,
    slideDeckErrorCode,
    slideDeckRequestedAt,
    slideDeckTaskId,
  ])

  useEffect(() => {
    if (!isSlideDeckJobActive(slideDeckState) || !generatedNotebookId || !slideDeckTaskId) {
      return
    }

    void pollSlideDeckJob()

    const pollInterval = window.setInterval(() => {
      void pollSlideDeckJob()
    }, SLIDE_DECK_POLL_INTERVAL_MS)

    return () => window.clearInterval(pollInterval)
  }, [generatedNotebookId, pollSlideDeckJob, slideDeckState, slideDeckTaskId])

  useEffect(() => {
    const previousState = previousSlideDeckStateRef.current

    if (
      (previousState === "pending" || previousState === "inProgress") &&
      slideDeckState === "completed" &&
      typeof window !== "undefined" &&
      "Notification" in window &&
      document.visibilityState === "hidden" &&
      Notification.permission === "granted"
    ) {
      new Notification("PowerPoint ready", {
        body: notebookName
          ? `Your PPTX deck for "${notebookName}" is ready to download.`
          : "Your PPTX deck is ready to download.",
      })
    }

    previousSlideDeckStateRef.current = slideDeckState
  }, [notebookName, slideDeckState])

  function handleDownloadPowerPoint() {
    if (!generatedNotebookId || !slideDeckTaskId || slideDeckState !== "completed") {
      return
    }

    window.location.assign(
      `/api/slides/jobs/${encodeURIComponent(generatedNotebookId)}/${encodeURIComponent(slideDeckTaskId)}/download`,
    )
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
              slideDeckTaskId={slideDeckTaskId}
              slideDeckState={slideDeckState}
              slideDeckError={slideDeckError}
              slideDeckErrorCode={slideDeckErrorCode}
              requestedAtLabel={requestedAtLabel}
              lastCheckedAtLabel={lastCheckedAtLabel}
              nextCheckAtLabel={nextCheckAtLabel}
              completedAtLabel={completedAtLabel}
              isStartingSlideDeck={isStartingSlideDeck}
              canBuildPowerPoint={canBuildPowerPoint}
              onBuildPowerPoint={handleBuildPowerPoint}
              onRetryBuild={handleBuildPowerPoint}
              onDownloadPowerPoint={handleDownloadPowerPoint}
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

function upsertTargetAssistantMessage(messages: Message[], nextMessage: Message): Message[] {
  const existingIndex = messages.findIndex((message) => message.id === nextMessage.id)

  if (existingIndex === -1) {
    return [...messages, nextMessage]
  }

  const updatedMessages = [...messages]
  updatedMessages[existingIndex] = nextMessage
  return updatedMessages
}

function formatTimestamp(value: number | null): string | null {
  if (value === null) {
    return null
  }

  return new Date(value).toLocaleString()
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
