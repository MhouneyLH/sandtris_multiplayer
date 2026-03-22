<template>
  <section class="game-field" :aria-label="title">
    <header class="game-field__header">
      <h2 class="game-field__title">{{ title }}</h2>
      <button class="game-field__action" type="button" @click="emit('reset')">
        Reset
      </button>
    </header>

    <div class="game-field__content">
      <slot>
        <p class="game-field__empty">Add your game grid here.</p>
      </slot>
    </div>
  </section>
</template>

<script setup lang="ts">
type Props = {
  title?: string
}

withDefaults(defineProps<Props>(), {
  title: 'Game Field',
})

const emit = defineEmits<{
  reset: []
}>()
</script>

<style scoped>
.game-field {
  width: min(100%, 56rem);
  margin-inline: auto;
  padding: 1rem;
  border: 1px solid #d4d4d8;
  border-radius: 0.75rem;
  background: #f4f4f5;
}

.game-field__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.game-field__title {
  margin: 0;
  font-size: 1.125rem;
  line-height: 1.4;
}

.game-field__action {
  border: none;
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #18181b;
  color: #fafafa;
  cursor: pointer;
}

.game-field__action:hover {
  opacity: 0.92;
}

.game-field__content {
  min-height: 16rem;
  border: 1px dashed #a1a1aa;
  border-radius: 0.5rem;
  padding: 1rem;
  background: #fff;
}

.game-field__empty {
  margin: 0;
  color: #52525b;
}
</style>
