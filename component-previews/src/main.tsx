import { StrictMode, useEffect, type ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, ToastProvider } from '@librechat/client'
import './i18n'
import './style.css'

const modules = import.meta.glob<{ default: ComponentType }>('./examples/**/*.tsx', {
  eager: true,
})

/** `./examples/button/variants.tsx` is addressed as `button/variants`. */
const examples = Object.fromEntries(
  Object.entries(modules).map(([path, mod]) => [
    path.replace('./examples/', '').replace(/\.tsx$/, ''),
    mod.default,
  ]),
)

const params = new URLSearchParams(window.location.search)
const name = params.get('example') ?? ''
const mode = params.get('mode') === 'dark' ? 'dark' : 'light'
const dir = params.get('dir') === 'rtl' ? 'rtl' : 'ltr'
document.documentElement.dir = dir

/** Reports the content height so the docs page can size the iframe to fit. */
function useReportHeight() {
  useEffect(() => {
    const send = () =>
      window.parent.postMessage(
        { type: 'librechat-preview-height', example: name, height: document.body.scrollHeight },
        '*',
      )
    const observer = new ResizeObserver(send)
    observer.observe(document.body)
    send()
    return () => observer.disconnect()
  }, [])
}

function Preview() {
  useReportHeight()
  const Example = examples[name]
  return (
    <ThemeProvider initialTheme={mode}>
      <ToastProvider>
        <main className="bg-surface-primary text-text-primary flex min-h-24 items-center justify-center p-8">
          {Example ? (
            <Example />
          ) : (
            <p className="text-text-secondary text-sm">Unknown example: {name}</p>
          )}
        </main>
      </ToastProvider>
    </ThemeProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
)
