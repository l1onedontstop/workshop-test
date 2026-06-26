// ── Chat Optimization Panel Reducer ────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  ts: string
}

export interface ChatState {
  open: boolean
  messages: ChatMessage[]
  input: string
  loading: boolean
  error: string
}

export type ChatAction =
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  | { type: 'SET_INPUT'; value: string }
  | { type: 'SEND_START'; feedback: string }
  | { type: 'SEND_SUCCESS'; response: string }
  | { type: 'SEND_ERROR'; error: string }
  | { type: 'SET_MESSAGES'; messages: ChatMessage[] }

export const initChat: ChatState = {
  open: false,
  messages: [],
  input: '',
  loading: false,
  error: ''
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'OPEN':
      return { ...state, open: true, error: '' }
    case 'CLOSE':
      return { ...initChat }
    case 'SET_INPUT':
      return { ...state, input: action.value, error: '' }
    case 'SEND_START': {
      const now = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      return {
        ...state,
        input: '',
        loading: true,
        error: '',
        messages: [...state.messages, { role: 'user', content: action.feedback, ts: now }]
      }
    }
    case 'SEND_SUCCESS': {
      const now = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      return {
        ...state,
        loading: false,
        messages: [...state.messages, { role: 'assistant', content: action.response, ts: now }]
      }
    }
    case 'SEND_ERROR':
      return { ...state, loading: false, error: action.error }
    case 'SET_MESSAGES':
      return { ...state, messages: action.messages }
    default:
      return state
  }
}
