import { ref, computed, onUnmounted } from 'vue'
import { WebSocketClient } from './WebSocketClient'
import { WS_URL, EVENT_TYPES, MATCH_IDS } from './constants'
import type { ConnectionState, QueueUpdatedPayload, MatchStartedPayload } from './types'

// Singleton instance (shared across components)
let wsClient: WebSocketClient | null = null

export function useWebSocket() {
  // Reactive state
  const connectionState = ref<ConnectionState>('disconnected')
  const queueSize = ref<number>(0)

  // Computed helpers
  const isConnecting = computed(() => connectionState.value === 'connecting')
  const isConnected = computed(() => connectionState.value === 'connected')
  const isDisconnected = computed(() => connectionState.value === 'disconnected')

  // Initialize client if not exists
  if (!wsClient) {
    wsClient = new WebSocketClient(WS_URL)

    // Listen for state changes
    wsClient.on('state-change', (state: ConnectionState) => {
      connectionState.value = state
    })

    // Listen for queue updates
    wsClient.on<QueueUpdatedPayload>(EVENT_TYPES.QUEUE_UPDATED, (data) => {
      const normalizedSize = Number(data.QueueSize)
      queueSize.value = Number.isFinite(normalizedSize) ? Math.max(0, normalizedSize) : 0
      console.log(`Queue updated: ${data.PlayerId} ${data.Action} - Size: ${queueSize.value}`)
    })

    // Listen for subscription confirmation
    wsClient.on(EVENT_TYPES.SUBSCRIBED, (data) => {
      console.log('Subscribed to:', data)
    })
  }

  /**
   * Connect to WebSocket server
   */
  const connect = async (): Promise<void> => {
    if (!wsClient) return
    await wsClient.connect()
  }

  /**
   * Subscribe to lobby updates
   */
  const subscribeLobby = (): void => {
    if (!wsClient) return
    wsClient.subscribe(MATCH_IDS.LOBBY)
  }

  /**
   * Add event listener for specific events
   */
  const addEventListener = <T = unknown>(eventType: string, handler: (data: T) => void): void => {
    if (!wsClient) return
    wsClient.on(eventType, handler)
  }

  /**
   * Remove event listener
   */
  const removeEventListener = <T = unknown>(eventType: string, handler: (data: T) => void): void => {
    if (!wsClient) return
    wsClient.off(eventType, handler)
  }

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = (): void => {
    if (!wsClient) return
    wsClient.disconnect()
  }

  // Cleanup on component unmount
  onUnmounted(() => {
    // Note: We're keeping the singleton alive for now
    // In a real app, you might want to disconnect when no components are using it
  })

  return {
    // State
    connectionState,
    queueSize,

    // Computed
    isConnecting,
    isConnected,
    isDisconnected,

    // Methods
    connect,
    subscribeLobby,
    disconnect,
    addEventListener,
    removeEventListener,
  }
}
