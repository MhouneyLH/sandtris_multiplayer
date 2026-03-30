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
import { TETRIS_PIECES } from '../game/TetrisPiece'
import { useWebSocket } from '../services/websocket/useWebSocket'
import { EVENT_TYPES } from '../services/websocket/constants'
import type { PlayerInputPayload, PieceSpawnedPayload } from '../services/websocket/types'

const props = defineProps<{
  playerId: string
  matchId: string
  isYours: boolean
}>()

const emit = defineEmits<{
  scoreUpdate: [data: { score: number; lines: number }]
}>()

const { sendEvent, addEventListener, removeEventListener } = useWebSocket()

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
let removeControls: (() => void) | null = null

// Game state
let sandSimulation: SandSimulation
let score = 0
let linesCleared = 0
let spawnTimer = 0
const SPAWN_INTERVAL = 120 // Spawn every 120 frames (2 seconds at 60fps)
const NEXT_BLOCK_DELAY = 5
let activeFigureId: number | null = null
let nextFigureId = 1
let currentPattern: { shape: number[][]; color: string } | null = null

let sameColorMode = false
let lastPieceColor = '#ff0000'

const keyState = {
  left: false,
  right: false,
  down: false,
  up: false,
  space: false,
}

let lastLeftMove = 0
let lastRightMove = 0
let lastDownMove = 0
let lastRotate = 0

// Sand simulation speed (1 = fastest, higher = slower)
const SAND_UPDATE_SPEED = 4

// Initialize game
onMounted(() => {
  if (!gameCanvas.value) return

  ctx = gameCanvas.value.getContext('2d')
  if (!ctx) return

  const onCompletion = (particlesCleared: number) => {
    linesCleared += particlesCleared
    score += particlesCleared * 10 + (particlesCleared > 10 ? Math.floor(particlesCleared / 10) * 50 : 0)

    emit('scoreUpdate', { score, lines: linesCleared })
  }

  sandSimulation = new SandSimulation(GRID_WIDTH, GRID_HEIGHT, CELL_SIZE, SAND_UPDATE_SPEED, onCompletion)

  if (props.isYours) {
    spawnSandPattern()
    removeControls = setupControls()
    sendPieceSpawned()
  }

  addEventListener<PlayerInputPayload>(EVENT_TYPES.PLAYER_INPUT, handleOpponentInput)
  addEventListener<PieceSpawnedPayload>(EVENT_TYPES.PIECE_SPAWNED, handleOpponentPieceSpawned)

  gameLoop()
})

// Helper function to convert piece hex color to type
const getColorType = (hexColor: string): string => {
  // Map piece colors to simplified types
  const colorMap: { [key: string]: string } = {
    '#ff0000': 'red',     // Red
    '#ed4444': 'red',     // Red variant
    '#f14545': 'red',     // Red variant
    '#ef4444': 'red',     // Red - actual color from TetrisPiece.ts
    '#00ff00': 'green',   // Green
    '#22c65e': 'green',   // Green variant
    '#22c75f': 'green',   // Green variant
    '#22c45d': 'green',   // Green variant
    '#22c55e': 'green',   // Green - actual color from TetrisPiece.ts
    '#0000ff': 'blue',    // Blue
    '#3b83f7': 'blue',    // Blue variant
    '#3b82f6': 'blue',    // Blue - actual color from TetrisPiece.ts
    '#ffff00': 'yellow',  // Yellow
    '#e8b208': 'yellow',  // Yellow variant
    '#f59e0b': 'yellow',  // Yellow variant
    '#eab308': 'yellow',  // Yellow - actual color from TetrisPiece.ts
  }

  const type = colorMap[hexColor]
  if (!type) {
    console.warn(`Unknown color ${hexColor}, defaulting to 'red'`)
    return 'red'
  }
  return type
}

const getRandomPattern = (): { shape: number[][]; color: string } => {
  const pieces = Object.values(TETRIS_PIECES)
  const pieceData = pieces[Math.floor(Math.random() * pieces.length)] ?? TETRIS_PIECES.I

  return {
    shape: pieceData.shape.map((row: number[]) => [...row]),
    color: pieceData.color,
  }
}

const sendPlayerInput = (inputData: any) => {
  if (!props.isYours) return

  sendEvent({
    eventType: EVENT_TYPES.PLAYER_INPUT,
    matchId: props.matchId,
    playerId: props.playerId,
    playerInputData: inputData,
  })
}

const sendPieceSpawned = () => {
  if (!props.isYours || !currentPattern) return

  sendEvent({
    eventType: EVENT_TYPES.PIECE_SPAWNED,
    matchId: props.matchId,
    playerId: props.playerId,
    shape: currentPattern.shape,
    color: currentPattern.color,
  })
}

const handleOpponentInput = (payload: PlayerInputPayload) => {
  if (payload.playerId !== props.playerId || props.isYours) return

  const inputData = payload.playerInputData

  if (activeFigureId === null) return

  if (inputData.dataTypeName === 'move') {
    sandSimulation.moveGroupByTetrisCells(activeFigureId, inputData.deltaX, inputData.deltaY, CELL_SIZE)
  } else if (inputData.dataTypeName === 'rotate' && inputData.clockwise) {
    sandSimulation.rotateGroupClockwise(activeFigureId)
  } else if (inputData.dataTypeName === 'drop') {
    while (sandSimulation.moveGroupByTetrisCells(activeFigureId, 0, 1, CELL_SIZE)) {
    }
  }
}

const handleOpponentPieceSpawned = (payload: PieceSpawnedPayload) => {
  if (payload.playerId !== props.playerId || props.isYours) return

  if (payload.shape && payload.color) {
    spawnSandPattern({ shape: payload.shape, color: payload.color })
  }
}

