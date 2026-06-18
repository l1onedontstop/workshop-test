export function extractJSON(raw: string, opts: { label?: string; requireScores?: boolean } = {}): Record<string, any> | null {
  const { label = 'unknown', requireScores = false } = opts
  if (!raw || typeof raw !== 'string') { console.warn(`[json] Parse fail [${label}]: empty`); return null }
  const t = raw.trim()
  if (t.startsWith('{')) { try { const p = JSON.parse(t); if (requireScores && !p.scores) { console.warn(`[json] No scores [${label}]`); return null } return p } catch {} }
  const fm = t.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fm) { try { const p = JSON.parse(fm[1].trim()); if (requireScores && !p.scores) return null; return p } catch {} }
  if (requireScores) { const om = t.match(/\{[\s\S]*"scores"[\s\S]*\}/); if (om) { try { return JSON.parse(om[0]) } catch {} } }
  else { const om = t.match(/\{[\s\S]*\}/); if (om) { try { return JSON.parse(om[0]) } catch {} } }
  console.warn(`[json] All strategies failed [${label}]`)
  return null
}
