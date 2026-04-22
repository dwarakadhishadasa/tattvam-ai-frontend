import {
  ArrowUpRight,
  ChevronRight,
  CheckCircle2,
  Clock3,
  EllipsisVertical,
  FileStack,
  MessageSquareText,
  NotebookPen,
  Paperclip,
  Play,
  Plus,
  Search,
  SendHorizontal,
  Sparkles,
} from "lucide-react"

type NoteCard = {
  title: string
  kind: "Saved note" | "Citation" | "Outline"
  excerpt: string
  active?: boolean
}

const notes: NoteCard[] = [
  {
    title: "Opening emotional frame",
    kind: "Saved note",
    excerpt:
      "Start with belonging, not logistics. Make the yatra feel lived before it is explained.",
    active: true,
  },
  {
    title: "Govardhan citation excerpt",
    kind: "Citation",
    excerpt:
      "Use the shared walking intention line to ground the talk in devotional movement.",
  },
  {
    title: "Audience context",
    kind: "Outline",
    excerpt:
      "Mixed audience: devotees plus first-time guests. Warm, inviting, low-jargon tone.",
  },
  {
    title: "Closing invitation",
    kind: "Saved note",
    excerpt:
      "Offer one concrete next step: join, invite, or begin preparing inwardly.",
  },
]

const answerSections = [
  {
    heading: "A stronger opening",
    body:
      "Begin by making the invitation feel personal and shared. The listener should feel that this is not just an event announcement, but an opening into a sacred experience people enter together.",
  },
  {
    heading: "What to emphasize",
    body:
      "Keep the emotional center on devotion, shared movement, and anticipation. Save logistics for later. The first minute should answer why this matters before it explains what happens.",
  },
]

const attachedNotebooks = [
  { label: "Govardhan Notes", tone: "bg-amber-100 text-amber-900" },
  { label: "Citations", tone: "bg-sky-100 text-sky-900" },
  { label: "Invite Outline", tone: "bg-emerald-100 text-emerald-900" },
]

const previousSlideDecks = [
  {
    title: "Govardhan Yatra Invitation",
    meta: "18 notes · 2d ago",
  },
  {
    title: "Janmashtami Youth Talk",
    meta: "23 notes · 5d ago",
  },
  {
    title: "Bhagavad Gita 2.47 Study Circle",
    meta: "9 notes · 1w ago",
  },
]

