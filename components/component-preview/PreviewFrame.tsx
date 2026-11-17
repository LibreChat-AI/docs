'use client'

import { useEffect, useRef, useState } from 'react'

/** The preview app answers with this message whenever its content changes size. */
type HeightMessage = { type: 'librechat-preview-height'; example: string; height: number }

function isHeightMessage(data: unknown, example: string): data is HeightMessage {
  if (typeof data !== 'object' || data === null) return false
  const message = data as Partial<HeightMessage>
  return (
    message.type === 'librechat-preview-height' &&
    message.example === example &&
    typeof message.height === 'number'
  )
}

/** Follows the docs theme, which Fumadocs applies as a `dark` class on the root element. */
function useDocsMode(): 'light' | 'dark' | null {
  const [mode, setMode] = useState<'light' | 'dark' | null>(null)
  useEffect(() => {
    const root = document.documentElement
    const read = () => setMode(root.classList.contains('dark') ? 'dark' : 'light')
    read()
    const observer = new MutationObserver(read)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  return mode
}

export function PreviewFrame({
  example,
  title,
  minHeight = 0,
}: {
  example: string
  title: string
  /** Room for what the example opens (a list or a dialog), which its resting height lacks. */
  minHeight?: number
}) {
  const mode = useDocsMode()
  const frame = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(Math.max(160, minHeight))

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return
      if (isHeightMessage(event.data, example)) {
        setHeight(Math.max(Math.ceil(event.data.height), minHeight))
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [example, minHeight])

  /** The mode is only known on the client; holding the frame back until then avoids loading
   *  it twice, once in the wrong mode. */
  if (mode == null) {
    return <div style={{ height }} aria-hidden="true" />
  }

  const src = `/component-previews/index.html?example=${encodeURIComponent(example)}&mode=${mode}`

  return (
    <iframe
      ref={frame}
      key={mode}
      src={src}
      title={title}
      loading="lazy"
      className="block w-full border-0"
      style={{ height }}
    />
  )
}
