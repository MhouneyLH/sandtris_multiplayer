interface SandParticle {
  color: string // Visual color (can be varied)
  type: string // Logical type for grouping ("red", "green", "blue", "yellow")
  groupId?: number
}

export class SandSimulation {
  private particles: (SandParticle | null)[][] = [] // 2D grid of tiny particles
  private width: number
  private height: number
  private particleSize: number // Size of each sand grain in pixels (2x2 or 4x4)
  private frameCounter: number = 0
  private updateInterval: number // How many frames between sand updates (lower = faster)
  private clearingAnimation: Set<string> = new Set() // Track particles being cleared with white animation
  private clearingAnimationFrames = 0
  private completionCallback?: (particlesCleared: number) => void
  private lastCompletionCheck = 0
  private completionCheckInterval = 10 // Check for completions every 10 frames

  constructor(
    tetrisWidth: number,
    tetrisHeight: number,
    tetrisCellSize: number = 30,
    sandUpdateSpeed: number = 1,
    onCompletion?: (particlesCleared: number) => void,
  ) {
    // Create a fine grid where each sand particle is 4x4 pixels
    this.particleSize = 4
    this.width = Math.floor((tetrisWidth * tetrisCellSize) / this.particleSize)
    this.height = Math.floor((tetrisHeight * tetrisCellSize) / this.particleSize)

    // Set sand update frequency (1 = every frame, 2 = every 2 frames, etc.)
    this.updateInterval = sandUpdateSpeed

    // Store completion callback
    this.completionCallback = onCompletion

    // Initialize 2D array with null values
    this.particles = Array.from({ length: this.height }, () =>
      Array.from({ length: this.width }, () => null),
    )
  }

  // Convert tetris grid coordinates to sand particle coordinates
  private tetrisToSand(tetrisX: number, tetrisY: number, tetrisCellSize: number) {
    const sandCellsPerTetrisCell = Math.max(1, Math.floor(tetrisCellSize / this.particleSize))

    return {
      sandX: tetrisX * sandCellsPerTetrisCell,
      sandY: tetrisY * sandCellsPerTetrisCell,
      sandWidth: sandCellsPerTetrisCell,
      sandHeight: sandCellsPerTetrisCell,
    }
  }

  // Fill a tetris block area with sand particles
  fillTetrisBlock(
    tetrisX: number,
    tetrisY: number,
    visualColor: string,
    type: string,
    tetrisCellSize: number = 30,
    groupId?: number,
  ): void {
    const { sandX, sandY, sandWidth, sandHeight } = this.tetrisToSand(
      tetrisX,
      tetrisY,
      tetrisCellSize,
    )

    // Fill the entire tetris block area with sand particles
    for (let y = sandY; y < sandY + sandHeight && y < this.height; y++) {
      for (let x = sandX; x < sandX + sandWidth && x < this.width; x++) {
        if (x >= 0 && y >= 0) {
          this.particles[y][x] = { color: visualColor, type, groupId }
        }
      }
    }
  }