const setupControls = () => {
  if (!props.isYours) return () => { }

  const handleKeyDown = (e: KeyboardEvent) => {
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
        sandSimulation.createTestLine(Math.floor(GRID_HEIGHT * 0.8), 'red', '#ff0000')
        handled = true
        break
      case 'y':  // Test diagonal line
      case 'Y':
        console.log('Creating test diagonal line...')
        sandSimulation.createTestDiagonal('green', '#00ff00')
        handled = true
        break
      case 'r':  // Test zigzag line
      case 'R':
        console.log('Creating test zigzag line...')
        sandSimulation.createTestZigzag('blue', '#0000ff')
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
      case 'p':  // Show particle types
      case 'P':
        console.log('Showing particle types around borders...')
        sandSimulation.debugShowTypes(0, 140, 10, 10) // Left side bottom
        sandSimulation.debugShowTypes(65, 140, 10, 10) // Right side bottom
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

  return () => {
    document.removeEventListener('keydown', handleKeyDown)
    document.removeEventListener('keyup', handleKeyUp)
  }
}

const canSpawnPatternAt = (shape: number[][], targetX: number, targetY: number): boolean => {
  for (let y = 0; y < shape.length; y++) {
    const row = shape[y]
    if (!row) continue

    for (let x = 0; x < row.length; x++) {
      if (!row[x]) continue

      const gridX = targetX + x
      const gridY = targetY + y

      if (gridX < 0 || gridX >= GRID_WIDTH || gridY >= GRID_HEIGHT) {
        return false
      }

      if (gridY >= 0 && sandSimulation.hasParticleAt(gridX, gridY, CELL_SIZE)) {
        return false
      }
    }
  }

  return true
}

const spawnSandPattern = (providedPattern?: { shape: number[][]; color: string }): boolean => {
  const pattern = providedPattern || getRandomPattern()
  currentPattern = pattern

  const firstRow = pattern.shape[0] ?? []
  const spawnX = Math.floor((GRID_WIDTH - firstRow.length) / 2)
  const spawnY = 0
  const figureId = nextFigureId++

  if (!canSpawnPatternAt(pattern.shape, spawnX, spawnY)) {
    return false
  }

  const pieceColor = sameColorMode ? lastPieceColor : pattern.color
  if (!sameColorMode) {
    lastPieceColor = pieceColor
  }
  const pieceType = getColorType(pieceColor)

  for (let y = 0; y < pattern.shape.length; y++) {
    const row = pattern.shape[y]
    if (!row) continue

    for (let x = 0; x < row.length; x++) {
      if (!row[x]) continue

      const gridX = spawnX + x
      const gridY = spawnY + y
      const colorVariation = Math.random() * 0.02 - 0.01
      const variedColor = varyColor(pieceColor, colorVariation)
      sandSimulation.fillTetrisBlock(gridX, gridY, variedColor, pieceType, CELL_SIZE, figureId)
    }
  }

  activeFigureId = figureId

  return true
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
  if (props.isYours) {
    const now = Date.now()

    if (activeFigureId !== null && !sandSimulation.hasGroupParticles(activeFigureId)) {
      activeFigureId = null
    }

    if (activeFigureId !== null) {
      if (!sandSimulation.canMoveGroupByTetrisCells(activeFigureId, 0, 1, CELL_SIZE)) {
        sandSimulation.releaseGroup(activeFigureId)
        activeFigureId = null
        spawnTimer = Math.max(0, SPAWN_INTERVAL - NEXT_BLOCK_DELAY)
      }
    }

    if (activeFigureId !== null) {
      if (keyState.left && now - lastLeftMove > 90) {
        if (sandSimulation.moveGroupByTetrisCells(activeFigureId, -1, 0, CELL_SIZE)) {
          sendPlayerInput({ dataTypeName: 'move', deltaX: -1, deltaY: 0 })
        }
        lastLeftMove = now
      }

      if (keyState.right && now - lastRightMove > 90) {
        if (sandSimulation.moveGroupByTetrisCells(activeFigureId, 1, 0, CELL_SIZE)) {
          sendPlayerInput({ dataTypeName: 'move', deltaX: 1, deltaY: 0 })
        }
        lastRightMove = now
      }

      if (keyState.down && now - lastDownMove > 50) {
        if (sandSimulation.moveGroupByTetrisCells(activeFigureId, 0, 1, CELL_SIZE)) {
          sendPlayerInput({ dataTypeName: 'move', deltaX: 0, deltaY: 1 })
        }
        lastDownMove = now
      }

      if (keyState.up && now - lastRotate > 150) {
        sandSimulation.rotateGroupClockwise(activeFigureId)
        sendPlayerInput({ dataTypeName: 'rotate', clockwise: true })
        lastRotate = now
      }

      if (keyState.space) {
        sendPlayerInput({ dataTypeName: 'drop' })
        while (sandSimulation.moveGroupByTetrisCells(activeFigureId, 0, 1, CELL_SIZE)) {
        }
        keyState.space = false
      }
    }

    if (activeFigureId === null) {
      spawnTimer += 1
      if (spawnTimer >= SPAWN_INTERVAL) {
        if (spawnSandPattern()) {
          spawnTimer = 0
          sendPieceSpawned()
        } else {
          spawnTimer = SPAWN_INTERVAL - 10
        }
      }
    }
  }

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

}

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  removeControls?.()

  removeEventListener<PlayerInputPayload>(EVENT_TYPES.PLAYER_INPUT, handleOpponentInput)
  removeEventListener<PieceSpawnedPayload>(EVENT_TYPES.PIECE_SPAWNED, handleOpponentPieceSpawned)
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
