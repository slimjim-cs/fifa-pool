const BASE = '/api/knockout'

async function fetchJSON(url: string, init?: RequestInit) {
  const res = await fetch(url, init)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? `Request failed: ${res.status}`)
  return data
}

export interface Round {
  id: number
  name: string
  phase_order: number
  token_injection: number
  window_opens_at: string | null
  window_closes_at: string | null
  odds_snapshot_scheduled_at: string | null
  status: string
}

export interface KnockoutMatch {
  id: string
  round_id: number
  home_team: string
  away_team: string
  commence_time: string
  completed: boolean
  winner: string | null
  home_score: number | null
  away_score: number | null
}

export interface OddsEntry {
  team: string
  decimal_odds: number
}

export interface TokenLedger {
  id: number
  round_id: number
  tokens_received: number
  tokens_spent: number
}

export interface Investment {
  id: number
  user_id: number
  team: string
  round_id: number
  tokens_spent: number
  odds_locked_in: number
  invested_at: string
  type: 'manual' | 'auto'
  users?: { username: string; display_name: string }
}

export interface DashboardEntry {
  user_id: number
  display_name: string
  best_case_points: number
  teams_still_in: number
}

export interface PortfolioRow {
  team: string
  total_tokens: number
  weighted_avg_odds: number
  points_if_wins: number
  status: 'Active' | 'Eliminated'
}

export function fetchKnockoutState() {
  return fetchJSON(`${BASE}/state`)
}

export function fetchRounds() {
  return fetchJSON(`${BASE}/rounds`)
}

export function fetchKnockoutMatches() {
  return fetchJSON(`${BASE}/matches`)
}

export function fetchOdds(roundId: number) {
  return fetchJSON(`${BASE}/odds?round_id=${roundId}`)
}

export function fetchLedger(userId: number) {
  return fetchJSON(`${BASE}/ledger?user_id=${userId}`)
}

export function fetchDashboard() {
  return fetchJSON(`${BASE}/dashboard`)
}

export function fetchAudit() {
  return fetchJSON(`${BASE}/audit`)
}

export function submitInvestments(
  userId: number,
  roundId: number,
  allocations: { team: string; tokens_spent: number }[]
) {
  return fetchJSON(`${BASE}/invest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, round_id: roundId, allocations }),
  })
}
