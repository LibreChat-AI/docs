import { generateText } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { OPENROUTER_APP_HEADERS } from '../openrouter-attribution'
import { GLOSSARY, TRANSLATE_MODEL } from './config'
import { LOCALE_NAMES } from '../i18n'
import { withRetry } from './retry'
import { progress } from './progress'

export interface TranslateModel {
  generate(input: {
    system: string
    prompt: string
    maxOutputTokens?: number
    /** 0 for a block's first request, then 1, 2, ... for its validation retries. */
    attempt?: number
  }): Promise<string>
}

/**
 * Output budget for one block. Without it the provider reserves its full context
 * window (65536 tokens) per request no matter how small the block is, which both
 * inflates the credit reservation — the pipeline died for three weeks on
 * "requires more credits, or fewer max_tokens... you requested up to 65536" — and
 * lets a looping model run far past any plausible translation.
 *
 * A translation runs longer than its source in most target languages, and CJK
 * tokenizes at roughly one token per character, so budget 3x the source length in
 * characters. The floor covers short inline strings.
 *
 * The ceiling is sized off the real corpus: the largest translatable segment in
 * content/docs is ~15k characters, which needs roughly 6k output tokens in the
 * worst-case target language, so 16384 leaves ample headroom while staying 4x
 * below the provider's default reservation. Truncation is not silent either way —
 * a length-limited finish is rejected below.
 */
export function outputTokenBudget(text: string): number {
  return Math.min(16384, Math.max(512, text.length * 3))
}

/**
 * Raised when the provider stopped at the token budget. Distinct from a provider
 * or network error because the two need opposite handling: a network blip should
 * be retried at the file level indefinitely, but truncation is deterministic for a
 * given block, so the runner counts it as a block validation failure and lets the
 * bounded give-up path keep that block in English. Treated as transient instead,
 * it would be re-paid on every file round and every scheduled run, forever.
 */
export class TruncatedOutputError extends Error {
  constructor(maxOutputTokens?: number) {
    super(`translation truncated at the ${maxOutputTokens ?? 'default'}-token budget`)
    this.name = 'TruncatedOutputError'
  }
}

/**
 * A response cut off at the token budget is not a translation. Its text can still
 * satisfy the structural validator — a truncated paragraph or heading usually
 * does, and so does a looping response that simply filled the cap — so without
 * this it would be cached and published as if it were complete.
 */
export function assertNotTruncated(finishReason: string, maxOutputTokens?: number): void {
  if (finishReason === 'length') {
    throw new TruncatedOutputError(maxOutputTokens)
  }
}

/**
 * Translation needs no reasoning, and thinking tokens bill as output: left on, they
 * would cost more than the translation itself. Claude Haiku 5.5 thinks by default.
 */
export const TRANSLATE_MODEL_SETTINGS = { reasoning: { effort: 'none' } } as const

export function createOpenRouterModel(): TranslateModel {
  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
    headers: OPENROUTER_APP_HEADERS,
  })
  const model = openrouter.chat(TRANSLATE_MODEL, TRANSLATE_MODEL_SETTINGS)
  // A burst of 429s must not skip most pages. Retry with backoff (honoring any
  // Retry-After) so a single workflow run converges instead of needing repeated
  // manual re-runs. SDK-level retries are disabled so the backoff lives in one
  // place; TRANSLATE_MAX_RETRIES tunes the budget in CI.
  const maxRetries = Number(process.env.TRANSLATE_MAX_RETRIES) || 6
  return {
    async generate({ system, prompt, maxOutputTokens }) {
      // No `temperature`: Claude Haiku 5.5 rejects non-default sampling values.
      const { text, finishReason } = await withRetry(
        () => generateText({ model, system, prompt, maxRetries: 0, maxOutputTokens }),
        {
          retries: maxRetries,
          // Backoff is routine under load: count it for the progress UI
          // instead of emitting a log line per attempt (that spam buried the
          // signal in CI). A retry that ultimately exhausts its budget still
          // surfaces — its error rides up to run.ts and into `skipped`.
          onRetry: () => progress.retry(),
        },
      )
      assertNotTruncated(finishReason, maxOutputTokens)
      return text
    },
  }
}

export function buildSystemPrompt(localeName: string, kind: 'block' | 'inline'): string {
  return [
    `You are a professional technical translator translating LibreChat documentation into ${localeName}.`,
    '',
    'Rules:',
    `- Translate prose, headings, list and table text, link text, and alt text into ${localeName}.`,
    '- Preserve EXACTLY, untranslated: code (fenced and inline), JSX/MDX tags and all their props/attributes, import/export statements, URLs and file paths, anchor ids, frontmatter keys, and HTML attributes.',
    '- Preserve all Markdown/MDX syntax and structure: same headings levels, same list markers, same number of code blocks, same components.',
    kind === 'inline'
      ? '- This is a short inline string (a title or label). Return a single line with no surrounding Markdown.'
      : '- Return the translated Markdown/MDX block only.',
    '- Output ONLY the translation. No explanations, no commentary, no surrounding code fences.',
    `- Never translate these terms (keep them exactly as written): ${GLOSSARY.join(', ')}.`,
  ].join('\n')
}

export function stripWrappingFence(s: string): string {
  const match = s.match(/^\s*```[a-zA-Z0-9]*\n([\s\S]*?)\n```\s*$/)
  if (!match) return s
  // If the captured body still contains a fence, the regex spanned two or more
  // real code blocks (the model returned fenced content, not a wrapper). Leave it
  // untouched rather than corrupting the interior block.
  if (match[1].includes('```')) return s
  return match[1]
}

export interface TranslateRequest {
  system: string
  prompt: string
  maxOutputTokens: number
}

export interface TranslateInput {
  text: string
  locale: string
  kind: 'block' | 'inline'
  context?: string
}

/**
 * The exact model request for one string. Shared by the live path and the batch
 * prefetch so a batch answer is keyed by precisely what `translate` would send.
 */
export function buildTranslateRequest(opts: TranslateInput): TranslateRequest {
  const localeName = LOCALE_NAMES[opts.locale] ?? opts.locale
  const system = buildSystemPrompt(localeName, opts.kind)
  const context = opts.context
    ? `Surrounding context (for reference only, DO NOT translate or include in your output):\n${opts.context}\n\n`
    : ''
  const prompt = `${context}Translate the following into ${localeName}:\n${opts.text}`
  return { system, prompt, maxOutputTokens: outputTokenBudget(opts.text) }
}

export async function translate(
  opts: TranslateInput & { model: TranslateModel; attempt?: number },
): Promise<string> {
  const raw = await opts.model.generate({ ...buildTranslateRequest(opts), attempt: opts.attempt })
  return stripWrappingFence(raw)
}
