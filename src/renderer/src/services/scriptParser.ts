/**
 * Shared script section parser — handles AI outputs in both 8-section format
 * and multi-paragraph voiceover format (from Plan-generated scripts).
 */

export interface ScriptSections {
  voiceover: string
  style: string
  storyboard: string
  equipment: string
  scene: string
  postProduction: string
  cover: string
  rawJson: string
}

function buildSections(parts: string[]): ScriptSections {
  // Collect leading prose paragraphs as voiceover.
  // Multi-paragraph voiceovers (from plan-generated scripts) have --- between paragraphs.
  // Structured sections start with bullet (- ), table (|), or markdown header (##).
  let voiceoverEnd = 0
  for (let i = 0; i < parts.length; i++) {
    const t = parts[i].trim()
    if (t.startsWith('- ') || t.startsWith('|') || t.startsWith('##')) break
    voiceoverEnd = i + 1
  }
  const voiceoverParts = parts.slice(0, voiceoverEnd)
  const rest = parts.slice(voiceoverEnd)

  const result: ScriptSections = {
    voiceover: voiceoverParts.map(p => p.trim()).filter(Boolean).join('\n\n'),
    style: '',
    storyboard: '',
    equipment: '',
    scene: '',
    postProduction: '',
    cover: '',
    rawJson: ''
  }
  const keys = ['style', 'storyboard', 'equipment', 'scene', 'postProduction', 'cover'] as const
  for (let i = 0; i < rest.length - 1 && i < keys.length; i++) {
    result[keys[i]] = rest[i].trim()
  }
  if (rest.length > 0) {
    result.rawJson = rest[rest.length - 1].trim()
  }
  return result
}

export function extractScript(raw: string): string {
  // Layer 1: Try --- separator — use FIRST occurrence to grab voiceover only
  const sepIndex = raw.indexOf('---')
  if (sepIndex > 0) {
    const scriptPart = raw.substring(0, sepIndex).trim()
    if (scriptPart.length > 20) return scriptPart
  }

  // Layer 2: Try JSON extraction (find script/content field)
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (parsed.script && typeof parsed.script === 'string' && parsed.script.length > 20) {
        return parsed.script.trim()
      }
      if (parsed.content && typeof parsed.content === 'string' && parsed.content.length > 20) {
        return parsed.content.trim()
      }
    }
  } catch {
    // JSON parse failed, continue to next layer
  }

  // Layer 3: Pure JSON response (score-only, no script)
  if (raw.trim().startsWith('{')) {
    return ''
  }

  // Layer 4: Raw text long enough → likely a pure script without separator
  if (raw.trim().length > 50) {
    return raw.trim()
  }

  return ''
}

export function parseFullScript(raw: string): ScriptSections | null {
  // Replace table header-separator rows (|---|...|) with placeholder
  // so they don't get mistaken for section dividers
  const safeLines: string[] = []
  let inTable = false
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    // Detect table separator row: starts with |, contains only |-: and spaces
    if (trimmed.startsWith('|') && /^\|[\-: |]+\|$/.test(trimmed)) {
      safeLines.push('<!TS>')
      inTable = true
      continue
    }
    // Exit table on non-table line
    if (inTable && !trimmed.startsWith('|')) {
      inTable = false
    }
    safeLines.push(line)
  }
  const safe = safeLines.join('\n')

  const parts = safe.split(/\r?\n---\r?\n/)
  if (parts.length < 3) return null

  return buildSections(parts.map(p => p.replace(/<!TS>/g, '')))
}
