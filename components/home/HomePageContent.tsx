import Image from 'next/image'
import Link from 'next/link'
import {
  Bot,
  Terminal,
  Settings2,
  Code,
  Search,
  Plug,
  Brain,
  Globe,
  ShieldCheck,
  FolderKanban,
  BookOpen,
  Network,
  ArrowRight,
  ArrowUpRight,
  Github,
  Star,
  type LucideIcon,
} from 'lucide-react'
import { HomeLayout } from 'fumadocs-ui/layouts/home'
import { baseOptions } from '@/app/layout.config'

import DemoImageDark from '@/components/home/img/demo_dark.png'
import DemoImageLight from '@/components/home/img/demo_light.png'
import DemoImageMobileDark from '@/components/home/img/demo_mobile_dark.png'
import DemoImageMobileLight from '@/components/home/img/demo_mobile_light.png'
import AgentsImageDark from '@/components/home/img/agents-research-dark.webp'
import AgentsImageLight from '@/components/home/img/agents-research-light.webp'
import ArtifactsImageDark from '@/components/home/img/artifacts-project-dark.webp'
import ArtifactsImageLight from '@/components/home/img/artifacts-project-light.webp'
import FooterMenu from '@/components/FooterMenu'
import { Button } from '@/components/ui/button'
import { Marquee } from '@/components/ui/marquee'
import GitHubIcon from '@/components/icons/github'
import Discord from '@/components/icons/discord'
import ProvidersMarquee from '@/components/home/ProvidersMarquee'
import { JsonLd } from '@/components/JsonLd'
import { HomeI18nProvider } from '@/components/HomeI18nProvider'
import { organizationSchema, websiteSchema, softwareApplicationSchema } from '@/lib/structured-data'
import { localizedDocsHref, localizedHomeHref } from '@/lib/i18n'
import { getUI, fmt, type UIStrings } from '@/lib/ui-i18n'

type HomeStrings = UIStrings['home']

/* ---------------------------------------------------------------------------
 * Data fetching (server-side, cached)
 * --------------------------------------------------------------------------- */

async function getGitHubData(): Promise<{ stars: number; contributors: number }> {
  try {
    const [repoRes, contribRes] = await Promise.all([
      fetch('https://api.github.com/repos/LibreChat-AI/LibreChat', {
        next: { revalidate: 3600 },
      }),
      fetch(
        'https://api.github.com/repos/LibreChat-AI/LibreChat/contributors?per_page=1&anon=true',
        { next: { revalidate: 3600 } },
      ),
    ])

    const repoData = repoRes.ok ? await repoRes.json() : {}
    const stars = repoData.stargazers_count ?? 0

    let contributors = 0
    if (contribRes.ok) {
      const linkHeader = contribRes.headers.get('link')
      if (linkHeader) {
        const match = linkHeader.match(/page=(\d+)>;\s*rel="last"/)
        contributors = match ? parseInt(match[1], 10) : 0
      }
    }

    return { stars, contributors }
  } catch {
    return { stars: 0, contributors: 0 }
  }
}

const DOCKER_HUB_REPOS = [
  'librechat/librechat',
  'librechat/librechat-api',
  'librechat/librechat-dev',
  'librechat/librechat-dev-api',
  'librechat/lc-dev',
  'librechat/lc-dev-api',
  'librechat/lc-dev-staging',
  'librechat/lc-dev-staging-api',
]

const GHCR_PACKAGES = [
  'librechat-dev',
  'librechat',
  'librechat-dev-api',
  'librechat-chart/librechat',
  'librechat-api',
  'lc-dev',
  'librechat-chart/librechat-rag-api',
  'lc-dev-staging-api',
  'lc-dev-staging',
  'lc-dev-api',
  'librechat-gitnexus',
]

