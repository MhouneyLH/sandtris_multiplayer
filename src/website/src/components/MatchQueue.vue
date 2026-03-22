<template>
  <section class="queue-card" aria-label="Match Queue">
    <div class="queue-card__intro">
      <p class="queue-card__eyebrow">Multiplayer</p>
      <h2 class="queue-card__title">Match Queue</h2>
      <p class="queue-card__text">Jump into a live game or leave the queue at any time.</p>

      <!-- Queue Status Display -->
      <div v-if="connectionState === 'connected'" class="queue-status">
        <span class="queue-status__icon">👥</span>
        <span class="queue-status__text">
          {{ queueSize }} {{ queueSize === 1 ? 'player' : 'players' }} in queue
        </span>
      </div>
      <div v-else-if="connectionState === 'connecting'" class="queue-status queue-status--connecting">
        <span class="queue-status__icon">🔄</span>
        <span class="queue-status__text">Connecting...</span>
      </div>
      <div v-else class="queue-status queue-status--offline">
        <span class="queue-status__icon">⚠️</span>
        <span class="queue-status__text">Offline</span>
      </div>
    </div>

    <div class="queue-card__actions">
      <button class="queue-button queue-button--join" type="button" :disabled="inQueue" @click="emit('join')">
        Join Queue
      </button>
      <button class="queue-button queue-button--leave" type="button" :disabled="!inQueue" @click="emit('leave')">
        Leave Queue
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ConnectionState } from '../services/websocket/types'

withDefaults(
  defineProps<{
    inQueue?: boolean
    queueSize?: number
    connectionState?: ConnectionState
  }>(),
  {
    inQueue: false,
    queueSize: 0,
    connectionState: 'disconnected',
  },
)

const emit = defineEmits<{
  join: []
  leave: []
}>()
</script>

<style scoped>
.queue-card {
  --ink: #101727;
  --paper: #fffef7;
  --line: #e8d9b8;
  --join-a: #00c4a2;
  --join-b: #0f8f7c;
  --leave-a: #ff8a5b;
  --leave-b: #dd4a30;
  width: min(100%, 38rem);
  margin-inline: auto;
  border: 1px solid var(--line);
  border-radius: 1rem;
  padding: 1.25rem;
  background:
    radial-gradient(circle at 8% 8%, #ffeec4 0%, transparent 30%),
    radial-gradient(circle at 95% 90%, #ffd8c7 0%, transparent 33%),
    var(--paper);
  color: var(--ink);
  box-shadow: 0 16px 28px rgb(16 23 39 / 0.12);
}

.queue-card__intro {
  margin-bottom: 1rem;
}

.queue-card__eyebrow {
  margin: 0;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  opacity: 0.72;
}

.queue-card__title {
  margin: 0.25rem 0 0.4rem;
  font-size: clamp(1.25rem, 4vw, 1.7rem);
  line-height: 1.2;
}

.queue-card__text {
  margin: 0;
  opacity: 0.86;
}

.queue-status {
  margin-top: 0.75rem;
  padding: 0.6rem 1rem;
  border-radius: 0.5rem;
  background: rgba(0, 196, 162, 0.12);
  border: 1px solid rgba(0, 196, 162, 0.2);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
}

.queue-status__icon {
  font-size: 1.2rem;
}

.queue-status--connecting {
  background: rgba(255, 204, 0, 0.12);
  border-color: rgba(255, 204, 0, 0.2);
}

.queue-status--offline {
  background: rgba(255, 74, 74, 0.12);
  border-color: rgba(255, 74, 74, 0.2);
}

.queue-card__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem;
}

.queue-button {
  border: none;
  border-radius: 0.75rem;
  padding: 0.78rem 0.95rem;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: #ffffff;
  cursor: pointer;
  transition: transform 0.14s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.queue-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
  transform: none;
  box-shadow: none;
}

.queue-button:not(:disabled):hover {
  transform: translateY(-1px);
}

.queue-button:not(:disabled):active {
  transform: translateY(1px) scale(0.99);
}

.queue-button--join {
  background: linear-gradient(135deg, var(--join-a), var(--join-b));
  box-shadow: 0 10px 18px rgb(0 160 132 / 0.28);
}

.queue-button--leave {
  background: linear-gradient(135deg, var(--leave-a), var(--leave-b));
  box-shadow: 0 10px 18px rgb(221 74 48 / 0.28);
}

@media (max-width: 460px) {
  .queue-card {
    padding: 1rem;
  }

  .queue-card__actions {
    grid-template-columns: 1fr;
  }
}
</style>
