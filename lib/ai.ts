import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { google } from '@ai-sdk/google'

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
