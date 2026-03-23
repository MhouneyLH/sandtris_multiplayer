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
const VISUAL_WIDTH = 10    // Visual Tetris blocks width
const VISUAL_HEIGHT = 20   // Visual Tetris blocks height
const BLOCK_SIZE = 30      // Visual size of one Tetris block (30px)

const CANVAS_WIDTH = VISUAL_WIDTH * BLOCK_SIZE   // 300px
const CANVAS_HEIGHT = VISUAL_HEIGHT * BLOCK_SIZE // 600px

// For now, keep particle system simple - we'll enhance it later
const GRID_WIDTH = VISUAL_WIDTH
const GRID_HEIGHT = VISUAL_HEIGHT
const CELL_SIZE = BLOCK_SIZE

const gameCanvas = ref<HTMLCanvasElement>()
let ctx: CanvasRenderingContext2D | null = null
let animationId: number | null = null

// Game state
let sandSimulation: SandSimulation
let currentPiece: TetrisPiece | null = null
let score = 0
let linesCleared = 0
let dropTimer = 0
let dropInterval = 120 // Drop every 120 frames (2 seconds at 60fps)

// Debug mode: same color spawning
let sameColorMode = false
let lastPieceColor = '#ff0000' // Default red

// Key state tracking for simultaneous key presses
const keyState = {
  left: false,
  right: false,
  down: false,
  up: false,
  space: false
}

// Simple timers to prevent too-fast input
let lastLeftMove = 0
let lastRightMove = 0
let lastRotate = 0
let lastDrop = 0

// Sand simulation speed (1 = fastest, higher = slower)
const SAND_UPDATE_SPEED = 4

// Initialize game
onMounted(() => {
  if (!gameCanvas.value) return

  ctx = gameCanvas.value.getContext('2d')
  if (!ctx) return

  // Initialize sand simulation (using tetris grid dimensions)
  sandSimulation = new SandSimulation(GRID_WIDTH, GRID_HEIGHT, CELL_SIZE, SAND_UPDATE_SPEED)

  // Example: To change sand speed during gameplay:
  // sandSimulation.setSandSpeed(1)  // Fastest (every frame)
  // sandSimulation.setSandSpeed(3)  // Slower (every 3 frames)
  // sandSimulation.setSandSpeed(5)  // Much slower (every 5 frames)

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
  currentPiece.x = Math.floor(VISUAL_WIDTH / 2) - 1
  currentPiece.y = 0

  // In same color mode, override the piece color
  if (sameColorMode) {
    currentPiece.color = lastPieceColor
  } else {
    // Store the color for potential same color mode
    lastPieceColor = currentPiece.color
  }
}

const setupControls = () => {
  if (!props.isYours) return

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!currentPiece) return

    let handled = false

    switch (e.key) {
      case 'ArrowLeft':
        keyState.left = true
        handled = true
        break
      case 'ArrowRight':
        keyState.right = true
        handled = true
        break
      case 'ArrowDown':
        keyState.down = true
        handled = true
        break
      case 'ArrowUp':
        keyState.up = true
        handled = true
        break
      case ' ':
        keyState.space = true
        handled = true
        break
      case 't':  // Test horizontal line
      case 'T':
        console.log('Creating test horizontal line...')
        sandSimulation.createTestLine(Math.floor(GRID_HEIGHT * 0.8), '#ff0000')
        handled = true
        break
      case 'y':  // Test diagonal line
      case 'Y':
        console.log('Creating test diagonal line...')
        sandSimulation.createTestDiagonal('#00ff00')
        handled = true
        break
      case 'r':  // Test zigzag line
      case 'R':
        console.log('Creating test zigzag line...')
        sandSimulation.createTestZigzag('#0000ff')
        handled = true
        break
      case 'u':  // Manually trigger completion check
      case 'U':
        console.log('Manually checking for completions...')
        const testCompletions = sandSimulation.debugCheckCompletedLines() // Use verbose debug version
        console.log('Manual check found', testCompletions.length, 'completions')
        if (testCompletions.length > 0) {
          sandSimulation.clearConnectedGroups()
        }
        handled = true
        break
      case 'i':  // Debug print grid
      case 'I':
        console.log('Printing grid state...')
        sandSimulation.debugPrintGrid()
        handled = true
        break
      case 'c':  // Clear all particles
      case 'C':
        console.log('Clearing all particles...')
        sandSimulation.clearAll()
        handled = true
        break
      case 's':  // Toggle same color mode
      case 'S':
        sameColorMode = !sameColorMode
        console.log(`Same color mode: ${sameColorMode ? 'ON' : 'OFF'}${sameColorMode ? ` (color: ${lastPieceColor})` : ''}`)
        handled = true
        break
    }

    if (handled) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  const handleKeyUp = (e: KeyboardEvent) => {
    let handled = false

    switch (e.key) {
      case 'ArrowLeft':
        keyState.left = false
        handled = true
        break
      case 'ArrowRight':
        keyState.right = false
        handled = true
        break
      case 'ArrowDown':
        keyState.down = false
        handled = true
        break
      case 'ArrowUp':
        keyState.up = false
        handled = true
        break
      case ' ':
        keyState.space = false
        handled = true
        break
    }

    if (handled) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  document.addEventListener('keydown', handleKeyDown)
  document.addEventListener('keyup', handleKeyUp)

  // Clean up on unmount
  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyDown)
    document.removeEventListener('keyup', handleKeyUp)
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
        if (sandSimulation.hasParticleAt(gridX, gridY, CELL_SIZE)) return true
      }
    }
  }
  return false
}

