<template>
  <div class="game-screen">
    <div class="game-screen__header">
      <h2>Match Started!</h2>
      <p>Match ID: {{ matchData.matchId }}</p>
    </div>

    <div class="game-screen__layout">
      <div class="game-panel">
        <div class="game-panel__header">
          <h3>You</h3>
          <div class="game-panel__stats">
            <span>Score: <strong>{{ yourScore }}</strong></span>
            <span>Particles: <strong>{{ yourLines }}</strong></span>
          </div>
        </div>
        <TetrisGame :playerId="playerId" :matchId="matchData.matchId" :isYours="true"
          @scoreUpdate="handleYourScoreUpdate" />
      </div>

      <div class="game-panel">
        <div class="game-panel__header">
          <h3>Opponent</h3>
          <div class="game-panel__stats">
            <span>Score: <strong>{{ opponentScore }}</strong></span>
            <span>Particles: <strong>{{ opponentLines }}</strong></span>
          </div>
        </div>
        <TetrisGame :playerId="opponentId" :matchId="matchData.matchId" :isYours="false"
          @scoreUpdate="handleOpponentScoreUpdate" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import TetrisGame from './TetrisGame.vue'
import { useWebSocket } from '../services/websocket/useWebSocket'
import type { MatchStartedPayload } from '../services/websocket/types'

const props = defineProps<{
  playerId: string
  matchData: MatchStartedPayload
}>()

const { subscribeToMatch, unsubscribeFromMatch } = useWebSocket()

const yourScore = ref(0)
const yourLines = ref(0)
const opponentScore = ref(0)
const opponentLines = ref(0)

const opponentId = computed(() => {
  return props.matchData.playerIds.find(id => id !== props.playerId) || 'unknown'
})

const handleYourScoreUpdate = (data: { score: number; lines: number }) => {
  yourScore.value = data.score
  yourLines.value = data.lines
}

const handleOpponentScoreUpdate = (data: { score: number; lines: number }) => {
  opponentScore.value = data.score
  opponentLines.value = data.lines
}

onMounted(() => {
  console.log('Game screen mounted with players:', props.matchData.playerIds)
  console.log('Your ID:', props.playerId, 'Opponent ID:', opponentId.value)

  subscribeToMatch(props.matchData.matchId, props.playerId)
})

onUnmounted(() => {
  unsubscribeFromMatch(props.matchData.matchId, props.playerId)
})
</script>

<style scoped>
.game-screen {
  max-width: 1200px;
  margin: 2rem auto;
  padding: 1rem;
}

.game-screen__header {
  text-align: center;
  margin-bottom: 2rem;
}

.game-screen__header h2 {
  color: #10b981;
  margin-bottom: 0.5rem;
}

.game-screen__header p {
  color: #6b7280;
  font-family: monospace;
  font-size: 0.9rem;
}

.game-screen__layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  align-items: start;
}

.game-panel {
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 1rem;
  background: #f9fafb;
}

.game-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.game-panel__header h3 {
  margin: 0;
  color: #1f2937;
}

.game-panel__stats {
  display: flex;
  gap: 1rem;
  font-size: 0.9rem;
  color: #6b7280;
}

@media (max-width: 768px) {
  .game-screen__layout {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .game-screen {
    padding: 0.5rem;
  }
}
</style>
