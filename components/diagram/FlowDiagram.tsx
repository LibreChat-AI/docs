import { Children, isValidElement, type ReactNode } from 'react'
import { ArrowLeftRight, ArrowRight } from 'lucide-react'
import { resolveIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'

/**
 * A left-to-right flow of labelled nodes for architecture explanations in MDX.
 *
 * Every visible string is passed through the `title`, `label`, `summary` and
 * `heading` attributes, which the docs translation pipeline already localizes
 * (see lib/i18n/segment.ts), so translated pages get translated diagrams.
 *
 * The nodes render as an ordered list so screen readers announce the order and
 * count; the arrows between them are decorative. On narrow screens the flow
 * stacks vertically and the arrows rotate to point down.
 */

type Direction = 'forward' | 'both'

export function FlowNode({
  icon,
  title,
  label,
  muted = false,
}: {
  icon?: string
  title: string
  label?: string
  muted?: boolean
}) {
  const iconElement = resolveIcon(icon)
  return (
    <div
      className={cn(
        'flex h-full flex-col items-center gap-2 rounded-lg border p-4 text-center',
        muted ? 'border-dashed border-fd-border bg-transparent' : 'border-fd-border bg-fd-card',
      )}
    >
      {iconElement && (
        <span
          aria-hidden="true"
          className={cn(
            '[&>svg]:h-6 [&>svg]:w-6',
            muted ? 'text-fd-muted-foreground' : 'text-fd-foreground',
          )}
        >
          {iconElement}
        </span>
      )}
      <span className="text-sm font-medium leading-tight text-fd-foreground">{title}</span>
      {label && <span className="text-xs leading-snug text-fd-muted-foreground">{label}</span>}
    </div>
  )
}

function Connector({ direction }: { direction: Direction }) {
  const Icon = direction === 'both' ? ArrowLeftRight : ArrowRight
  return (
    <Icon
      aria-hidden="true"
      className="h-5 w-5 shrink-0 rotate-90 self-center text-fd-muted-foreground sm:rotate-0"
    />
  )
}

export function FlowDiagram({
  summary,
  heading,
  direction = 'forward',
  children,
}: {
  /** Read by screen readers as the name of the list of steps. */
  summary: string
  /** Optional visible caption under the diagram. */
  heading?: string
  direction?: Direction
  children: ReactNode
}) {
  const nodes = Children.toArray(children).filter(isValidElement)
  return (
    <figure className="not-prose my-8">
      <div className="rounded-xl border border-fd-border bg-fd-card/40 p-4 sm:p-6">
        <ol aria-label={summary} className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          {nodes.map((node, index) => (
            <li
              key={index}
              className="flex flex-1 flex-col items-stretch gap-3 sm:flex-row sm:items-stretch"
            >
              {index > 0 && <Connector direction={direction} />}
              <div className="flex-1">{node}</div>
            </li>
          ))}
        </ol>
      </div>
      {heading && (
        <figcaption className="mt-3 text-center text-sm text-fd-muted-foreground">
          {heading}
        </figcaption>
      )}
    </figure>
  )
}
