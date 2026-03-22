// WebSocket endpoint URL
export const WS_URL = 'ws://localhost:5015/ws'

// Event type constants (matching backend)
export const EVENT_TYPES = {
  QUEUE_UPDATED: 'queue-updated',
  MATCH_STARTED: 'match-started',
  SUBSCRIBED: 'subscribed',
  PONG: 'pong',
  ERROR: 'error',
} as const

// Control message actions
export const ACTIONS = {
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
  PING: 'ping',
} as const

// Special match IDs
export const MATCH_IDS = {
  LOBBY: 'lobby',
} as const
