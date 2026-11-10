'use server'

interface FeedbackPayload {
  opinion: 'good' | 'bad'
  message: string
  url: string
}

const GITHUB_GRAPHQL = 'https://api.github.com/graphql'
const MAX_MESSAGE_LENGTH = 2000
const VALID_OPINIONS = new Set(['good', 'bad'])
/** A bare site pathname: no scheme, host, query, encoding, backslashes or whitespace */
const PATHNAME_PATTERN = /^\/[A-Za-z0-9\-._~/]*$/

import { headers } from 'next/headers'
import { i18n } from '@/lib/i18n'
import { checkFeedbackRateLimit } from '@/lib/ratelimit'
import { docsSource } from '@/lib/source'

/**
 * Resolve a bare pathname to an existing docs page. Returns the canonical path,
 * or null when no such page exists, so callers cannot post feedback for
 * arbitrary strings.
 */
function resolveDocsPath(url: string): string | null {
  const parts = url.split('/').filter(Boolean)

  let locale = i18n.defaultLanguage
  const first = parts[0]
  if (first && first !== 'docs' && i18n.languages.includes(first)) {
    locale = first
    parts.shift()
  }
  if (parts[0] !== 'docs') return null

  const slugs = parts.slice(1)
  if (!docsSource.getPage(slugs, locale)) return null

  const prefix = locale === i18n.defaultLanguage ? '' : `/${locale}`
  return `${prefix}/docs${slugs.length ? `/${slugs.join('/')}` : ''}`
}

/**
 * Identify the client from headers set by the edge. Cloudflare fronts the site
 * and overwrites cf-connecting-ip; x-real-ip and x-forwarded-for are set by Vercel.
 */
async function getClientId(): Promise<string> {
  const h = await headers()
  return (
    h.get('cf-connecting-ip')?.trim() ||
    h.get('x-real-ip')?.trim() ||
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  )
}

/** Break @mentions so a submitted message cannot notify GitHub users. */
function escapeMentions(text: string): string {
  return text.replaceAll('@', '@\u200b')
}

/**
 * Validate and sanitize the feedback payload.
 * Returns null if invalid, or the sanitized payload.
 */
function validatePayload(
  raw: unknown,
): { opinion: 'good' | 'bad'; message: string; url: string } | null {
  if (!raw || typeof raw !== 'object') return null

  const { opinion, message, url } = raw as Record<string, unknown>

  // Opinion must be exactly 'good' or 'bad'
  if (typeof opinion !== 'string' || !VALID_OPINIONS.has(opinion)) return null

  // URL must be a bare docs pathname that resolves to an existing page
  // (no external URLs, open redirects, query strings or arbitrary keys)
  if (typeof url !== 'string' || !PATHNAME_PATTERN.test(url) || url.includes('//')) return null
  const docsPath = resolveDocsPath(url.slice(0, 500))
  if (!docsPath) return null

  // Message is optional but must be a string with bounded length
  const safeMessage = typeof message === 'string' ? message.slice(0, MAX_MESSAGE_LENGTH).trim() : ''

  return {
    opinion: opinion as 'good' | 'bad',
    message: safeMessage,
    url: docsPath,
  }
}

async function createGitHubDiscussion(payload: FeedbackPayload): Promise<void> {
  const token = process.env.GITHUB_FEEDBACK_TOKEN
  const categoryId = process.env.GITHUB_DISCUSSION_CATEGORY_ID
  const repoId = process.env.GITHUB_DISCUSSION_REPO_ID

  if (!token || !categoryId || !repoId) return

  const emoji = payload.opinion === 'good' ? '👍' : '👎'
  const title = `${emoji} Feedback on ${payload.url}`
  const body = [
    `**Page:** ${payload.url}`,
    `**Rating:** ${payload.opinion}`,
    payload.message ? `**Message:**\n${escapeMentions(payload.message)}` : '',
    `---`,
    `*Submitted via docs feedback widget*`,
  ]
    .filter(Boolean)
    .join('\n\n')

  const query = `
    mutation($repoId: ID!, $categoryId: ID!, $title: String!, $body: String!) {
      createDiscussion(input: {
        repositoryId: $repoId,
        categoryId: $categoryId,
        title: $title,
        body: $body
      }) {
        discussion { url }
      }
    }
  `

  const res = await fetch(GITHUB_GRAPHQL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: { repoId, categoryId, title, body },
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('[Feedback] GitHub Discussion creation failed:', res.status, text)
  }
}

async function postToDiscord(payload: FeedbackPayload): Promise<void> {
  const webhookUrl = process.env.DISCORD_FEEDBACK_WEBHOOK
  if (!webhookUrl) return

  const emoji = payload.opinion === 'good' ? ':thumbsup:' : ':thumbsdown:'
  const embed = {
    title: `${emoji} Docs Feedback`,
    color: payload.opinion === 'good' ? 0x22c55e : 0xef4444,
    fields: [
      { name: 'Page', value: payload.url, inline: true },
      { name: 'Rating', value: payload.opinion, inline: true },
      ...(payload.message ? [{ name: 'Message', value: payload.message }] : []),
    ],
    timestamp: new Date().toISOString(),
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed], allowed_mentions: { parse: [] } }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('[Feedback] Discord webhook failed:', res.status, text)
  }
}

export async function submitFeedback(raw: FeedbackPayload): Promise<{ success: boolean }> {
  try {
    // Validate before rate limiting to avoid polluting the rate limit map with junk keys
    const payload = validatePayload(raw)
    if (!payload) {
      return { success: false }
    }

    // Rate limit by client, plus a global cap, so varying the URL cannot reset the limit
    if (!(await checkFeedbackRateLimit(await getClientId()))) {
      return { success: false }
    }

    await Promise.allSettled([createGitHubDiscussion(payload), postToDiscord(payload)])
    return { success: true }
  } catch (err) {
    console.error('[Feedback] Unexpected error:', err)
    return { success: false }
  }
}
