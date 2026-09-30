import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { google } from '@ai-sdk/google'

/**
 * Named model IDs for routes that call the @anthropic-ai/sdk client directly
 * (not through getModel() below). Centralized so a retirement/deprecation is
 * a one-line change here instead of a hunt through every route file.
 *
 * claude-sonnet-4-20250514 was retired 2026-06-15, which broke curriculum
 * import, assessment generation, and standards activity generation in
 * production ("model not found") until this constant replaced the
 * hardcoded string in each route on 2026-09-30.
 */
export const CLAUDE_SONNET_MODEL = 'claude-sonnet-4-6'

/**
 * Returns the AI model to use based on environment variables.
 *
 * Set in Vercel dashboard:
 *   AI_PROVIDER = anthropic | openai | google   (default: anthropic)
 *   AI_MODEL    = the model ID for that provider
 *
 * Suggested models per provider (cost-optimized):
 *   anthropic  claude-haiku-4-5-20251001
 *   openai     gpt-4o-mini
 *   google     gemini-2.0-flash
 */
export function getModel() {
  const provider = process.env.AI_PROVIDER ?? 'anthropic'
  const model = process.env.AI_MODEL ?? 'claude-haiku-4-5-20251001'

  switch (provider) {
    case 'openai':  return openai(model)
    case 'google':  return google(model)
    default:        return anthropic(model)
  }
}
