import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { createRateLimiter } from '@/lib/rate-limit'

/**
 * Rate limiter for the AI chat endpoint.
 *
 * Only active when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set.
 * Without them the app still works — just without rate limiting.
 *
 * Sliding window: 10 requests per 60 seconds per IP.
 */

let ratelimit: Ratelimit | null = null

function getRatelimit(): Ratelimit | null {
  if (ratelimit) return ratelimit
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null

  ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, '60 s'),
    timeout: 1000, // 1s — if Upstash is slow, allow the request through
    prefix: 'ratelimit:chat',
  })

  return ratelimit
}

export async function checkRateLimit(
  req: Request,
): Promise<{ allowed: true } | { allowed: false; reset: number }> {
  const limiter = getRatelimit()
  if (!limiter) return { allowed: true }

  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() ?? '127.0.0.1'

  const { success, reset } = await limiter.limit(ip)

  if (!success) {
    return { allowed: false, reset }
  }

  return { allowed: true }
}

/**
 * Rate limiter for the docs feedback server action.
 *
 * Two windows apply: a per-client limit, and a global cap so a caller rotating
 * identities (or a direct-origin request with a forged IP header) still cannot
 * flood the GitHub Discussions category and Discord channel. Uses Upstash when
 * configured so the limit holds across serverless instances; otherwise falls
 * back to a per-instance in-memory limiter.
 */

const FEEDBACK_PER_CLIENT = 3
const FEEDBACK_GLOBAL = 20

let feedbackLimiters: { client: Ratelimit; global: Ratelimit } | null = null

function getFeedbackLimiters(): { client: Ratelimit; global: Ratelimit } | null {
  if (feedbackLimiters) return feedbackLimiters
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null

  const redis = Redis.fromEnv()
  feedbackLimiters = {
    client: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(FEEDBACK_PER_CLIENT, '60 s'),
      timeout: 1000,
      prefix: 'ratelimit:feedback:client',
    }),
    global: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(FEEDBACK_GLOBAL, '60 s'),
      timeout: 1000,
      prefix: 'ratelimit:feedback:global',
    }),
  }

  return feedbackLimiters
}

const memoryFeedbackClient = createRateLimiter(FEEDBACK_PER_CLIENT, 60_000)
const memoryFeedbackGlobal = createRateLimiter(FEEDBACK_GLOBAL, 60_000)

/** Returns true when a feedback submission from `clientId` may proceed. */
export async function checkFeedbackRateLimit(clientId: string): Promise<boolean> {
  const limiters = getFeedbackLimiters()

  if (!limiters) {
    if (memoryFeedbackClient(clientId)) return false
    return !memoryFeedbackGlobal('global')
  }

  // Check the client window first so one noisy caller does not drain the global budget
  const { success } = await limiters.client.limit(clientId)
  if (!success) return false
  return (await limiters.global.limit('global')).success
}
