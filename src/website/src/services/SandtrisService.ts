const API_BASE_URL: string = 'http://localhost:5015'

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
