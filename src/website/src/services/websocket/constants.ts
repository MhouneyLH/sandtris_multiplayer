export const WS_URL = 'ws://localhost:5015/ws'

export const EVENT_TYPES = {
  QUEUE_UPDATED: 'queue-updated',
  MATCH_STARTED: 'match-started',
  MATCH_ENDED: 'match-ended',
  MATCH_SUBSCRIBED: 'match-subscribed',
  MATCH_UNSUBSCRIBED: 'match-unsubscribed',
  PLAYER_INPUT: 'player-input',
  PIECE_SPAWNED: 'piece-spawned',
  SUBSCRIBE_TO_MATCH: 'subscribe-to-match',
  UNSUBSCRIBE_FROM_MATCH: 'unsubscribe-from-match',
  PING: 'ping',
  PONG: 'pong',
  ERROR: 'error',
} as const

export const MATCH_IDS = {
  LOBBY: 'lobby',
} as const
