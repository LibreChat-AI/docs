/**
 * Script-side constants for the docs translation pipeline.
 * NOTE: this module uses build-time env and must not be imported by app/ components.
 */
export const DEFAULT_LOCALE = 'en'
export const TARGET_LOCALES = [
  'zh',
  'es',
  'fr',
  'de',
  'ja',
  'pt-BR',
  'it',
  'nl',
  'pl',
  'vi',
  'ko',
  'id',
  'tr',
] as const

/**
 * Bump to intentionally invalidate the whole translation memory (e.g. after a
 * prompt or model change). It is mixed into every block hash. Bumped to 2 with
 * the switch to gemini-3.1-flash-lite so cached gpt-nano output is re-translated.
 */
export const PROMPT_VERSION = '2'

/**
 * Bump when the preservation validator changes. Blocks the model could never get
 * past validation are recorded as "give up, keep English" markers namespaced by
 * this version, so relaxing or tightening `validate.ts` retries exactly those
 * blocks without invalidating the (far larger) set of good translations that a
 * PROMPT_VERSION bump would discard.
 */
export const VALIDATOR_VERSION = '1'

/**
 * Model id used for translation. Validate CJK quality before changing the default.
 * `||` (not `??`) so an empty string — which CI sets when the optional
 * OPENROUTER_TRANSLATE_MODEL repo variable is unset — falls back to the default
 * instead of becoming an invalid empty model id.
 */
export const TRANSLATE_MODEL =
  process.env.OPENROUTER_TRANSLATE_MODEL || 'anthropic/claude-haiku-5.5'

/** Terms that must never be translated and must stay spelled exactly as written. */
export const GLOSSARY = [
  'LibreChat',
  'librechat.yaml',
  '.env',
  'Docker',
  'MCP',
  'OpenAI',
  'Anthropic',
  'Azure',
  'Bedrock',
  'OpenRouter',
  'endpoint',
  'Model Specs',
]
