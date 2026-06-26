import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

export async function GET() {
  const sb = getServiceClient()

  const { data: rounds } = await sb
    .from('rounds')
    .select('*')
    .order('phase_order')

  if (!rounds || rounds.length === 0) {
    return NextResponse.json({ state: 'NOT_INITIALIZED', current_round: null, rounds: [] })
  }

  const now = new Date().toISOString()

  // Determine current state
  let state = 'WAITING_FOR_BRACKET'
  let currentRound = null

  // Check if tournament is complete
  const finalRound = rounds.find((r) => r.phase_order === 5)
  if (finalRound?.status === 'complete') {
    state = 'TOURNAMENT_COMPLETE'
    currentRound = finalRound
  }

  if (state !== 'TOURNAMENT_COMPLETE') {
    // Find the active round (window_open or in_progress)
    const activeRound = rounds.find(
      (r) => r.status === 'window_open' || r.status === 'in_progress'
    )
    if (activeRound) {
      state = activeRound.status === 'window_open' ? 'WINDOW_OPEN' : 'ROUND_IN_PROGRESS'
      currentRound = activeRound
    }
  }

  if (!currentRound) {
    // Find next upcoming round
    const nextRound = rounds.find((r) => r.status === 'upcoming')
    if (nextRound) {
      state = nextRound.phase_order === 0 ? 'WAITING_FOR_BRACKET' : 'ROUND_COMPLETE'
      currentRound = nextRound
    }
  }

  // Compute surviving teams
  const { data: allMatches } = await sb
    .from('knockout_matches')
    .select('*')

  const allTeams = new Set<string>()
  const eliminatedTeams = new Set<string>()
  for (const m of allMatches ?? []) {
    allTeams.add(m.home_team)
    allTeams.add(m.away_team)
    if (m.completed && m.winner) {
      const loser = m.winner === m.home_team ? m.away_team : m.home_team
      eliminatedTeams.add(loser)
    }
  }

  const survivingTeams = Array.from(allTeams).filter((t) => !eliminatedTeams.has(t)).sort()

  return NextResponse.json({
    state,
    current_round: currentRound,
    rounds,
    surviving_teams: survivingTeams,
    eliminated_teams: Array.from(eliminatedTeams).sort(),
    all_teams: Array.from(allTeams).sort(),
  })
}