  hasGroupParticles(groupId: number): boolean {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const particle = this.particles[y][x]
        if (particle?.groupId === groupId) {
          return true
        }
      }
    }
    return false
  }

  canMoveGroupByTetrisCells(
    groupId: number,
    dxCells: number,
    dyCells: number,
    tetrisCellSize: number = 30,
  ): boolean {
    const { sandWidth, sandHeight } = this.tetrisToSand(0, 0, tetrisCellSize)
    const dx = dxCells * sandWidth
    const dy = dyCells * sandHeight

    if (dx === 0 && dy === 0) return true

    const groupKeys = new Set<string>()
    let hasAnyParticle = false

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const particle = this.particles[y][x]
        if (particle?.groupId === groupId) {
          groupKeys.add(`${x},${y}`)
          hasAnyParticle = true
        }
      }
    }

    if (!hasAnyParticle) return false

    for (const key of groupKeys) {
      const [x, y] = key.split(',').map(Number)
      const targetX = x + dx
      const targetY = y + dy

      if (targetX < 0 || targetX >= this.width || targetY < 0 || targetY >= this.height) {
        return false
      }

      const targetParticle = this.particles[targetY][targetX]
      if (targetParticle && !groupKeys.has(`${targetX},${targetY}`)) {
        return false
      }
    }

    return true
  }

  moveGroupByTetrisCells(
    groupId: number,
    dxCells: number,
    dyCells: number,
    tetrisCellSize: number = 30,
  ): boolean {
    if (!this.canMoveGroupByTetrisCells(groupId, dxCells, dyCells, tetrisCellSize)) {
      return false
    }

    const { sandWidth, sandHeight } = this.tetrisToSand(0, 0, tetrisCellSize)
    const dx = dxCells * sandWidth
    const dy = dyCells * sandHeight

    if (dx === 0 && dy === 0) return true

    const positions: { x: number; y: number; particle: SandParticle }[] = []
    const groupKeys = new Set<string>()

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const particle = this.particles[y][x]
        if (particle?.groupId === groupId) {
          positions.push({ x, y, particle })
          groupKeys.add(`${x},${y}`)
        }
      }
    }

    if (positions.length === 0) return false

    const ordered = [...positions]
    ordered.sort((a, b) => {
      if (dy > 0) return b.y - a.y
      if (dy < 0) return a.y - b.y
      if (dx > 0) return b.x - a.x
      if (dx < 0) return a.x - b.x
      return 0
    })

    for (const { x, y } of ordered) {
      this.particles[y][x] = null
    }

    for (const { x, y, particle } of ordered) {
      this.particles[y + dy][x + dx] = particle
    }

    return true
  }

  releaseGroup(groupId: number): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const particle = this.particles[y][x]
        if (particle?.groupId === groupId) {
          delete particle.groupId
        }
      }
    }
  }

  rotateGroupClockwise(groupId: number): boolean {
    const positions: { x: number; y: number; particle: SandParticle }[] = []
    const groupKeys = new Set<string>()

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const particle = this.particles[y][x]
        if (particle?.groupId === groupId) {
          positions.push({ x, y, particle })
          groupKeys.add(`${x},${y}`)
        }
      }
    }

    if (positions.length === 0) return false

    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (const { x, y } of positions) {
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }

    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    const rotated = positions.map(({ x, y, particle }) => {
      const relX = x - centerX
      const relY = y - centerY
      const targetX = Math.round(centerX - relY)
      const targetY = Math.round(centerY + relX)
      return { x, y, targetX, targetY, particle }
    })

    for (const { targetX, targetY } of rotated) {
      if (targetX < 0 || targetX >= this.width || targetY < 0 || targetY >= this.height) {
        return false
      }
      const targetParticle = this.particles[targetY][targetX]
      if (targetParticle && !groupKeys.has(`${targetX},${targetY}`)) {
        return false
      }
    }

    for (const { x, y } of positions) {
      this.particles[y][x] = null
    }

    for (const { targetX, targetY, particle } of rotated) {
      this.particles[targetY][targetX] = particle
    }

    return true
  }

  // Check if any sand particle exists in a tetris block area
  hasParticleAt(tetrisX: number, tetrisY: number, tetrisCellSize: number = 30): boolean {
    if (tetrisX < 0 || tetrisY < 0) return true

    const { sandX, sandY, sandWidth, sandHeight } = this.tetrisToSand(
      tetrisX,
      tetrisY,
      tetrisCellSize,
    )

    // Check if any particle exists in this tetris block area
    for (let y = sandY; y < sandY + sandHeight && y < this.height; y++) {
      for (let x = sandX; x < sandX + sandWidth && x < this.width; x++) {
        if (x >= 0 && y >= 0 && this.particles[y][x] !== null) {
          return true
        }
      }
    }
    return false
  }

  update(): void {
    // Control sand update frequency
    this.frameCounter++
    if (this.frameCounter % this.updateInterval !== 0) return

    // Handle clearing animation
    if (this.clearingAnimation.size > 0) {
      this.clearingAnimationFrames++

      // Animation lasts for about 30 frames (0.5 seconds at 60fps) - faster now
      const animationDuration = 30
      if (this.clearingAnimationFrames >= animationDuration) {
        // Animation complete - actually clear the particles
        for (const particleKey of this.clearingAnimation) {
          const [x, y] = particleKey.split(',').map(Number)
          this.particles[y][x] = null
        }
        this.clearingAnimation.clear()
        this.clearingAnimationFrames = 0
        // Don't run physics this frame to let particles settle
        return
      }
      // During animation, don't run sand physics
      return
    }

    // Simple sand physics exactly like the CodePen - process from bottom-right to top-left
    for (let y = this.height - 2; y >= 0; y--) {
      for (let x = this.width - 1; x >= 0; x--) {
        const particle = this.particles[y][x]
        if (!particle) continue

        // Check if particle can move (not at bottom and has space to move)
        let moved = false

        // CodePen physics: try down, then down-right, then down-left
        if (y < this.height - 1 && !this.particles[y + 1][x]) {
          // Fall straight down
          this.particles[y][x] = null
          this.particles[y + 1][x] = particle
          moved = true
        } else if (y < this.height - 1 && x < this.width - 1 && !this.particles[y + 1][x + 1]) {
          // Fall down-right
          this.particles[y][x] = null
          this.particles[y + 1][x + 1] = particle
          moved = true
        } else if (y < this.height - 1 && x > 0 && !this.particles[y + 1][x - 1]) {
          // Fall down-left
          this.particles[y][x] = null
          this.particles[y + 1][x - 1] = particle
          moved = true
        }
        // If particle is at the very bottom row, it should never try to move
        // The condition y < this.height - 1 already handles this
      }
    }

    // Check for completions periodically (not every frame for performance)
    this.lastCompletionCheck++
    if (this.lastCompletionCheck >= this.completionCheckInterval) {
      this.lastCompletionCheck = 0
      this.checkForCompletionsAndNotify()
    }
  }

  private checkForCompletionsAndNotify(): void {
    const completedLines = this.checkCompletedLines()
    if (completedLines.length > 0) {
      // Count particles that will be cleared
      const particlesCleared = this.countParticlesInConnectedGroups()

      console.log(`🎯 Auto-detected completion: ${particlesCleared} particles will be cleared`)

      // Clear the groups immediately
      this.clearConnectedGroups()

      // Notify the game through callback
      if (this.completionCallback) {
        this.completionCallback(particlesCleared)
      }
    }
  }

  checkCompletedLines(): { x: number; y: number }[][] {
    // Find same-type connected groups that span from left border to right border
    const connectedGroups: { x: number; y: number }[][] = []
    const visited = Array.from({ length: this.height }, () => Array(this.width).fill(false))

    console.log(`🔍 Checking for completions...`)

    // Check each particle on the left border
    for (let y = 0; y < this.height; y++) {
      const leftParticle = this.particles[y][0]
      if (!leftParticle || visited[y][0]) continue

      console.log(`🔍 Starting flood fill from (0,${y}) with type: '${leftParticle.type}'`)

      // Find connected group starting from this left border particle
      const group = this.floodFill(0, y, leftParticle.type, visited)

      // Check if this group reaches the right border
      const reachesRightBorder = group.some((pos) => pos.x === this.width - 1)

      console.log(
        `🔍 Group from (0,${y}): type='${leftParticle.type}', ${group.length} particles, reaches right border: ${reachesRightBorder}`,
      )

      if (reachesRightBorder) {
        connectedGroups.push(group)
        console.log(
          `✅ Found spanning group: ${group.length} particles of type '${leftParticle.type}'`,
        )
      }
    }

    console.log(`🎯 Total spanning groups found: ${connectedGroups.length}`)
    return connectedGroups
  }

  // Flood fill to find all connected particles of the same type
  private floodFill(
    startX: number,
    startY: number,
    type: string,
    visited: boolean[][],
  ): { x: number; y: number }[] {
    const group: { x: number; y: number }[] = []
    const stack = [{ x: startX, y: startY }]

    while (stack.length > 0) {
      const { x, y } = stack.pop()!

      // Check bounds and if already visited
      if (x < 0 || x >= this.width || y < 0 || y >= this.height || visited[y][x]) {
        continue
      }

      const particle = this.particles[y][x]
      if (!particle) {
        continue
      }

      if (particle.type !== type) {
        // Debug: Log type mismatches to see if mixed types are being processed
        if (group.length < 10) {
          // Only log first few mismatches to avoid spam
          console.log(
            `🚫 Type mismatch at (${x},${y}): expected '${type}', found '${particle.type}'`,
          )
        }
        continue
      }

      // Mark as visited and add to group
      visited[y][x] = true
      group.push({ x, y })

      // Add adjacent cells to stack (4-directional connectivity)
      stack.push({ x: x + 1, y })
      stack.push({ x: x - 1, y })
      stack.push({ x, y: y + 1 })
      stack.push({ x, y: y - 1 })
    }

    return group
  }

  countParticlesInConnectedGroups(): number {
    // Count particles in all connected groups that span from left to right
    const connectedGroups = this.checkCompletedLines()

    let totalCount = 0
    for (const group of connectedGroups) {
      totalCount += group.length
    }

    return totalCount
  }

  clearConnectedGroups(): void {
    const connectedGroups = this.checkCompletedLines()
    if (connectedGroups.length === 0) return

    console.log(`Found ${connectedGroups.length} connected groups to clear`)

    // Start clearing animation for all particles in the connected groups
    this.clearingAnimation.clear()
    this.clearingAnimationFrames = 0

    for (const group of connectedGroups) {
      for (const { x, y } of group) {
        this.clearingAnimation.add(`${x},${y}`)
      }
    }

    // The actual clearing will happen in the update loop after animation completes
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Draw each sand particle as a small colored square
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const particle = this.particles[y][x]
        if (particle) {
          const particleKey = `${x},${y}`

          // Check if this particle is being cleared with animation
          if (this.clearingAnimation.has(particleKey)) {
            // White flickering animation - alternate between white and original color
            const flickerSpeed = 4 // Faster flicker now (was 8)
            const isWhite = Math.floor(this.clearingAnimationFrames / flickerSpeed) % 2 === 0
            ctx.fillStyle = isWhite ? 'white' : particle.color
          } else {
            ctx.fillStyle = particle.color
          }

          ctx.fillRect(
            x * this.particleSize,
            y * this.particleSize,
            this.particleSize,
            this.particleSize,
          )
        }
      }
    }
  }

  // Adjust sand simulation speed (1 = fastest, higher numbers = slower)
  setSandSpeed(speed: number): void {
    this.updateInterval = Math.max(1, speed) // Ensure minimum speed of 1
  }

  // Get current sand speed
  getSandSpeed(): number {
    return this.updateInterval
  }

  // Get all particles (for debugging/state sync)
  getParticles(): SandParticle[][] {
    return this.particles
  }

  // Set particles state (for receiving from network)
  setParticles(particles: SandParticle[][]): void {
    this.particles = particles
  }

  // Testing function - create a simple horizontal line for debugging
  createTestLine(y: number, type: string = 'red', color: string = '#ff0000'): void {
    console.log(
      `Creating test line at y=${y} with type ${type} and color ${color} spanning full width (0 to ${this.width - 1})`,
    )
    for (let x = 0; x < this.width; x++) {
      this.particles[y][x] = { color, type }
    }
  }

  // Testing function - create a diagonal line for debugging
  createTestDiagonal(type: string = 'green', color: string = '#00ff00'): void {
    console.log(
      `Creating test diagonal with type ${type} and color ${color} from (0,0) to (${this.width - 1},${this.height - 1})`,
    )

    // Create a thick connected diagonal to ensure no gaps
    for (let x = 0; x < this.width; x++) {
      // Calculate corresponding y position for this x
      const y = Math.floor((x * (this.height - 1)) / (this.width - 1))

      // Place particle at main diagonal position
      if (y < this.height) {
        this.particles[y][x] = { color, type }

        // Add thickness to ensure connectivity (3 pixels thick)
        if (y > 0) this.particles[y - 1][x] = { color, type }
        if (y < this.height - 1) this.particles[y + 1][x] = { color, type }
      }
    }

    console.log(`Diagonal created: should span x=0 to x=${this.width - 1}`)
  }

  // Testing function - create a zigzag pattern for debugging
  createTestZigzag(type: string = 'blue', color: string = '#0000ff'): void {
    console.log(`Creating test zigzag with type ${type} and color ${color} spanning full width`)
    const midY = Math.floor(this.height * 0.7)

    // Create a zigzag pattern that definitely spans left to right
    for (let x = 0; x < this.width; x++) {
      const zigzagOffset = Math.sin(x * 0.3) * 10 // ±10 pixel zigzag
      const y = Math.floor(midY + zigzagOffset)

      if (y >= 0 && y < this.height) {
        this.particles[y][x] = { color, type }

        // Add some vertical connectivity to ensure the path is connected
        if (y > 0) this.particles[y - 1][x] = { color, type }
        if (y < this.height - 1) this.particles[y + 1][x] = { color, type }
      }
    }
  }

  // Debug function - print grid state to console
  debugPrintGrid(): void {
    console.log(`Grid state (${this.width}x${this.height}):`)
    for (let y = 0; y < this.height; y++) {
      let row = ''
      for (let x = 0; x < this.width; x++) {
        if (this.particles[y][x]) {
          row += '█'
        } else {
          row += '.'
        }
      }
      console.log(`${y.toString().padStart(2, '0')}: ${row}`)
    }
  }

  // Clear all particles for testing
  clearAll(): void {
    console.log('Clearing all particles...')
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.particles[y][x] = null
      }
    }
  }

  // Debug: Show types in a small region
  debugShowTypes(
    startX: number = 0,
    startY: number = 0,
    width: number = 10,
    height: number = 10,
  ): void {
    console.log(
      `🔍 Particle types in region (${startX},${startY}) to (${startX + width - 1},${startY + height - 1}):`,
    )
    for (let y = startY; y < Math.min(startY + height, this.height); y++) {
      let row = `${y.toString().padStart(3, ' ')}: `
      for (let x = startX; x < Math.min(startX + width, this.width); x++) {
        const particle = this.particles[y][x]
        if (particle) {
          row += particle.type.charAt(0).toUpperCase() // R, G, B, Y
        } else {
          row += '.'
        }
      }
      console.log(row)
    }
  }

  // Debug version of checkCompletedLines with verbose logging
  debugCheckCompletedLines(): { x: number; y: number }[][] {
    const connectedGroups: { x: number; y: number }[][] = []
    const visited = Array.from({ length: this.height }, () => Array(this.width).fill(false))

    console.log(`🔍 DEBUG: Checking for completed lines in ${this.width}x${this.height} grid`)

    // Debug: Show types on left and right borders
    console.log(`🔍 Left border types:`)
    for (let y = 0; y < Math.min(10, this.height); y++) {
      const particle = this.particles[y][0]
      if (particle) {
        console.log(`  (0,${y}): type='${particle.type}', color='${particle.color}'`)
      }
    }

    console.log(`🔍 Right border types:`)
    for (let y = 0; y < Math.min(10, this.height); y++) {
      const particle = this.particles[y][this.width - 1]
      if (particle) {
        console.log(
          `  (${this.width - 1},${y}): type='${particle.type}', color='${particle.color}'`,
        )
      }
    }

    // Check each particle on the left border
    for (let y = 0; y < this.height; y++) {
      const leftParticle = this.particles[y][0]
      if (!leftParticle || visited[y][0]) continue

      console.log(
        `🔍 Found left border particle at (0,${y}) with type '${leftParticle.type}' and color '${leftParticle.color}'`,
      )

      // Find connected group starting from this left border particle
      const group = this.floodFill(0, y, leftParticle.type, visited)

      // Get the min and max x coordinates of this group for debugging
      const minX = Math.min(...group.map((p) => p.x))
      const maxX = Math.max(...group.map((p) => p.x))

      // Check if this group reaches the right border
      const reachesRightBorder = group.some((pos) => pos.x === this.width - 1)
      console.log(
        `🔍 Group from (0,${y}) with type '${leftParticle.type}': ${group.length} particles, x range: ${minX}-${maxX}, reaches right border (${this.width - 1}): ${reachesRightBorder}`,
      )

      if (reachesRightBorder) {
        connectedGroups.push(group)
        console.log(`✅ Added connected group with ${group.length} particles spanning full width`)
      }
    }

    console.log(`🔍 DEBUG: Total connected groups found: ${connectedGroups.length}`)
    return connectedGroups
  }
}
