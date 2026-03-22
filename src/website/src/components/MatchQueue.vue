<template>
  <section class="queue-card" aria-label="Match Queue">
    <div class="queue-card__intro">
      <p class="queue-card__eyebrow">Multiplayer</p>
      <h2 class="queue-card__title">Match Queue</h2>
      <p class="queue-card__text">Jump into a live game or leave the queue at any time.</p>
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
withDefaults(
  defineProps<{
    inQueue?: boolean
  }>(),
  {
    inQueue: false,
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
