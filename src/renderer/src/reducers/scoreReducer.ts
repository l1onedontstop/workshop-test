// ── Score State Reducer ────────────────────────────────────
// Consolidates score result and staleness tracking

export interface RubricScores {
  hook: number
  rhythm: number
  sharpness: number
  utility: number
  emotion: number
  structure: number
  expression: number
}

export interface ScoreResult {
  scores: RubricScores
  total: number
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
  overall: string
}

export interface ScoreState {
  scoreResult: ScoreResult | null
  scoreStale: boolean
}

export type ScoreAction =
  | { type: 'SET_SCORE'; payload: ScoreResult }
  | { type: 'MARK_STALE' }
  | { type: 'CLEAR_STALE' }
  | { type: 'RESET' }

export const initScore: ScoreState = {
  scoreResult: null,
  scoreStale: false
}

export function scoreReducer(s: ScoreState, a: ScoreAction): ScoreState {
  switch (a.type) {
    case 'SET_SCORE':
      return { ...s, scoreResult: a.payload, scoreStale: false }
    case 'MARK_STALE':
      return { ...s, scoreStale: true }
    case 'CLEAR_STALE':
      return { ...s, scoreStale: false }
    case 'RESET':
      return { ...s, scoreResult: null, scoreStale: false }
    default:
      return s
  }
}
