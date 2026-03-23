interface SandParticle {
  x: number
  y: number
  color: string
  settled: boolean
}

export class SandSimulation {
  private particles: SandParticle[][] = [] // 2D grid of particles
  private width: number
  private height: number

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
    this.particles = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => null as any),
    ).map(() => Array(width).fill(null))
  }

  addParticle(x: number, y: number, color: string): void {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.particles[y][x] = {
        x,
        y,
        color,
        settled: false,
      }
    }
  }

  hasParticleAt(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return true
    return this.particles[y][x] !== null
  }

  update(): void {
    // Simple sand simulation - particles fall down and pile up
    // Process from bottom to top to avoid double-processing
    for (let y = this.height - 2; y >= 0; y--) {
      for (let x = 0; x < this.width; x++) {
        const particle = this.particles[y][x]
        if (!particle || particle.settled) continue

        // Try to move down
        if (this.canMoveTo(x, y + 1)) {
          this.moveParticle(x, y, x, y + 1)
        }
        // Try to move down-left
        else if (this.canMoveTo(x - 1, y + 1)) {
          this.moveParticle(x, y, x - 1, y + 1)
        }
        // Try to move down-right
        else if (this.canMoveTo(x + 1, y + 1)) {
          this.moveParticle(x, y, x + 1, y + 1)
        }
        // Can't move - settle the particle
        else {
          particle.settled = true
        }
      }
    }
  }

  private canMoveTo(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y >= this.height) return false
    return this.particles[y][x] === null
  }

  private moveParticle(fromX: number, fromY: number, toX: number, toY: number): void {
    const particle = this.particles[fromY][fromX]
    if (!particle) return

    // Move particle
    particle.x = toX
    particle.y = toY
    particle.settled = false // Keep moving

    this.particles[toY][toX] = particle
    this.particles[fromY][fromX] = null
  }

  checkCompletedLines(): number[] {
    const completedLines: number[] = []

    for (let y = 0; y < this.height; y++) {
      let isComplete = true
      for (let x = 0; x < this.width; x++) {
        if (this.particles[y][x] === null) {
          isComplete = false
          break
        }
      }
      if (isComplete) {
        completedLines.push(y)
      }
    }

    return completedLines
  }

  clearLines(linesToClear: number[]): void {
    // Remove completed lines
    linesToClear.forEach((lineY) => {
      for (let x = 0; x < this.width; x++) {
        this.particles[lineY][x] = null
      }
    })

    // Make particles above fall down
    for (let clearY of linesToClear) {
      for (let y = clearY - 1; y >= 0; y--) {
        for (let x = 0; x < this.width; x++) {
          const particle = this.particles[y][x]
          if (particle) {
            particle.settled = false // Make it fall again
          }
        }
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, cellSize: number): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const particle = this.particles[y][x]
        if (particle) {
          // Draw sand particle with slight grain effect
          ctx.fillStyle = particle.color

          const pixelX = x * cellSize
          const pixelY = y * cellSize

          // Main particle
          ctx.fillRect(pixelX + 1, pixelY + 1, cellSize - 2, cellSize - 2)

          // Add some texture/grain
          ctx.fillStyle = this.lightenColor(particle.color, 20)
          ctx.fillRect(pixelX + 2, pixelY + 2, 2, 2)

          ctx.fillStyle = this.darkenColor(particle.color, 20)
          ctx.fillRect(pixelX + cellSize - 4, pixelY + cellSize - 4, 2, 2)
        }
      }
    }
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