export function WorkspaceConceptPage() {
  return (
    <main className="h-screen overflow-hidden bg-[#f5f2eb] text-stone-900">
      <div className="mx-auto flex h-full max-w-[1820px] flex-col px-2 py-2 sm:px-3 sm:py-3">
        <div className="flex items-center justify-between rounded-[22px] border border-stone-200 bg-white px-4 py-3 shadow-[0_10px_36px_rgba(60,40,10,0.05)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-900 text-white">
              <NotebookPen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">
                Tattvam AI
              </p>
              <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
                Govardhan Yatra Invitation
              </h1>
            </div>
          </div>

          <div className="hidden items-center gap-3 sm:flex">
            <div className="rounded-full bg-stone-100 px-3 py-1.5 text-sm text-stone-600">
              Last updated 2 min ago
            </div>
            <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm text-emerald-800 ring-1 ring-emerald-200">
              <CheckCircle2 className="h-4 w-4" />
              Saved
            </div>
          </div>
        </div>

        <div className="mt-3 grid min-h-0 flex-1 gap-3 xl:grid-cols-[280px_minmax(0,1fr)_312px]">
          <aside className="flex min-h-0 flex-col overflow-hidden rounded-[24px] border border-stone-200 bg-white shadow-[0_10px_36px_rgba(60,40,10,0.05)]">
            <div className="border-b border-stone-200 px-5 py-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
                    Left panel
                  </p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight">Notes</h2>
                </div>
                <button className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-900 text-white">
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-stone-100 px-3 py-3 text-sm text-stone-500">
                <Search className="h-4 w-4" />
                Search notes
              </div>
            </div>

            <div className="min-h-0 space-y-3 overflow-y-auto p-4 hide-scrollbar">
              {notes.map((note) => (
                <button
                  key={note.title}
                  className={`w-full rounded-[22px] border p-4 text-left transition-colors ${
                    note.active
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-stone-200 bg-stone-50 hover:bg-stone-100"
                  }`}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                          note.active
                            ? "bg-white/12 text-stone-100"
                            : "bg-white text-stone-500 ring-1 ring-stone-200"
                        }`}
                      >
                        {note.kind}
                      </span>
                      <p className="mt-3 text-sm font-semibold tracking-tight">{note.title}</p>
                    </div>
                    <ArrowUpRight
                      className={`h-4 w-4 shrink-0 ${
                        note.active ? "text-stone-200" : "text-stone-400"
                      }`}
                    />
                  </div>
                  <p
                    className={`mt-3 text-sm leading-6 ${
                      note.active ? "text-stone-200" : "text-stone-600"
                    }`}
                  >
                    {note.excerpt}
                  </p>
                </button>
              ))}
            </div>
          </aside>

          <section className="flex min-h-0 flex-col overflow-hidden rounded-[24px] border border-stone-200 bg-white shadow-[0_10px_36px_rgba(60,40,10,0.05)]">
            <div className="border-b border-stone-200 px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
                    Center panel
                  </p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight">Chat</h2>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1.5 text-sm text-stone-600">
                  <MessageSquareText className="h-4 w-4" />
                  Ask from your notebook
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 hide-scrollbar">
              <div className="space-y-5">
              <div className="max-w-[75%] rounded-[24px] bg-stone-100 px-5 py-4">
                <p className="text-sm font-medium text-stone-500">You</p>
                <p className="mt-2 text-[15px] leading-7 text-stone-800">
                  Help me craft a warmer opening for this yatra invitation without sounding too
                  promotional.
                </p>
              </div>

              <div className="rounded-[28px] border border-stone-200 bg-[#fcfbf8] p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-900 text-white">
                    <Sparkles className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold tracking-tight text-stone-950">Notebook answer</p>
                    <p className="text-sm text-stone-500">
                      Grounded in your saved notes and citations
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {answerSections.map((section) => (
                    <div key={section.heading}>
                      <h3 className="text-base font-semibold tracking-tight text-stone-950">
                        {section.heading}
                      </h3>
                      <p className="mt-2 text-[15px] leading-7 text-stone-700">{section.body}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white px-3 py-1.5 text-sm text-stone-600 ring-1 ring-stone-200">
                    Note 1
                  </span>
                  <span className="rounded-full bg-white px-3 py-1.5 text-sm text-stone-600 ring-1 ring-stone-200">
                    Note 2
                  </span>
                  <span className="rounded-full bg-white px-3 py-1.5 text-sm text-stone-600 ring-1 ring-stone-200">
                    Citation
                  </span>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white">
                    Save to note
                  </button>
                  <button className="rounded-full bg-white px-4 py-2 text-sm font-medium text-stone-700 ring-1 ring-stone-200">
                    Refine answer
                  </button>
                </div>
              </div>
              </div>
            </div>

            <div className="border-t border-stone-200 px-4 py-4 sm:px-5">
              <div className="rounded-[28px] border border-stone-200 bg-white p-3 shadow-[0_8px_24px_rgba(60,40,10,0.04)]">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <button className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-900 text-white">
                    <Plus className="h-4.5 w-4.5" />
                  </button>

                  {attachedNotebooks.map((item) => (
                    <span
                      key={item.label}
                      className={`inline-flex items-center rounded-full px-3 py-2 text-sm font-medium ${item.tone}`}
                    >
                      {item.label}
                    </span>
                  ))}

                  <button className="inline-flex items-center rounded-full bg-stone-100 px-3 py-2 text-sm font-medium text-stone-600">
                    + Add notebook
                  </button>
                </div>

                <div className="flex items-end gap-3">
                  <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-600">
                    <Paperclip className="h-4.5 w-4.5" />
                  </button>

                  <div className="min-h-[52px] flex-1 rounded-[22px] bg-stone-50 px-4 py-3 text-[15px] leading-7 text-stone-500 ring-1 ring-stone-200">
                    Ask from the selected notebooks in this workspace
                  </div>

                  <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-900 text-white">
                    <SendHorizontal className="h-4.5 w-4.5" />
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                  <span className="rounded-full bg-stone-100 px-2.5 py-1">Deep research</span>
                  <span className="rounded-full bg-stone-100 px-2.5 py-1">Notebook-grounded</span>
                  <span className="rounded-full bg-stone-100 px-2.5 py-1">Use citations</span>
                </div>
              </div>
            </div>
          </section>

          <aside className="flex min-h-0 flex-col overflow-hidden rounded-[24px] border border-stone-200 bg-white shadow-[0_10px_36px_rgba(60,40,10,0.05)]">
            <div className="border-b border-stone-200 px-5 py-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">Studio</h2>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-100 text-stone-700">
                  <FileStack className="h-4.5 w-4.5" />
                </div>
              </div>
            </div>

            <div className="min-h-0 space-y-3 overflow-y-auto p-4 hide-scrollbar">
              <section className="space-y-4">
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-[20px] border border-[#ddd7c4] bg-[#ebe6d4] px-4 py-4 text-left transition-colors hover:bg-[#e7e1cd]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 text-stone-700">
                      <FileStack className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold tracking-tight text-stone-950">
                        Slide Deck
                      </p>
                      <p className="mt-1 text-sm text-stone-600">Generate slide deck</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4.5 w-4.5 text-stone-700" />
                </button>
              </section>

              <div className="border-t border-stone-200 pt-4" />

              <section className="space-y-1">
                {previousSlideDecks.map((deck) => (
                  <div
                    key={deck.title}
                    className="flex w-full items-center gap-3 rounded-[18px] px-2 py-3 text-left transition-colors hover:bg-stone-50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-stone-100 text-stone-700">
                      <FileStack className="h-4.5 w-4.5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold tracking-tight text-stone-950">
                        {deck.title}
                      </p>
                      <p className="mt-1 text-sm text-stone-500">{deck.meta}</p>
                    </div>

                    <button
                      type="button"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600"
                    >
                      <Play className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100"
                    >
                      <EllipsisVertical className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </section>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
