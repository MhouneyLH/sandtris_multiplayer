<script setup lang="ts">
import { ref } from 'vue'
import MatchQueue from './components/MatchQueue.vue'
import { JoinMatchQueue, LeaveMatchQueue } from './services/SandtrisService'

const inQueue = ref(false)

function generateRandomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return Math.random().toString(36).slice(2, 10)
}

const playerId = generateRandomId()

const handleJoinQueue = async () => {
  const res = await JoinMatchQueue(playerId)
  if (!res.ok) {
    console.error('Failed to join match queue')
    return
  }

  inQueue.value = true
}

const handleLeaveQueue = async () => {
  const res = await LeaveMatchQueue(playerId)
  if (!res.ok) {
    console.error('Failed to leave match queue')
    return
  }

  inQueue.value = false
}
</script>

<template>
  <h1>Multiplayer Sandtris</h1>
  <MatchQueue :inQueue="inQueue" @join="handleJoinQueue" @leave="handleLeaveQueue" />
</template>
