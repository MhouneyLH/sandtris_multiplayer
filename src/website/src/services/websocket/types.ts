export interface WebSocketMessage<T = unknown> {
  sentAt: string
  event: T
  version: number
}

export interface BaseEvent {
  eventType?: string
}

export interface QueueUpdatedPayload extends BaseEvent {
  queueSize: number
  playerId: string
  action: 'joined' | 'left'
}

export interface MatchStartedPayload extends BaseEvent {
  matchId: string
  playerIds: string[]
}

export interface MatchEndedPayload extends BaseEvent {
  matchId: string
  winnerPlayerId: string
}

export interface SubscriptionStatePayload extends BaseEvent {
  matchId: string
  playerId: string
}

export interface MoveInputData {
  dataTypeName: 'move'
  deltaX: number
  deltaY: number
}

export interface RotateInputData {
  dataTypeName: 'rotate'
  clockwise: boolean
}

export interface DropInputData {
  dataTypeName: 'drop'
}

export type PlayerInputData = MoveInputData | RotateInputData | DropInputData

export interface PlayerInputPayload extends BaseEvent {
  matchId: string
  playerId: string
  playerInputData: PlayerInputData
}

export interface PieceSpawnedPayload extends BaseEvent {
  matchId: string
  playerId: string
  shape?: number[][]
  color?: string
}

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error'

export type EventHandler<T = unknown> = (data: T) => void
