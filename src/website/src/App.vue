<script setup lang="ts">
import { ref, onMounted } from 'vue'
import MatchQueue from './components/MatchQueue.vue'
import { JoinMatchQueue, LeaveMatchQueue } from './services/SandtrisService'
import { useWebSocket } from './services/websocket/useWebSocket'

const inQueue = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')

// WebSocket integration
const { connectionState, queueSize, isConnected, connect, subscribeLobby } = useWebSocket()

function generateRandomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return Math.random().toString(36).slice(2, 10)
}

const playerId = generateRandomId()

const handleJoinQueue = async () => {
  if (inQueue.value || isSubmitting.value) {
    return
  }

  if (!isConnected.value) {
    errorMessage.value = 'Realtime connection is not ready yet. Please wait a moment and try again.'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    const res = await JoinMatchQueue(playerId)
    if (!res.ok) {
      throw new Error(`Join failed with status ${res.status}`)
    }

    console.log('Joined match queue successfully')
    inQueue.value = true
  } catch (error) {
    console.error('Failed to join match queue:', error)
    errorMessage.value = 'Failed to join queue. Check API/WS server status and try again.'
  } finally {
    isSubmitting.value = false
  }
}

const handleLeaveQueue = async () => {
  if (!inQueue.value || isSubmitting.value) {
    return
  }

  if (!isConnected.value) {
    errorMessage.value = 'Realtime connection is not ready yet. Please wait a moment and try again.'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    const res = await LeaveMatchQueue(playerId)
    if (!res.ok) {
      throw new Error(`Leave failed with status ${res.status}`)
    }

    console.log('Left match queue successfully')
    inQueue.value = false
  } catch (error) {
    console.error('Failed to leave match queue:', error)
    errorMessage.value = 'Failed to leave queue. Check API/WS server status and try again.'
  } finally {
    isSubmitting.value = false
  }
}

// Connect to WebSocket on mount
onMounted(async () => {
  try {
    await connect()
    subscribeLobby()
    console.log('Connected to WebSocket and subscribed to lobby')
  } catch (error) {
    console.error('Failed to connect to WebSocket:', error)
  }
})
</script>

<template>
  <h1>Multiplayer Sandtris</h1>
  <MatchQueue :inQueue="inQueue" :queueSize="queueSize" :connectionState="connectionState" @join="handleJoinQueue"
    @leave="handleLeaveQueue" />
  <p v-if="errorMessage" role="alert">{{ errorMessage }}</p>
</template>
