/**
 * Robustly extract JSON from an AI response string.
 * Handles: markdown code blocks, leading/trailing text, malformed JSON.
 */
export function extractJSON<T extends Record<string, unknown>>(
  raw: string,
  requiredKey: string
): T | null {
  if (!raw || typeof raw !== 'string') return null

  const trimmed = raw.trim()

  // Try 1: Direct JSON parse (cleanest case)
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed && typeof parsed === 'object') return parsed as T
    } catch {
      /* fall through */
    }
  }

  // Try 2: Extract from markdown code block ```json ... ```
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1].trim())
      if (parsed && typeof parsed === 'object') return parsed as T
    } catch {
      /* fall through */
    }
  }

  // Try 3: Find JSON object containing the required key (greedy match)
  const keyPattern = new RegExp(
    `\\{[\\s\\S]*"${requiredKey}"[\\s\\S]*\\}`
  )
  const keyMatch = trimmed.match(keyPattern)
  if (keyMatch) {
    try {
      const parsed = JSON.parse(keyMatch[0])
      if (
        parsed &&
        typeof parsed === 'object' &&
        requiredKey in parsed
      )
        return parsed as T
    } catch {
      /* fall through */
    }
  }

  // Try 4: Find any JSON object in the response
  const anyMatch = trimmed.match(/\{[\s\S]*\}/)
  if (anyMatch) {
    try {
      const parsed = JSON.parse(anyMatch[0])
      if (
        parsed &&
        typeof parsed === 'object' &&
        (requiredKey in parsed || Object.keys(parsed).length > 2)
      )
        return parsed as T
    } catch {
      /* fall through */
    }
  }

  return null
}