const lockPiece = () => {
  if (!currentPiece) return

  // Convert tetris piece to sand - fill each block completely with tiny sand particles
  for (let y = 0; y < currentPiece.shape.length; y++) {
    for (let x = 0; x < currentPiece.shape[y].length; x++) {
      if (currentPiece.shape[y][x]) {
        const gridX = currentPiece.x + x
        const gridY = currentPiece.y + y

        if (gridY >= 0) {
          // In same color mode, don't vary the color to ensure perfect matching
          const finalColor = sameColorMode ? currentPiece.color : (() => {
            // Very minimal color variation for cleaner look
            const colorVariation = Math.random() * 0.02 - 0.01 // ±1% brightness (much less variation)
            return varyColor(currentPiece.color, colorVariation)
          })()

          // Fill the entire tetris block area with sand particles
          sandSimulation.fillTetrisBlock(gridX, gridY, finalColor, CELL_SIZE)
        }
      }
    }
  }

  // Check for completed lines
  console.log('Checking for completions after piece lock...')
  const completedLines = sandSimulation.checkCompletedLines()
  console.log('TetrisGame: Found', completedLines.length, 'completed groups')
  if (completedLines.length > 0) {
    // Count particles that will be cleared for scoring
    const particlesCleared = sandSimulation.countParticlesInConnectedGroups()
    console.log('TetrisGame: Will clear', particlesCleared, 'particles')

    linesCleared += particlesCleared // Now represents particles cleared, not lines
    score += particlesCleared * 10 + (particlesCleared > 10 ? Math.floor(particlesCleared / 10) * 50 : 0) // Bonus for larger groups

    sandSimulation.clearConnectedGroups()

    // Emit score update
    emit('scoreUpdate', { score, lines: linesCleared })
  }

  // Spawn new piece
  spawnNewPiece()

  // Reset drop timer
  dropTimer = 0
}

// Helper function to vary color brightness
const varyColor = (color: string, variation: number): string => {
  // Parse hex color
  const hex = color.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)

  // Apply variation
  const newR = Math.max(0, Math.min(255, Math.round(r * (1 + variation))))
  const newG = Math.max(0, Math.min(255, Math.round(g * (1 + variation))))
  const newB = Math.max(0, Math.min(255, Math.round(b * (1 + variation))))

  // Convert back to hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
}

const gameLoop = () => {
  update()
  render()
  animationId = requestAnimationFrame(gameLoop)
}

