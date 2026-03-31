import type { WebSocketMessage, EventHandler, ConnectionState } from './types'

export class WebSocketClient {
  private ws: WebSocket | null = null
  private readonly url: string
  private readonly eventHandlers: Map<string, Set<EventHandler>> = new Map()
  private state: ConnectionState = 'disconnected'

  constructor(url: string) {
    this.url = url
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected')
      return
    }

    this.state = 'connecting'
    this.emitStateChange()

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url)

        this.ws.onopen = () => {
          console.log('WebSocket connected')
          this.state = 'connected'
          this.emitStateChange()
          resolve()
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data)
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          this.state = 'error'
          this.emitStateChange()
        }

        this.ws.onclose = () => {
          console.log('WebSocket disconnected')
          this.state = 'disconnected'
          this.emitStateChange()
        }

        // Connection timeout
        setTimeout(() => {
          if (this.state === 'connecting') {
            reject(new Error('WebSocket connection timeout'))
            this.disconnect()
          }
        }, 5000)
      } catch (error) {
        this.state = 'error'
        this.emitStateChange()
        reject(error)
      }
    })
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.state = 'disconnected'
    this.emitStateChange()
  }

  /**
   * Send a message to the server
   */
  send(event: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message = {
        sentAt: new Date().toISOString(),
        event,
        version: 1,
      }
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('Cannot send message: WebSocket not connected')
    }
  }

  /**
   * Subscribe to a match/lobby
   */
  subscribe(matchId: string, playerId: string): void {
    this.send({
      eventType: 'subscribe-to-match',
      matchId,
      playerId,
    })
  }

  /**
   * Unsubscribe from a match/lobby
   */
  unsubscribe(matchId: string, playerId: string): void {
    this.send({
      eventType: 'unsubscribe-from-match',
      matchId,
      playerId,
    })
  }

  /**
   * Register an event handler
   */
  on<T = unknown>(eventType: string, handler: EventHandler<T>): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set())
    }
    this.eventHandlers.get(eventType)!.add(handler as EventHandler)
  }

  /**
   * Remove an event handler
   */
  off<T = unknown>(eventType: string, handler: EventHandler<T>): void {
    const handlers = this.eventHandlers.get(eventType)
    if (handlers) {
      handlers.delete(handler as EventHandler)
    }
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data)
      const event = message.event as unknown
      // Type guard for eventType
      let eventType: string | undefined = undefined
      if (typeof event === 'object' && event !== null && 'eventType' in event) {
        eventType = (event as { eventType?: string }).eventType
      }

      if (!eventType) {
        console.warn('Received message without eventType:', message)
        return
      }

      console.log('WebSocket message received:', eventType, event)

      const handlers = this.eventHandlers.get(eventType)
      if (handlers) {
        handlers.forEach((handler) => handler(event))
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
    }
  }

  /**
   * Emit state change event
   */
  private emitStateChange(): void {
    const handlers = this.eventHandlers.get('state-change')
    if (handlers) {
      handlers.forEach((handler) => handler(this.state))
    }
  }
}
