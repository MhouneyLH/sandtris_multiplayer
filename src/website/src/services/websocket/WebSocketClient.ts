import type { WebSocketMessage, EventHandler, ConnectionState } from './types'

export class WebSocketClient {
  private ws: WebSocket | null = null
  private url: string
  private eventHandlers: Map<string, Set<EventHandler>> = new Map()
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
  send(message: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('Cannot send message: WebSocket not connected')
    }
  }

  /**
   * Subscribe to a match/lobby
   */
  subscribe(matchId: string): void {
    this.send({
      action: 'subscribe',
      matchId,
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
      console.log('WebSocket message received:', message.eventType, message.data)
      console.log('Raw message:', message) // DEBUG: See full message structure

      // Emit to specific event handlers
      const handlers = this.eventHandlers.get(message.eventType)
      if (handlers) {
        handlers.forEach((handler) => handler(message.data))
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