async function getDockerHubPulls(repo: string): Promise<number> {
  try {
    const res = await fetch(`https://hub.docker.com/v2/repositories/${repo}/`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return 0
    const data = await res.json()
    return data.pull_count ?? 0
  } catch {
    return 0
  }
}

/** Packages published before the repository moved stay under the original owner, so both are counted. */
const GHCR_OWNERS = ['users/danny-avila', 'orgs/LibreChat-AI']

async function getGhcrDownloads(owner: string, pkg: string): Promise<number> {
  try {
    const encodedPackage = encodeURIComponent(pkg)
    const res = await fetch(
      `https://github.com/${owner}/packages/container/package/${encodedPackage}`,
      { next: { revalidate: 3600 } },
    )
    if (!res.ok) return 0
    const html = await res.text()
    const match = html.match(/Total downloads[\s\S]{0,500}?<h3 title="(\d+)">/)
    return match ? parseInt(match[1], 10) : 0
  } catch {
    return 0
  }
}

async function getGhcrDownloadsForOwner(owner: string): Promise<number> {
  let total = 0
  for (const pkg of GHCR_PACKAGES) {
    total += await getGhcrDownloads(owner, pkg)
  }
  return total
}

async function getGhcrDownloadsTotal(): Promise<number> {
  const totals = await Promise.all(GHCR_OWNERS.map(getGhcrDownloadsForOwner))
  return totals.reduce((sum, n) => sum + n, 0)
}

async function getContainerPulls(): Promise<number> {
  const [dockerHubCounts, ghcrTotal] = await Promise.all([
    Promise.all(DOCKER_HUB_REPOS.map(getDockerHubPulls)),
    getGhcrDownloadsTotal(),
  ])
  return dockerHubCounts.reduce((sum, n) => sum + n, ghcrTotal)
}

/* ---------------------------------------------------------------------------
 * Helpers
 * --------------------------------------------------------------------------- */

function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}k`
  }
  return num.toString()
}

/* ---------------------------------------------------------------------------
 * Company logos data
 * --------------------------------------------------------------------------- */

const companies = [
  {
    name: 'Tekion',
    logoLight: '/images/logos/Tekion.svg',
    logoDark: '/images/logos/Tekion.svg',
    isSvg: true,
    imgHeight: 32,
    imgWidth: 178,
  },
  {
    name: 'cBioPortal',
    logoLight: '/images/logos/cBioPortal.svg',
    logoDark: '/images/logos/cBioPortal.svg',
    isSvg: true,
    imgHeight: 60,
    imgWidth: 213,
  },
  {
    name: 'NASA',
    logoLight: '/images/logos/NASA.svg',
    logoDark: '/images/logos/NASA.svg',
    isSvg: true,
    imgHeight: 64,
    imgWidth: 77,
  },
  {
    name: 'Visa',
    logoLight: '/images/logos/Visa_light.svg',
    logoDark: '/images/logos/Visa_dark.svg',
    isSvg: true,
    imgHeight: 42,
    imgWidth: 128,
  },
  {
    name: 'Harvard University',
    logoLight: '/images/logos/Harvard_light.svg',
    logoDark: '/images/logos/Harvard_dark.svg',
    isSvg: true,
    imgHeight: 40,
    imgWidth: 159,
  },
  {
    name: 'Stanford University',
    logoLight: '/images/logos/Stanford.svg',
    logoDark: '/images/logos/Stanford.svg',
    isSvg: true,
    imgHeight: 64,
    imgWidth: 42,
  },
  {
    name: 'Stripe',
    logoLight: '/images/logos/Stripe wordmark - Slate.svg',
    logoDark: '/images/logos/Stripe wordmark - White.svg',
    isSvg: true,
    imgHeight: 40,
    imgWidth: 95,
  },
  {
    name: 'Shopify',
    logoLight: '/images/logos/Shopify_light.svg',
    logoDark: '/images/logos/Shopify_dark.svg',
    isSvg: true,
    imgHeight: 48,
    imgWidth: 153,
  },
  {
    name: 'Coinbase',
    logoLight: '/images/logos/Coinbase_light.svg',
    logoDark: '/images/logos/Coinbase_dark.svg',
    isSvg: true,
    imgHeight: 32,
    imgWidth: 179,
  },
  {
    name: 'UC Berkeley',
    logoLight: '/images/logos/UCBerkeley_light.svg',
    logoDark: '/images/logos/UCBerkeley_dark.svg',
    isSvg: true,
    imgHeight: 32,
    imgWidth: 171,
  },
  {
    name: 'Daimler Truck',
    logoLight: '/images/logos/DaimlerTruck_light.svg',
    logoDark: '/images/logos/DaimlerTruck_dark.svg',
    isSvg: true,
    imgHeight: 24,
    imgWidth: 318,
  },
  {
    name: 'TDK',
    logoLight: '/images/logos/TDK_light.svg',
    logoDark: '/images/logos/TDK_dark.svg',
    isSvg: true,
    imgHeight: 36,
    imgWidth: 172,
  },
  {
    name: 'ClickHouse',
    logoLight: '/images/logos/ClickHouse_light.svg',
    logoDark: '/images/logos/ClickHouse_dark.svg',
    isSvg: true,
    imgHeight: 56,
    imgWidth: 421,
  },
  {
    name: 'SIXT',
    logoLight: '/images/logos/SIXT_light.svg',
    logoDark: '/images/logos/SIXT_dark.svg',
    isSvg: true,
    imgHeight: 44,
    imgWidth: 107,
  },
  {
    name: 'Lennar',
    logoLight: '/images/logos/Lennar_light.svg',
    logoDark: '/images/logos/Lennar_dark.svg',
    isSvg: true,
    imgHeight: 20,
    imgWidth: 216,
  },
  {
    name: 'Strategy',
    logoLight: '/images/logos/Strategy_light.svg',
    logoDark: '/images/logos/Strategy_dark.svg',
    isSvg: true,
    imgHeight: 40,
    imgWidth: 148,
  },
  {
    name: 'Boston University',
    logoLight: '/images/logos/BostonUniversity_light.png',
    logoDark: '/images/logos/BostonUniversity_dark.png',
    isSvg: false,
    imgHeight: 48,
    imgWidth: 107,
  },
  {
    name: 'UMass Amherst',
    logoLight: '/images/logos/UMassAmherst_light.svg',
    logoDark: '/images/logos/UMassAmherst_dark.svg',
    isSvg: true,
    imgHeight: 56,
    imgWidth: 108,
  },
  {
    name: 'Université de Montréal',
    logoLight: '/images/logos/UniversiteMontreal_light.svg',
    logoDark: '/images/logos/UniversiteMontreal_dark.svg',
    isSvg: true,
    imgHeight: 48,
    imgWidth: 126,
  },
  {
    name: 'BeiGene',
    logoLight: '/images/logos/BeiGene_light.png',
    logoDark: '/images/logos/BeiGene_dark.png',
    isSvg: false,
    imgHeight: 36,
    imgWidth: 192,
  },
  {
    name: 'Opendoor',
    logoLight: '/images/logos/Opendoor_light.svg',
    logoDark: '/images/logos/Opendoor_dark.svg',
    isSvg: true,
    imgHeight: 32,
    imgWidth: 146,
  },
  {
    name: 'Hinge Health',
    logoLight: '/images/logos/HingeHealth_light.svg',
    logoDark: '/images/logos/HingeHealth_dark.svg',
    isSvg: true,
    imgHeight: 56,
    imgWidth: 131,
  },
]

/* ---------------------------------------------------------------------------
 * Features data (icons + hrefs; localized title/description from the dictionary)
 * --------------------------------------------------------------------------- */

type FeatureKey = keyof HomeStrings['features']
type FeatureVisual = 'agents' | 'models' | 'artifacts'

const features: { icon: LucideIcon; key: FeatureKey; href: string; visual?: FeatureVisual }[] = [
  { icon: Bot, key: 'agents', href: '/docs/features/agents', visual: 'agents' },
  {
    icon: Settings2,
    key: 'models',
    href: '/docs/configuration/pre_configured_ai',
    visual: 'models',
  },
  { icon: Code, key: 'artifacts', href: '/docs/features/artifacts', visual: 'artifacts' },
  { icon: FolderKanban, key: 'projects', href: '/docs/features/projects' },
  { icon: BookOpen, key: 'skills', href: '/docs/features/skills' },
  { icon: Network, key: 'subagents', href: '/docs/features/subagents' },
  { icon: Terminal, key: 'codeInterpreter', href: '/docs/features/code_interpreter' },
  { icon: Plug, key: 'mcp', href: '/docs/features/mcp' },
  { icon: Brain, key: 'memory', href: '/docs/features/memory' },
  { icon: Globe, key: 'webSearch', href: '/docs/features/web_search' },
  { icon: Search, key: 'search', href: '/docs/features/search' },
  { icon: ShieldCheck, key: 'authentication', href: '/docs/configuration/authentication' },
]

/* ---------------------------------------------------------------------------
 * Hero Section
 * --------------------------------------------------------------------------- */

function HeroSection({ stars, t, lang }: { stars: number; t: HomeStrings; lang: string }) {
  return (
    <section className="landing-hero" aria-labelledby="hero-heading">
      <div className="landing-shell landing-hero-copy">
        {/* GitHub stars badge */}
        {stars > 0 && (
          <Link
            href="https://github.com/LibreChat-AI/LibreChat"
            target="_blank"
            rel="noopener noreferrer"
            className="landing-github-link"
            aria-label={fmt(t.starAria, { count: formatNumber(stars) })}
          >
            <Star className="size-3.5" aria-hidden="true" />
            <span>{t.starOnGitHub}</span>
            <span className="landing-github-count">{formatNumber(stars)}</span>
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        )}

        <h1 id="hero-heading" className="landing-hero-title">
          <span>{t.heroTitleTop}</span> <span>{t.heroTitleBottom}</span>
        </h1>

        <p className="landing-hero-description">{t.heroSubtitle}</p>

        {/* CTAs */}
        <nav className="landing-hero-actions" aria-label={t.primaryActionsAria}>
          <Button asChild className="landing-action">
            <Link href={localizedDocsHref('/docs', lang)} aria-label={t.getStartedAria}>
              {t.getStarted}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="landing-action">
            <Link
              href="https://chat.librechat.ai"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t.tryDemoAria}
            >
              {t.tryDemo}
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </nav>
      </div>

      {/* Demo screenshot */}
      <div className="landing-shell landing-product-preview">
        {/* Desktop */}
        <div className="hidden md:block">
          <Image
            src={DemoImageLight}
            alt={t.desktopLightAlt}
            className="landing-product-image block dark:hidden"
            priority
            sizes="(max-width: 1280px) 90vw, 1152px"
            placeholder="blur"
          />
          <Image
            src={DemoImageDark}
            alt={t.desktopDarkAlt}
            className="landing-product-image hidden dark:block"
            priority
            sizes="(max-width: 1280px) 90vw, 1152px"
            placeholder="blur"
          />
        </div>
        {/* Mobile */}
        <div className="block md:hidden">
          <Image
            src={DemoImageMobileLight}
            alt={t.mobileLightAlt}
            className="landing-product-image mx-auto block w-full max-w-sm dark:hidden"
            priority
            sizes="(max-width: 640px) 90vw, 384px"
            placeholder="blur"
          />
          <Image
            src={DemoImageMobileDark}
            alt={t.mobileDarkAlt}
            className="landing-product-image mx-auto hidden w-full max-w-sm dark:block"
            priority
            sizes="(max-width: 640px) 90vw, 384px"
            placeholder="blur"
          />
        </div>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------------------
 * Trusted By Section
 * --------------------------------------------------------------------------- */

function TrustedBySection({ t }: { t: HomeStrings }) {
  return (
    <section aria-labelledby="trusted-by-heading" className="landing-trust" tabIndex={0}>
      <div className="w-full">
        <h2 id="trusted-by-heading" className="landing-shell landing-trust-heading">
          {t.trustedBy}
        </h2>
        <Marquee pauseOnHover repeat={2}>
          {companies.map((company) => (
            <figure
              key={company.name}
              className="flex h-20 shrink-0 items-center justify-center px-4"
            >
              {/* Light mode logo */}
              <Image
                src={company.logoLight}
                alt={`${company.name} logo`}
                className="block h-auto max-w-56 object-contain opacity-60 transition-opacity hover:opacity-100 dark:hidden"
                style={{ width: company.imgWidth }}
                width={company.imgWidth}
                height={company.imgHeight}
                sizes="224px"
                loading="eager"
                unoptimized={company.isSvg}
              />
              {/* Dark mode logo */}
              <Image
                src={company.logoDark}
                alt={`${company.name} logo`}
                className="hidden h-auto max-w-56 object-contain opacity-60 transition-opacity hover:opacity-100 dark:block"
                style={{ width: company.imgWidth }}
                width={company.imgWidth}
                height={company.imgHeight}
                sizes="224px"
                loading="eager"
                unoptimized={company.isSvg}
              />
            </figure>
          ))}
        </Marquee>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------------------
 * Features Section
 * --------------------------------------------------------------------------- */

function FeaturePreview({ kind, t }: { kind: FeatureVisual; t: HomeStrings }) {
  if (kind === 'models') {
    return <ProvidersMarquee description={t.features.models.description} />
  }

  const images =
    kind === 'agents'
      ? { light: AgentsImageLight, dark: AgentsImageDark }
      : { light: ArtifactsImageLight, dark: ArtifactsImageDark }

  return (
    <>
      <Image
        src={images.light}
        alt={t.features[kind].title}
        className="landing-feature-image block dark:hidden"
        sizes={
          kind === 'agents' ? '(max-width: 640px) 85vw, 384px' : '(max-width: 768px) 85vw, 600px'
        }
        placeholder="blur"
        unoptimized
      />
      <Image
        src={images.dark}
        alt={t.features[kind].title}
        className="landing-feature-image hidden dark:block"
        sizes={
          kind === 'agents' ? '(max-width: 640px) 85vw, 384px' : '(max-width: 768px) 85vw, 600px'
        }
        placeholder="blur"
        unoptimized
      />
    </>
  )
}

function FeaturesSection({ t, lang }: { t: HomeStrings; lang: string }) {
  return (
    <section className="landing-features" aria-labelledby="features-heading">
      <header className="landing-section-header landing-shell">
        <h2 id="features-heading" className="landing-section-title">
          {t.featuresHeading}
        </h2>
        <p className="landing-section-description">{t.featuresSubtitle}</p>
      </header>

      <div className="landing-showcases">
        {features
          .filter((feature) => feature.visual)
          .map((feature, index) => {
            const text = t.features[feature.key]
            return (
              <article
                key={feature.key}
                className={`landing-showcase landing-showcase-${feature.visual}${feature.visual === 'models' ? '' : ' landing-shell'}`}
                aria-labelledby={`feature-${feature.key}`}
              >
                <div
                  className={`landing-showcase-copy${feature.visual === 'models' ? ' landing-shell' : ''}`}
                >
                  <span className="landing-feature-index" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 id={`feature-${feature.key}`}>{text.title}</h3>
                  <p>{text.description}</p>
                  <Link
                    href={localizedDocsHref(feature.href, lang)}
                    className="landing-text-link"
                    aria-label={`${t.learnMore}: ${text.title}`}
                  >
                    {t.learnMore}
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
                <div className={`landing-feature-visual landing-feature-visual-${feature.visual}`}>
                  <FeaturePreview kind={feature.visual!} t={t} />
                </div>
              </article>
            )
          })}
      </div>

      <div className="landing-capabilities landing-shell">
        {features
          .filter((feature) => !feature.visual)
          .map((feature) => {
            const Icon = feature.icon
            const text = t.features[feature.key]
            return (
              <article key={feature.key}>
                <Link href={localizedDocsHref(feature.href, lang)} className="landing-capability">
                  <div className="landing-capability-icons" aria-hidden="true">
                    <Icon className="size-5" />
                    <ArrowUpRight className="size-4" />
                  </div>
                  <h3>{text.title}</h3>
                  <p>{text.description}</p>
                </Link>
              </article>
            )
          })}
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------------------
 * Community Section
 * --------------------------------------------------------------------------- */

function CommunitySection({
  stars,
  pulls,
  contributors,
  t,
}: {
  stars: number
  pulls: number
  contributors: number
  t: HomeStrings
}) {
  return (
    <section className="landing-community" aria-labelledby="community-heading">
      <div className="landing-shell">
        <header className="landing-section-header">
          <h2 id="community-heading" className="landing-section-title">
            {t.communityHeading}
          </h2>
          <div>
            <p className="landing-section-description">{t.communitySubtitle}</p>
            <nav className="landing-community-links" aria-label={t.communityLinksAria}>
              <Link
                href="https://github.com/LibreChat-AI/LibreChat"
                target="_blank"
                rel="noopener noreferrer"
                className="landing-text-link"
                aria-label={t.githubAria}
              >
                <Github className="size-4" aria-hidden="true" />
                GitHub
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href="https://discord.librechat.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="landing-text-link"
                aria-label={t.discordAria}
              >
                <Discord className="size-4" aria-hidden="true" />
                Discord
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </nav>
          </div>
        </header>

        {/* Stats */}
        <dl className="landing-stats">
          <div>
            <dt>{t.githubStars}</dt>
            <dd>{stars > 0 ? formatNumber(stars) : '--'}</dd>
          </div>
          <div>
            <dt>{t.dockerPulls}</dt>
            <dd>{pulls > 0 ? formatNumber(pulls) : '--'}</dd>
          </div>
          <div>
            <dt>{t.contributors}</dt>
            <dd>{contributors > 0 ? formatNumber(contributors) : '--'}</dd>
          </div>
        </dl>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------------------
 * Landing page content, shared by the default-language `/` route and the
 * locale-prefixed `/<locale>` routes.
 * --------------------------------------------------------------------------- */

export async function HomePageContent({ lang }: { lang: string }) {
  const [{ stars, contributors }, pulls] = await Promise.all([getGitHubData(), getContainerPulls()])

  const ui = getUI(lang)
  const t = ui.home
  const navLinks = [
    { text: ui.nav.docs, url: localizedDocsHref('/docs', lang), active: 'nested-url' as const },
    { text: ui.nav.blog, url: '/blog' },
    { text: ui.nav.changelog, url: '/changelog' },
    {
      type: 'icon' as const,
      text: 'GitHub',
      label: 'GitHub',
      url: 'https://github.com/LibreChat-AI/LibreChat',
      icon: <GitHubIcon aria-hidden="true" />,
      external: true,
    },
  ]

  return (
    <HomeI18nProvider locale={lang}>
      <HomeLayout
        {...baseOptions}
        className="landing-page"
        i18n
        links={navLinks}
        githubUrl={undefined}
        nav={{ ...baseOptions.nav, url: localizedHomeHref(lang), transparentMode: 'top' }}
      >
        <JsonLd data={[organizationSchema, websiteSchema, softwareApplicationSchema]} />
        <div id="main-content" tabIndex={-1}>
          <HeroSection stars={stars} t={t} lang={lang} />
          <TrustedBySection t={t} />
          <FeaturesSection t={t} lang={lang} />
          <CommunitySection stars={stars} pulls={pulls} contributors={contributors} t={t} />
        </div>
        <FooterMenu lang={lang} />
      </HomeLayout>
    </HomeI18nProvider>
  )
}
