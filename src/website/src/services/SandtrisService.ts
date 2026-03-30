const API_BASE_URL: string = import.meta.env.VITE_BACKEND_BASE_URL || 'http://localhost:5015'

export async function GetQueueSize(): Promise<number> {
  try {
    const res = await fetch(`${API_BASE_URL}/match-queue/size`)
    if (!res.ok) {
      console.error('Failed to get queue size')
      return -1
    }
    const data = await res.json()
    // Backend returns "queueSize" (camelCase) for this endpoint
    return data.queueSize || 0
  } catch (error) {
    console.error('Error fetching queue size:', error)
    return -1
  }
}

export async function JoinMatchQueue(playerId: string): Promise<Response> {
  const payload = { playerId: playerId }
  const res: Response = await fetch(`${API_BASE_URL}/match-queue/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  return res
}

export async function LeaveMatchQueue(playerId: string): Promise<Response> {
  const payload = { playerId: playerId }
  const res: Response = await fetch(`${API_BASE_URL}/match-queue/leave`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  return res
}
