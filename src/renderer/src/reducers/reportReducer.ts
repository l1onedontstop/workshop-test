// ── Report Generation Reducer ──────────────────────────────
// Consolidates report content, loading, and error states

export interface ReportState {
  reportContent: string
  reportLoading: boolean
  reportError: string
}

export type ReportAction =
  | { type: 'START_REPORT' }
  | { type: 'SET_REPORT'; payload: string }
  | { type: 'SET_REPORT_ERROR'; payload: string }
  | { type: 'RESET_REPORT' }

export const initReport: ReportState = {
  reportContent: '',
  reportLoading: false,
  reportError: ''
}

export function reportReducer(s: ReportState, a: ReportAction): ReportState {
  switch (a.type) {
    case 'START_REPORT':
      return { ...s, reportLoading: true, reportError: '' }
    case 'SET_REPORT':
      return { ...s, reportContent: a.payload, reportLoading: false, reportError: '' }
    case 'SET_REPORT_ERROR':
      return { ...s, reportError: a.payload, reportLoading: false }
    case 'RESET_REPORT':
      return { ...s, reportContent: '', reportLoading: false, reportError: '' }
    default:
      return s
  }
}
