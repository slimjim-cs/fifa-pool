const BASE = ''

export async function fetchMatches(page = 1, limit = 20, group?: string) {
  let url = `${BASE}/api/matches?page=${page}&limit=${limit}`
  if (group) url += `&group=${encodeURIComponent(group)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch matches')
  return res.json()
}

export async function fetchMatch(id: number) {
  const res = await fetch(`${BASE}/api/matches/${id}`)
  if (!res.ok) throw new Error('Match not found')
  return res.json()
}

export async function fetchLeaderboard() {
  const res = await fetch(`${BASE}/api/leaderboard`)
  if (!res.ok) throw new Error('Failed to fetch leaderboard')
  return res.json()
}

export async function fetchUsers() {
  const res = await fetch(`${BASE}/api/users`)
  if (!res.ok) throw new Error('Failed to fetch users')
  return res.json()
}

export async function fetchBetsForMatch(matchId: number) {
  const res = await fetch(`${BASE}/api/bets?match_id=${matchId}`)
  if (!res.ok) throw new Error('Failed to fetch bets')
  return res.json()
}

export async function fetchUserBets(userId: number, matchId?: number) {
  let url = `${BASE}/api/bets?user_id=${userId}`
  if (matchId) url += `&match_id=${matchId}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch bets')
  return res.json()
}

export async function placeBet(userId: number, matchId: number, betType: string) {
  const res = await fetch(`${BASE}/api/bets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, match_id: matchId, bet_type: betType }),
  })
  return res.json()
}

export async function fetchBettingStatus() {
  const res = await fetch(`${BASE}/api/betting-status`)
  if (!res.ok) throw new Error('Failed to fetch betting status')
  return res.json()
}

export async function fetchChartData() {
  const res = await fetch(`${BASE}/api/chart`)
  if (!res.ok) throw new Error('Failed to fetch chart data')
  return res.json()
}

export async function fetchAllBets() {
  const res = await fetch(`${BASE}/api/bets`)
  if (!res.ok) throw new Error('Failed to fetch bets')
  return res.json()
}

export async function registerUser(username: string, displayName: string) {
  const res = await fetch(`${BASE}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, display_name: displayName }),
  })
  return res.json()
}
