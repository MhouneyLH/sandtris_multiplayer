// WebSocket message wrapper matching backend format
export interface WebSocketMessage<T = unknown> {
  eventType: string
  sentAt: string
  version: number
  matchId: string
  data: T
}

// Queue update event payload (matches C# backend PascalCase)
export interface QueueUpdatedPayload {
  QueueSize: number
  PlayerId: string
  Action: 'joined' | 'left'
}

// Match started event payload (for future use)
export interface MatchStartedPayload {
  MatchId: string
  PlayerIds: string[]
}

// Subscription confirmation payload
export interface SubscriptionStatePayload {
  MatchId: string
}

// Connection states
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error'

// Event handler type
export type EventHandler<T = unknown> = (data: T) => void