const update = () => {
  // Process key inputs if this is your game
  if (props.isYours && currentPiece) {
    const currentFrame = Date.now()

    // Handle left movement (not too fast)
    if (keyState.left && currentFrame - lastLeftMove > 100) { // 100ms delay
      movePiece(-1, 0)
      lastLeftMove = currentFrame
    }

    // Handle right movement (not too fast)
    if (keyState.right && currentFrame - lastRightMove > 100) { // 100ms delay
      movePiece(1, 0)
      lastRightMove = currentFrame
    }

    // Handle down movement (faster drop)
    if (keyState.down && currentFrame - lastDrop > 50) { // 50ms delay when pressing down
      movePiece(0, 1)
      lastDrop = currentFrame
      dropTimer = 0 // Reset auto-drop timer
    }

    // Handle rotation (only once per press)
    if (keyState.up && currentFrame - lastRotate > 150) { // 150ms delay to prevent multiple rotations
      rotatePiece()
      lastRotate = currentFrame
    }

    // Handle hard drop (only once per press)
    if (keyState.space) {
      dropPiece()
      keyState.space = false // Reset immediately to prevent repeat
    }

    // Auto-drop piece (only if down key is not pressed)
    if (!keyState.down) {
      dropTimer++
      if (dropTimer >= dropInterval) {
        movePiece(0, 1)
        dropTimer = 0
      }
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
  sandSimulation.render(ctx)

  // Draw current piece (solid blocks with nice appearance)
  if (currentPiece) {
    for (let y = 0; y < currentPiece.shape.length; y++) {
      for (let x = 0; x < currentPiece.shape[y].length; x++) {
        if (currentPiece.shape[y][x]) {
          const pixelX = (currentPiece.x + x) * CELL_SIZE
          const pixelY = (currentPiece.y + y) * CELL_SIZE

          // Main block
          ctx.fillStyle = currentPiece.color
          ctx.fillRect(pixelX + 1, pixelY + 1, CELL_SIZE - 2, CELL_SIZE - 2)

          // Add 3D effect with highlights and shadows for falling pieces
          // Highlight (top-left)
          ctx.fillStyle = lightenColor(currentPiece.color, 0.3)
          ctx.fillRect(pixelX + 1, pixelY + 1, CELL_SIZE - 2, 3)
          ctx.fillRect(pixelX + 1, pixelY + 1, 3, CELL_SIZE - 2)

          // Shadow (bottom-right)
          ctx.fillStyle = darkenColor(currentPiece.color, 0.3)
          ctx.fillRect(pixelX + 1, pixelY + CELL_SIZE - 4, CELL_SIZE - 2, 3)
          ctx.fillRect(pixelX + CELL_SIZE - 4, pixelY + 1, 3, CELL_SIZE - 2)

          // Inner border for definition
          ctx.strokeStyle = darkenColor(currentPiece.color, 0.2)
          ctx.lineWidth = 1
          ctx.strokeRect(pixelX + 2, pixelY + 2, CELL_SIZE - 4, CELL_SIZE - 4)
        }
      }
    }
  }
}

// Helper functions for piece rendering
const lightenColor = (color: string, factor: number): string => {
  const hex = color.replace('#', '')
  const r = Math.min(255, Math.round(parseInt(hex.substr(0, 2), 16) * (1 + factor)))
  const g = Math.min(255, Math.round(parseInt(hex.substr(2, 2), 16) * (1 + factor)))
  const b = Math.min(255, Math.round(parseInt(hex.substr(4, 2), 16) * (1 + factor)))
  return `rgb(${r}, ${g}, ${b})`
}

const darkenColor = (color: string, factor: number): string => {
  const hex = color.replace('#', '')
  const r = Math.max(0, Math.round(parseInt(hex.substr(0, 2), 16) * (1 - factor)))
  const g = Math.max(0, Math.round(parseInt(hex.substr(2, 2), 16) * (1 - factor)))
  const b = Math.max(0, Math.round(parseInt(hex.substr(4, 2), 16) * (1 - factor)))
  return `rgb(${r}, ${g}, ${b})`
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
