import { getYouTubeEmbedUrl } from "@/lib/youtube"

type YouTubeEmbedProps = {
  url: string
}

export function YouTubeEmbed({ url }: YouTubeEmbedProps) {
  const src = getYouTubeEmbedUrl(url)

  if (!src) {
    return null
  }

  return (
    <div className="my-4 aspect-video w-full overflow-hidden rounded-xl border border-zinc-200 shadow-sm">
      <iframe
        width="100%"
        height="100%"
        src={src}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}
