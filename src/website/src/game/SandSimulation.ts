interface SandParticle {
  color: string
}

export class SandSimulation {
  private particles: (SandParticle | null)[][] = [] // 2D grid of tiny particles
  private width: number
  private height: number
  private particleSize: number // Size of each sand grain in pixels (2x2 or 4x4)
  private frameCounter: number = 0

  constructor(tetrisWidth: number, tetrisHeight: number, tetrisCellSize: number = 30) {
    // Create a fine grid where each sand particle is 4x4 pixels
    this.particleSize = 4
    this.width = Math.floor((tetrisWidth * tetrisCellSize) / this.particleSize)
    this.height = Math.floor((tetrisHeight * tetrisCellSize) / this.particleSize)

    // Initialize 2D array with null values
    this.particles = Array.from({ length: this.height }, () =>
      Array.from({ length: this.width }, () => null)
    )
  }

  // Convert tetris grid coordinates to sand particle coordinates
  private tetrisToSand(tetrisX: number, tetrisY: number, tetrisCellSize: number) {
    return {
      sandX: Math.floor((tetrisX * tetrisCellSize) / this.particleSize),
      sandY: Math.floor((tetrisY * tetrisCellSize) / this.particleSize),
      sandWidth: Math.floor(tetrisCellSize / this.particleSize),
      sandHeight: Math.floor(tetrisCellSize / this.particleSize)
    }
  }

  // Fill a tetris block area with sand particles
  fillTetrisBlock(tetrisX: number, tetrisY: number, color: string, tetrisCellSize: number = 30): void {
    const { sandX, sandY, sandWidth, sandHeight } = this.tetrisToSand(tetrisX, tetrisY, tetrisCellSize)

    // Fill the entire tetris block area with sand particles
    for (let y = sandY; y < sandY + sandHeight && y < this.height; y++) {
      for (let x = sandX; x < sandX + sandWidth && x < this.width; x++) {
        if (x >= 0 && y >= 0) {
          this.particles[y][x] = { color }
        }
      }
    }
  }

  // Check if any sand particle exists in a tetris block area
  hasParticleAt(tetrisX: number, tetrisY: number, tetrisCellSize: number = 30): boolean {
    if (tetrisX < 0 || tetrisY < 0) return true

    const { sandX, sandY, sandWidth, sandHeight } = this.tetrisToSand(tetrisX, tetrisY, tetrisCellSize)

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
    // Simple sand physics exactly like the CodePen - process from bottom-right to top-left
    for (let y = this.height - 2; y >= 0; y--) {
      for (let x = this.width - 1; x >= 0; x--) {
        const particle = this.particles[y][x]
        if (!particle) continue

        // CodePen physics: try down, then down-right, then down-left
        if (y < this.height - 1 && !this.particles[y + 1][x]) {
          // Fall straight down
          this.particles[y][x] = null
          this.particles[y + 1][x] = particle
        }
        else if (y < this.height - 1 && x < this.width - 1 && !this.particles[y + 1][x + 1]) {
          // Fall down-right
          this.particles[y][x] = null
          this.particles[y + 1][x + 1] = particle
        }
        else if (y < this.height - 1 && x > 0 && !this.particles[y + 1][x - 1]) {
          // Fall down-left
          this.particles[y][x] = null
          this.particles[y + 1][x - 1] = particle
        }
        // Otherwise stay in place
      }
    }
  }

  checkCompletedLines(): number[] {
    const completedLines: number[] = []

    // Convert back to tetris scale for line checking (every ~10 sand rows = 1 tetris row)
    const tetrisRowHeight = Math.floor(30 / this.particleSize) // ~10 sand particles per tetris row

    for (let tetrisRow = 0; tetrisRow < Math.floor(this.height / tetrisRowHeight); tetrisRow++) {
      let isComplete = true
      const startY = tetrisRow * tetrisRowHeight
      const endY = Math.min(startY + tetrisRowHeight, this.height)

      // Check if this tetris-sized row is completely filled
      for (let y = startY; y < endY && isComplete; y++) {
        for (let x = 0; x < this.width && isComplete; x++) {
          if (!this.particles[y][x]) {
            isComplete = false
          }
        }
      }

      if (isComplete) {
        completedLines.push(tetrisRow)
      }
    }

    return completedLines
  }

  countParticlesInConnectedGroups(): number {
    // For now, just count particles in completed lines
    const completedLines = this.checkCompletedLines()
    const tetrisRowHeight = Math.floor(30 / this.particleSize)

    let count = 0
    for (const line of completedLines) {
      const startY = line * tetrisRowHeight
      const endY = Math.min(startY + tetrisRowHeight, this.height)
      count += (endY - startY) * this.width
    }
    return count
  }

  clearConnectedGroups(): void {
    const completedLines = this.checkCompletedLines()
    if (completedLines.length === 0) return

    const tetrisRowHeight = Math.floor(30 / this.particleSize)

    // Clear completed lines
    for (const line of completedLines) {
      const startY = line * tetrisRowHeight
      const endY = Math.min(startY + tetrisRowHeight, this.height)

      for (let y = startY; y < endY; y++) {
        for (let x = 0; x < this.width; x++) {
          this.particles[y][x] = null
        }
      }
    }

    // Make particles fall down (they'll naturally fall on next update)
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Draw each sand particle as a small colored square
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const particle = this.particles[y][x]
        if (particle) {
          ctx.fillStyle = particle.color
          ctx.fillRect(x * this.particleSize, y * this.particleSize, this.particleSize, this.particleSize)
        }
      }
    }
  }

  private fillRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + width - radius, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    ctx.lineTo(x + width, y + height - radius)
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    ctx.lineTo(x + radius, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
    ctx.fill()
  }

  private adjustBrightness(color: string, factor: number): string {
    const hex = color.replace('#', '')
    const r = Math.max(0, Math.min(255, Math.round(parseInt(hex.substr(0, 2), 16) * factor)))
    const g = Math.max(0, Math.min(255, Math.round(parseInt(hex.substr(2, 2), 16) * factor)))
    const b = Math.max(0, Math.min(255, Math.round(parseInt(hex.substr(4, 2), 16) * factor)))
    return `rgb(${r}, ${g}, ${b})`
  }

  private lightenColor(color: string, amount: number): string {
    // Simple color lightening
    const hex = color.replace('#', '')
    const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + amount)
    const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + amount)
    const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + amount)
    return `rgb(${r}, ${g}, ${b})`
  }

  private darkenColor(color: string, amount: number): string {
    // Simple color darkening
    const hex = color.replace('#', '')
    const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - amount)
    const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - amount)
    const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - amount)
    return `rgb(${r}, ${g}, ${b})`
  }

  // Get all particles (for debugging/state sync)
  getParticles(): SandParticle[][] {
    return this.particles
  }

  // Set particles state (for receiving from network)
  setParticles(particles: SandParticle[][]): void {
    this.particles = particles
  }
}
