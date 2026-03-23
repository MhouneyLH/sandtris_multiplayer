export class TetrisPiece {
  x: number
  y: number
  shape: number[][]
  color: string

  constructor(shape: number[][], color: string, x: number = 0, y: number = 0) {
    this.shape = shape
    this.color = color
    this.x = x
    this.y = y
  }

  // Rotate the piece 90 degrees clockwise
  rotate(): void {
    const rotated = this.shape[0].map((_, i) => this.shape.map((row) => row[i]).reverse())
    this.shape = rotated
  }

  // Get all occupied positions
  getOccupiedPositions(): { x: number; y: number }[] {
    const positions: { x: number; y: number }[] = []

    for (let y = 0; y < this.shape.length; y++) {
      for (let x = 0; x < this.shape[y].length; x++) {
        if (this.shape[y][x]) {
          positions.push({
            x: this.x + x,
            y: this.y + y,
          })
        }
      }
    }

    return positions
  }

  // Check if piece would be at given position
  wouldOverlapAt(x: number, y: number, checkFn: (x: number, y: number) => boolean): boolean {
    const originalX = this.x
    const originalY = this.y

    this.x = x
    this.y = y

    const positions = this.getOccupiedPositions()
    const wouldOverlap = positions.some((pos) => checkFn(pos.x, pos.y))

    // Restore original position
    this.x = originalX
    this.y = originalY

    return wouldOverlap
  }

  // Clone the piece
  clone(): TetrisPiece {
    return new TetrisPiece(
      this.shape.map((row) => [...row]),
      this.color,
      this.x,
      this.y,
    )
  }
}

// Predefined Tetris pieces
export const TETRIS_PIECES = {
  I: {
    shape: [[1, 1, 1, 1]],
    color: '#3b82f6', // Blue
  },
  O: {
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: '#eab308', // Yellow
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
    ],
    color: '#22c55e', // Green
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
    ],
    color: '#ef4444', // Red
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
    ],
    color: '#ef4444', // Red
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
    ],
    color: '#3b82f6', // Blue
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
    ],
    color: '#22c55e', // Green
  },
}

// Get a random piece
export function getRandomPiece(): TetrisPiece {
  const pieceTypes = Object.keys(TETRIS_PIECES) as (keyof typeof TETRIS_PIECES)[]
  const randomType = pieceTypes[Math.floor(Math.random() * pieceTypes.length)]
  const pieceData = TETRIS_PIECES[randomType]

  return new TetrisPiece(
    pieceData.shape.map((row) => [...row]), // Deep clone the shape
    pieceData.color,
  )
}
