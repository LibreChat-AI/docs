import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import type * as PageTree from 'fumadocs-core/page-tree'
import { localizedDocsHref } from '@/lib/i18n'
import { docsSource } from '@/lib/source'
import { getUI } from '@/lib/ui-i18n'

// The hub mirrors the Features sidebar: groups come from the separators in
// content/docs/features/meta.json and every card reads its title, icon and
// description from the page's own frontmatter. Adding or translating a page
// updates the hub without touching this file or the UI dictionaries.

const FEATURES_PATH = '/docs/features'

// Pages shown with a screenshot at the top. Images live next to the page's own
// screenshots under public/images/features/<slug>/.
const featured = ['agents', 'mcp', 'artifacts']

type Feature = {
  slug: string
  href: string
  title: ReactNode
  description?: string
  icon?: ReactNode
}

type Group = { id: string; title: ReactNode; items: Feature[] }

function findFeaturesFolder(nodes: PageTree.Node[]): PageTree.Folder | undefined {
  for (const node of nodes) {
    if (node.type !== 'folder') continue
    if (node.index?.url.endsWith(FEATURES_PATH)) return node
    const nested = findFeaturesFolder(node.children)
    if (nested) return nested
  }
  return undefined
}

function slugOf(url: string): string {
  return url.slice(url.lastIndexOf('/') + 1)
}

function collectGroups(lang: string): Group[] {
  const tree = docsSource.getPageTree(lang)
  const folder = findFeaturesFolder(tree.children)
  if (!folder) return []

  const groups: Group[] = []
  for (const node of folder.children) {
    if (node.type === 'separator') {
      groups.push({ id: `group-${groups.length}`, title: node.name, items: [] })
      continue
    }
    if (node.type !== 'page') continue
    if (groups.length === 0) groups.push({ id: 'group-0', title: null, items: [] })
    const slug = slugOf(node.url)
    const page = docsSource.getNodePage(node, lang)
    groups[groups.length - 1].items.push({
      slug,
      href: localizedDocsHref(`${FEATURES_PATH}/${slug}`, lang),
      title: node.name,
      description: page?.data.description,
      icon: node.icon,
    })
  }
  return groups.filter((group) => group.items.length > 0)
}

function FeaturedCard({ feature }: { feature: Feature }) {
  const base = `/images/features/${feature.slug}/overview`
  return (
    <Link
      href={feature.href}
      className="group flex flex-col overflow-hidden rounded-xl border border-fd-border bg-fd-card transition-colors hover:border-fd-foreground/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring"
    >
      <div className="aspect-[16/10] overflow-hidden border-b border-fd-border bg-fd-muted">
        {/* Decorative preview: the card title and description carry the meaning. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${base}-light.png`}
          alt=""
          loading="lazy"
          className="image-light-theme size-full object-cover object-left-top transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${base}-dark.png`}
          alt=""
          loading="lazy"
          className="image-dark-theme size-full object-cover object-left-top transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-fd-foreground [&_svg]:size-4 [&_svg]:text-fd-muted-foreground">
          {feature.icon}
          {feature.title}
        </h3>
        {feature.description && (
          <p className="text-sm leading-relaxed text-fd-muted-foreground">{feature.description}</p>
        )}
      </div>
    </Link>
  )
}

function FeatureLink({ feature }: { feature: Feature }) {
  return (
    <Link
      href={feature.href}
      className="group flex h-full gap-3 rounded-lg border border-fd-border bg-fd-card p-4 transition-colors hover:border-fd-foreground/25 hover:bg-fd-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring"
    >
      <span
        className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-fd-border bg-fd-background text-fd-muted-foreground transition-colors group-hover:text-fd-foreground [&_svg]:size-4"
        aria-hidden="true"
      >
        {feature.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1 text-sm font-medium text-fd-foreground">
          {feature.title}
          <ArrowRight
            className="size-3.5 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </span>
        {feature.description && (
          <span className="mt-1 block text-[13px] leading-snug text-fd-muted-foreground">
            {feature.description}
          </span>
        )}
      </span>
    </Link>
  )
}

export function FeaturesHub({ lang = 'en' }: { lang?: string }) {
  const t = getUI(lang).featuresHub
  const groups = collectGroups(lang)
  const all = groups.flatMap((group) => group.items)
  const featuredItems = featured
    .map((slug) => all.find((item) => item.slug === slug))
    .filter((item): item is Feature => item !== undefined)

  return (
    <nav className="not-prose space-y-10" aria-label={t.ariaLabel}>
      {featuredItems.length > 0 && (
        <section aria-labelledby="features-featured">
          <h2
            id="features-featured"
            className="mb-4 text-xs font-semibold uppercase tracking-widest text-fd-muted-foreground"
          >
            {t.featuredHeading}
          </h2>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredItems.map((feature) => (
              <li key={feature.slug} className="flex">
                <FeaturedCard feature={feature} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {groups.map((group) => (
        <section key={group.id} aria-labelledby={group.title ? group.id : undefined}>
          {group.title && (
            <h2
              id={group.id}
              className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-fd-muted-foreground after:h-px after:flex-1 after:bg-fd-border"
            >
              {group.title}
            </h2>
          )}
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {group.items.map((feature) => (
              <li key={feature.slug}>
                <FeatureLink feature={feature} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  )
}
