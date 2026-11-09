import { useEffect, useRef, useState } from 'react'
import { ExternalLink, PlayCircle, WifiOff } from 'lucide-react'
type Player = { destroy: () => void }
type YouTube = { Player: new (element: HTMLElement, options: object) => Player }
declare global {
  interface Window {
    YT?: YouTube
    onYouTubeIframeAPIReady?: () => void
  }
}
let api: Promise<YouTube> | undefined
function loadApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (api) return api
  api = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      api = undefined
      reject(
        new Error(
          'The player took too long to load. Check your connection or browser privacy settings.',
        ),
      )
    }, 15000)
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timeout)
      previous?.()
      if (window.YT) resolve(window.YT)
    }
    const existing = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]',
    )
    if (!existing) {
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.onerror = () => {
        clearTimeout(timeout)
        api = undefined
        script.remove()
        reject(
          new Error(
            'YouTube could not be reached. Check your connection or try opening the video on YouTube.',
          ),
        )
      }
      document.head.appendChild(script)
    }
  })
  return api
}
export function YouTubePlayer({
  videoId,
  title,
  online,
}: {
  videoId: string
  title: string
  online: boolean
}) {
  const host = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (!online) return
    let cancelled = false
    let player: Player | undefined
    const container = host.current!
    setError('')
    setReady(false)
    void loadApi()
      .then((YT) => {
        if (cancelled) return
        const target = document.createElement('div')
        container.appendChild(target)
        player = new YT.Player(target, {
          width: '100%',
          height: '100%',
          videoId,
          host: 'https://www.youtube-nocookie.com',
          playerVars: { playsinline: 1, rel: 0, origin: location.origin },
          events: {
            onReady: () => {
              if (!cancelled) {
                setReady(true)
                const frame = container.querySelector('iframe')
                if (frame) frame.title = title
              }
            },
            onError: ({ data }: { data: number }) => {
              if (!cancelled)
                setError(
                  data === 100
                    ? 'This video is private or no longer available.'
                    : [101, 150].includes(data)
                      ? 'The creator has disabled embedded playback for this video.'
                      : data === 153
                        ? 'YouTube could not verify this player. Try opening the video on YouTube.'
                        : 'This video could not be played. Try opening it on YouTube.',
                )
            },
          },
        })
      })
      .catch((e) => {
        if (!cancelled) setError(e.message)
      })
    return () => {
      cancelled = true
      player?.destroy()
      container.replaceChildren()
    }
  }, [videoId, title, online])
  return (
    <div className="video-container">
      <div className="video-host" ref={host} />
      {(!online || error || !ready) && (
        <div
          className={`video-message ${ready && !error && online ? 'hidden' : ''}`}
        >
          {!online ? (
            <WifiOff size={35} />
          ) : (
            <PlayCircle size={42} strokeWidth={1.2} />
          )}
          <strong>
            {!online
              ? 'Your lesson will be here when you reconnect.'
              : error
                ? 'A small pause in your learning.'
                : 'Getting your lesson ready…'}
          </strong>
          <p>
            {!online
              ? 'Your notes and progress are still available offline.'
              : error || 'Connecting to the official YouTube player.'}
          </p>
          {online && error && (
            <a
              href={`https://www.youtube.com/watch?v=${videoId}`}
              target="_blank"
              rel="noreferrer"
              className="button button-secondary"
            >
              Watch on YouTube
              <ExternalLink size={15} />
            </a>
          )}
        </div>
      )}
    </div>
  )
}
