// ── Loading / Error / Save Reducer ────────────────────────
// Consolidates async operation tracking: loading, error, saved

export interface LoadingState {
  loading: 'generate' | 'score' | 'delete' | null
  error: string
  saved: boolean
}

export type LoadingAction =
  | { type: 'START'; payload: LoadingState['loading'] }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'MARK_SAVED' }
  | { type: 'MARK_UNSAVED' }
  | { type: 'FINISH' }

export const initLoading: LoadingState = {
  loading: null,
  error: '',
  saved: false
}

export function loadingReducer(s: LoadingState, a: LoadingAction): LoadingState {
  switch (a.type) {
    case 'START':
      return { ...s, loading: a.payload, error: '' }
    case 'SET_ERROR':
      return { ...s, error: a.payload, loading: null }
    case 'CLEAR_ERROR':
      return { ...s, error: '' }
    case 'MARK_SAVED':
      return { ...s, saved: true }
    case 'MARK_UNSAVED':
      return { ...s, saved: false }
    case 'FINISH':
      return { ...s, loading: null }
    default:
      return s
  }
}
