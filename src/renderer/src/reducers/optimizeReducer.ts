// ── Optimize Workflow Reducer ─────────────────────────────

export interface OptimizeState {
  optimizing: boolean
  optimizedScript: string
  showDiff: boolean
  iteration: number
  history: Array<{ script: string; score: number | null }>
  scores: number[]
  canUndo: boolean
}

export type OptimizeAction =
  | { type: 'START' }
  | { type: 'SUCCESS'; script: string }
  | { type: 'FINISH' }
  | { type: 'ACCEPT'; currentScript: string; currentScore: number | null }
  | { type: 'ADD_SCORE'; score: number }
  | { type: 'DISCARD' }
  | { type: 'UNDO'; previousScript: string }

export const initOptimize: OptimizeState = {
  optimizing: false,
  optimizedScript: '',
  showDiff: false,
  iteration: 0,
  history: [],
  scores: [],
  canUndo: false
}

export function optimizeReducer(s: OptimizeState, a: OptimizeAction): OptimizeState {
  switch (a.type) {
    case 'START':
      return { ...s, optimizing: true }
    case 'SUCCESS':
      return { ...s, optimizing: false, optimizedScript: a.script, showDiff: true, iteration: s.iteration + 1 }
    case 'FINISH':
      return { ...s, optimizing: false }
    case 'ACCEPT':
      return { ...s, history: [...s.history, { script: a.currentScript, score: a.currentScore }], showDiff: false, optimizedScript: '', canUndo: true }
    case 'ADD_SCORE':
      return { ...s, scores: [...s.scores, a.score] }
    case 'DISCARD':
      return { ...s, showDiff: false, optimizedScript: '' }
    case 'UNDO':
      return { ...s, history: s.history.slice(0, -1), scores: s.scores.slice(0, -1), canUndo: s.history.length > 1 }
    default:
      return s
  }
}
