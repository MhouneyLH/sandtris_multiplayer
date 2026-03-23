<template>
  <div class="tetris-game">
    <canvas ref="gameCanvas" :width="CANVAS_WIDTH" :height="CANVAS_HEIGHT" class="tetris-game__canvas" />
    <div v-if="!isYours" class="tetris-game__overlay">
      <span>Opponent's View</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { SandSimulation } from '../game/SandSimulation'
import { TetrisPiece, getRandomPiece } from '../game/TetrisPiece'

const props = defineProps<{
  playerId: string
  isYours: boolean
}>()

const emit = defineEmits<{
  scoreUpdate: [data: { score: number; lines: number }]
}>()

// Canvas setup
const GRID_WIDTH = 10    // Standard Tetris width
const GRID_HEIGHT = 20   // Standard Tetris height
const CELL_SIZE = 30     // 30px per cell for visibility
const CANVAS_WIDTH = GRID_WIDTH * CELL_SIZE  // 300px
const CANVAS_HEIGHT = GRID_HEIGHT * CELL_SIZE // 600px

const gameCanvas = ref<HTMLCanvasElement>()
let ctx: CanvasRenderingContext2D | null = null
let animationId: number | null = null

// Game state
let sandSimulation: SandSimulation
let currentPiece: TetrisPiece | null = null
let score = 0
let linesCleared = 0
let dropTimer = 0
let dropInterval = 60 // Drop every 60 frames (1 second at 60fps)

// Initialize game
onMounted(() => {
  if (!gameCanvas.value) return

  ctx = gameCanvas.value.getContext('2d')
  if (!ctx) return

  // Initialize sand simulation
  sandSimulation = new SandSimulation(GRID_WIDTH, GRID_HEIGHT)

  // Spawn first piece if this is your game
  if (props.isYours) {
    spawnNewPiece()
    setupControls()
  }

  // Start game loop
  gameLoop()
})

const spawnNewPiece = () => {
  currentPiece = getRandomPiece()
  currentPiece.x = Math.floor(GRID_WIDTH / 2) - 1
  currentPiece.y = 0
}

const setupControls = () => {
  if (!props.isYours) return

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!currentPiece) return

    switch (e.key) {
      case 'ArrowLeft':
        movePiece(-1, 0)
        break
      case 'ArrowRight':
        movePiece(1, 0)
        break
      case 'ArrowDown':
        movePiece(0, 1)
        break
      case 'ArrowUp':
        rotatePiece()
        break
      case ' ':
        dropPiece()
        break
    }
  }

  document.addEventListener('keydown', handleKeyDown)

  // Clean up on unmount
  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyDown)
  })
}

const movePiece = (dx: number, dy: number) => {
  if (!currentPiece) return

  currentPiece.x += dx
  currentPiece.y += dy

  // Check collision (simple bounds check for now)
  if (currentPiece.x < 0) currentPiece.x = 0
  if (currentPiece.x + currentPiece.shape[0].length > GRID_WIDTH) {
    currentPiece.x = GRID_WIDTH - currentPiece.shape[0].length
  }

  // If piece hit bottom or other sand, lock it
  if (currentPiece.y + currentPiece.shape.length >= GRID_HEIGHT || willCollideWithSand()) {
    if (dy > 0) {
      lockPiece()
    } else {
      currentPiece.y -= dy // Revert Y movement if collision
    }
  }
}

const rotatePiece = () => {
  if (!currentPiece) return

  // Try to rotate
  const originalShape = currentPiece.shape.map(row => [...row]) // Backup original shape
  currentPiece.rotate()

  // Check if rotation is valid (bounds check)
  if (currentPiece.x + currentPiece.shape[0].length > GRID_WIDTH || willCollideWithSand()) {
    currentPiece.shape = originalShape // Revert if invalid
  }
}

const dropPiece = () => {
  if (!currentPiece) return

  while (currentPiece.y + currentPiece.shape.length < GRID_HEIGHT && !willCollideWithSand()) {
    currentPiece.y++
  }
  lockPiece()
}

const willCollideWithSand = (): boolean => {
  if (!currentPiece) return false

  // Check if piece will collide with existing sand particles
  for (let y = 0; y < currentPiece.shape.length; y++) {
    for (let x = 0; x < currentPiece.shape[y].length; x++) {
      if (currentPiece.shape[y][x]) {
        const gridX = currentPiece.x + x
        const gridY = currentPiece.y + y + 1 // Check one position below

        if (gridY >= GRID_HEIGHT) return true
        if (sandSimulation.hasParticleAt(gridX, gridY)) return true
      }
    }
  }
  return false
}

const lockPiece = () => {
  if (!currentPiece) return

  // Convert piece to sand particles
  for (let y = 0; y < currentPiece.shape.length; y++) {
    for (let x = 0; x < currentPiece.shape[y].length; x++) {
      if (currentPiece.shape[y][x]) {
        const gridX = currentPiece.x + x
        const gridY = currentPiece.y + y

        if (gridY >= 0) {
          sandSimulation.addParticle(gridX, gridY, currentPiece.color)
        }
      }
    }
  }

  // Check for completed lines
  const completedLines = sandSimulation.checkCompletedLines()
  if (completedLines.length > 0) {
    linesCleared += completedLines.length
    score += completedLines.length * 100
    sandSimulation.clearLines(completedLines)

    // Emit score update
    emit('scoreUpdate', { score, lines: linesCleared })
  }

  // Spawn new piece
  spawnNewPiece()

  // Reset drop timer
  dropTimer = 0
}

const gameLoop = () => {
  update()
  render()
  animationId = requestAnimationFrame(gameLoop)
}

const update = () => {
  // Auto-drop piece
  if (props.isYours && currentPiece) {
    dropTimer++
    if (dropTimer >= dropInterval) {
      movePiece(0, 1)
      dropTimer = 0
    }
  }

  // Update sand simulation
  sandSimulation.update()
}

const render = () => {
  if (!ctx) return

  // Clear canvas
  ctx.fillStyle = '#1f2937'
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  // Draw grid
  ctx.strokeStyle = '#374151'
  ctx.lineWidth = 1
  for (let x = 0; x <= GRID_WIDTH; x++) {
    ctx.beginPath()
    ctx.moveTo(x * CELL_SIZE, 0)
    ctx.lineTo(x * CELL_SIZE, CANVAS_HEIGHT)
    ctx.stroke()
  }
  for (let y = 0; y <= GRID_HEIGHT; y++) {
    ctx.beginPath()
    ctx.moveTo(0, y * CELL_SIZE)
    ctx.lineTo(CANVAS_WIDTH, y * CELL_SIZE)
    ctx.stroke()
  }

  // Draw sand particles
  sandSimulation.render(ctx, CELL_SIZE)

  // Draw current piece
  if (currentPiece) {
    ctx.fillStyle = currentPiece.color
    for (let y = 0; y < currentPiece.shape.length; y++) {
      for (let x = 0; x < currentPiece.shape[y].length; x++) {
        if (currentPiece.shape[y][x]) {
          const pixelX = (currentPiece.x + x) * CELL_SIZE
          const pixelY = (currentPiece.y + y) * CELL_SIZE
          ctx.fillRect(pixelX + 1, pixelY + 1, CELL_SIZE - 2, CELL_SIZE - 2)
        }
      }
    }
  }
}

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
})
</script>

<style scoped>
.tetris-game {
  position: relative;
  display: inline-block;
}

.tetris-game__canvas {
  border: 3px solid #374151;
  border-radius: 8px;
  background: #1f2937;
  display: block;
}

.tetris-game__overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 1.2rem;
  border-radius: 8px;
}
</style>
