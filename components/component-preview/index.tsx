import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ServerCodeBlock } from 'fumadocs-ui/components/codeblock.rsc'
import { PreviewFrame } from './PreviewFrame'

const EXAMPLES_DIR = join(process.cwd(), 'component-previews', 'src', 'examples')

/**
 * A live `@librechat/client` example and the source that renders it. The example runs in
 * the separately built preview app (`component-previews/`), inside an iframe, so the
 * package's Tailwind theme and peer dependencies never reach the docs. The code shown is
 * read from the same file, so it is always the code that runs.
 */
export async function ComponentPreview({
  example,
  title,
  minHeight,
}: {
  example: string
  title: string
  /** Minimum frame height in pixels, for examples that open a list or a dialog. */
  minHeight?: number
}) {
  if (!/^[a-z0-9-]+\/[a-z0-9-]+$/.test(example)) {
    throw new Error(`ComponentPreview: invalid example name "${example}"`)
  }
  const code = await readFile(join(EXAMPLES_DIR, `${example}.tsx`), 'utf8')
  return (
    <figure className="not-prose my-6 overflow-hidden rounded-xl border border-fd-border">
      <PreviewFrame example={example} title={title} minHeight={minHeight} />
      <div className="border-t border-fd-border [&_figure]:my-0 [&_figure]:rounded-none [&_figure]:border-0">
        <ServerCodeBlock code={code.trimEnd()} lang="tsx" />
      </div>
    </figure>
  )
}
