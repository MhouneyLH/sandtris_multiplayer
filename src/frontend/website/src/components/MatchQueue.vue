<template>
  <section class="queue-card" aria-label="Match Queue">
    <div class="queue-card__intro">
      <p class="queue-card__eyebrow">Multiplayer</p>
      <h2 class="queue-card__title">Match Queue</h2>
      <p class="queue-card__text">Jump into a live game or leave the queue at any time.</p>

      <!-- Queue Status Display -->
      <div v-if="connectionState === 'connected'" class="queue-status queue-status--connected">
        <span class="queue-status__dot" aria-hidden="true"></span>
        <span class="queue-status__text">
          {{ queueSize }} {{ queueSize === 1 ? 'player' : 'players' }} in queue
        </span>
      </div>
      <div v-else-if="connectionState === 'connecting'" class="queue-status queue-status--connecting">
        <span class="queue-status__dot" aria-hidden="true"></span>
        <span class="queue-status__text">Connecting...</span>
      </div>
      <div v-else class="queue-status queue-status--offline">
        <span class="queue-status__dot" aria-hidden="true"></span>
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
  --ink: #1f2937;
  --muted: #6b7280;
  --paper: #ffffff;
  --surface: #f8fafc;
  --line: #e5e7eb;
  --line-strong: #cbd5e1;
  --join-bg: #111827;
  --leave-bg: #374151;
  width: min(100%, 38rem);
  margin-inline: auto;
  border: 1px solid var(--line);
  border-radius: 0.875rem;
  padding: 1.25rem;
  background: linear-gradient(180deg, var(--paper) 0%, var(--surface) 100%);
  color: var(--ink);
  box-shadow: 0 8px 20px rgb(15 23 42 / 0.08);
}

.queue-card__intro {
  margin-bottom: 1rem;
}

.queue-card__eyebrow {
  margin: 0;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}

.queue-card__title {
  margin: 0.25rem 0 0.4rem;
  font-size: clamp(1.25rem, 4vw, 1.7rem);
  line-height: 1.2;
}

.queue-card__text {
  margin: 0;
  color: var(--muted);
}

.queue-status {
  margin-top: 0.75rem;
  padding: 0.58rem 0.8rem;
  border-radius: 0.5rem;
  background: #ffffff;
  border: 1px solid var(--line);
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.9rem;
  font-weight: 500;
}

.queue-status__dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 999px;
  background: #9ca3af;
}

.queue-status--connected {
  border-color: #d1d5db;
}

.queue-status--connected .queue-status__dot {
  background: #10b981;
}

.queue-status--connecting {
  border-color: #d1d5db;
}

.queue-status--connecting .queue-status__dot {
  background: #f59e0b;
}

.queue-status--offline {
  border-color: #d1d5db;
}

.queue-status--offline .queue-status__dot {
  background: #ef4444;
}

.queue-card__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem;
}

.queue-button {
  border: 1px solid transparent;
  border-radius: 0.75rem;
  padding: 0.78rem 0.95rem;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: #ffffff;
  cursor: pointer;
  transition: transform 0.14s ease, box-shadow 0.2s ease, background-color 0.2s ease, opacity 0.2s ease;
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
  background: var(--join-bg);
  box-shadow: 0 4px 12px rgb(17 24 39 / 0.2);
}

.queue-button--leave {
  background: var(--leave-bg);
  box-shadow: 0 4px 12px rgb(55 65 81 / 0.16);
}

.queue-button--join:not(:disabled):hover {
  background: #0f172a;
}

.queue-button--leave:not(:disabled):hover {
  background: #1f2937;
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
