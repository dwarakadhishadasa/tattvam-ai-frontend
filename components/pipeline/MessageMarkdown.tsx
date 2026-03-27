import type { Citation } from "@/lib/chat/shared"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { YouTubeEmbed } from "@/components/pipeline/YouTubeEmbed"

type MessageMarkdownProps = {
  content: string
  citations?: Citation[]
  onCitationSelect: (citation: Citation) => void
}

export function MessageMarkdown({
  content,
  citations,
  onCitationSelect,
}: MessageMarkdownProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ ...props }) => {
          const href = props.href
          const isYouTube = href?.includes("youtube.com") || href?.includes("youtu.be")

          if (isYouTube && href) {
            return (
              <>
                <a
                  {...props}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline hover:text-blue-800 transition-colors"
                />
                <YouTubeEmbed url={href} />
              </>
            )
          }

          if (href?.startsWith("#citation-")) {
            return (
              <button
                onClick={(event) => {
                  event.preventDefault()
                  const citationId = href.substring(10)
                  const citation = citations?.find((item) => item.number.toString() === citationId)

                  if (citation) {
                    onCitationSelect(citation)
                  }
                }}
                className="mx-[1px] cursor-pointer align-super text-[10px] font-medium text-zinc-400 transition-colors hover:text-zinc-800"
              >
                {props.children}
              </button>
            )
          }

          return (
            <a
              {...props}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800 transition-colors"
            />
          )
        },
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
