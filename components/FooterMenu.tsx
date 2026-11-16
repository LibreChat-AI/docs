import Link from 'next/link'
import { ArrowUpRight, Github, Linkedin, Youtube, Mail } from 'lucide-react'
import Discord from './icons/discord'
import X from './icons/x'
import FooterWordmark from './FooterWordmark'
import { localizedDocsHref } from '@/lib/i18n'
import { getUI, type UIStrings } from '@/lib/ui-i18n'

type HeadingKey = keyof UIStrings['footer']['headings']
type ItemKey = keyof UIStrings['footer']['items']

const menuItems: {
  heading: HeadingKey
  items: { key: ItemKey; href: string }[]
}[] = [
  {
    heading: 'about',
    items: [
      { key: 'about', href: '/about' },
      { key: 'contactUs', href: '/about#contact-us' },
      { key: 'features', href: '/docs/features' },
    ],
  },
  {
    heading: 'resources',
    items: [
      { key: 'changelog', href: '/changelog' },
      { key: 'roadmap', href: '/blog/2026-02-18_2026_roadmap' },
      { key: 'demo', href: 'https://chat.librechat.ai/' },
      { key: 'status', href: 'https://status.librechat.ai/' },
    ],
  },
  {
    heading: 'documentation',
    items: [
      { key: 'getStarted', href: '/docs' },
      { key: 'localInstall', href: '/docs/local' },
      { key: 'remoteInstall', href: '/docs/remote' },
    ],
  },
  {
    heading: 'blog',
    items: [
      { key: 'blog', href: '/blog' },
      { key: 'blogAuthors', href: '/authors' },
    ],
  },
  {
    heading: 'newsletter',
    items: [
      { key: 'subscribe', href: '/subscribe' },
      { key: 'unsubscribe', href: '/unsubscribe' },
    ],
  },
  {
    heading: 'legal',
    items: [
      { key: 'termsOfService', href: '/tos' },
      { key: 'privacyPolicy', href: '/privacy' },
      { key: 'cookiePolicy', href: '/cookie' },
    ],
  },
]

const socialLinks = [
  {
    title: 'GitHub',
    icon: <Github className="size-4" aria-hidden="true" />,
    href: 'https://github.librechat.ai/',
  },
  {
    title: 'Discord',
    icon: <Discord className="size-4" aria-hidden="true" />,
    href: 'https://discord.librechat.ai/',
  },
  {
    title: 'LinkedIn',
    icon: <Linkedin className="size-4" aria-hidden="true" />,
    href: 'https://linkedin.librechat.ai/',
  },
  {
    title: 'X',
    icon: <X className="size-4" aria-hidden="true" />,
    href: 'https://x.com/LibreChatAI',
  },
  {
    title: 'YouTube',
    icon: <Youtube className="size-4" aria-hidden="true" />,
    href: 'https://www.youtube.com/@LibreChat',
  },
  {
    title: 'Email',
    icon: <Mail className="size-4" aria-hidden="true" />,
    href: 'mailto:contact@librechat.ai',
  },
]

/** Site footer with navigation link columns and social media icon links. */
const FooterMenu = ({ lang }: { lang?: string }) => {
  const { footer: t, home } = getUI(lang)
  return (
    <footer className="site-footer" role="contentinfo">
      <div className="footer-shell">
        <div className="footer-invitation">
          <h2 className="footer-invitation-title">{home.ctaHeading}</h2>
          <div className="footer-invitation-action">
            <p className="text-sm leading-relaxed text-muted-foreground">{home.ctaSubtitle}</p>
            <Link
              href={localizedDocsHref('/docs', lang)}
              className="footer-cta"
              aria-label={home.quickstartAria}
            >
              {home.quickstartGuide}
              <span className="footer-cta-icon" aria-hidden="true">
                <ArrowUpRight className="size-5" />
              </span>
            </Link>
          </div>
        </div>
        <nav
          aria-label="Footer"
          className="grid grid-cols-2 gap-x-6 gap-y-10 py-12 sm:grid-cols-3 lg:grid-cols-6 lg:py-16"
        >
          {menuItems.map((menu) => (
            <div key={menu.heading}>
              <h3 className="footer-nav-heading">{t.headings[menu.heading]}</h3>
              <ul>
                {menu.items.map((item) => (
                  <li key={item.key}>
                    <Link href={localizedDocsHref(item.href, lang)} className="footer-nav-link">
                      {t.items[item.key]}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <FooterWordmark />
        <div className="footer-colophon">
          <p className="font-mono text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} LibreChat
          </p>
          <nav aria-label="Social media" className="flex flex-wrap items-center gap-1">
            {socialLinks.map((link) => (
              <Link
                key={link.title}
                href={link.href}
                aria-label={link.title}
                className="footer-social-link"
              >
                {link.icon}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  )
}

export default FooterMenu
