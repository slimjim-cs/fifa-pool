import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

export async function GET() {
  const sb = getServiceClient()

  // Get all users
  const { data: users } = await sb
    .from('users')
    .select('id, display_name')

  if (!users || users.length === 0) {
    return NextResponse.json({ leaderboard: [], portfolio: [] })
  }

  // Get all knockout matches to determine surviving teams
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

  const survivingTeams = new Set(Array.from(allTeams).filter((t) => !eliminatedTeams.has(t)))

  // Get all investment ledger rows
  const { data: allInvestments } = await sb
    .from('investment_ledger')
    .select('*')

  if (!allInvestments) {
    return NextResponse.json({ leaderboard: [], portfolio: [] })
  }

  // Compute leaderboard: Best Case Points per user
  const userPoints = new Map<number, { display_name: string; best_case: number; teams_still_in: Set<string> }>()
  const userPortfolio = new Map<number, Map<string, { total_tokens: number; total_odds_product: number }>>()

  for (const user of users) {
    userPoints.set(user.id, {
      display_name: user.display_name,
      best_case: 0,
      teams_still_in: new Set(),
    })
    userPortfolio.set(user.id, new Map())
  }

  for (const inv of allInvestments) {
    const userRow = userPoints.get(inv.user_id)
    if (!userRow) continue

    let teamData = userPortfolio.get(inv.user_id)?.get(inv.team)
    if (!teamData) {
      teamData = { total_tokens: 0, total_odds_product: 0 }
      userPortfolio.get(inv.user_id)!.set(inv.team, teamData)
    }
    teamData.total_tokens += inv.tokens_spent
    teamData.total_odds_product += inv.tokens_spent * Number(inv.odds_locked_in)

    if (survivingTeams.has(inv.team)) {
      userRow.teams_still_in.add(inv.team)
    }
  }

  // Compute Best Case Points per user
  for (const [userId, row] of userPoints) {
    let bestCase = 0
    const portfolio = userPortfolio.get(userId)!

    for (const [team, data] of portfolio) {
      if (survivingTeams.has(team)) {
        const pointsIfWins = data.total_odds_product
        if (pointsIfWins > bestCase) {
          bestCase = pointsIfWins
        }
      }
    }
    row.best_case = Math.round(bestCase * 100) / 100
  }

  // Build leaderboard
  const leaderboard = Array.from(userPoints.entries())
    .map(([userId, row]) => ({
      user_id: userId,
      display_name: row.display_name,
      best_case_points: row.best_case,
      teams_still_in: row.teams_still_in.size,
    }))
    .sort((a, b) => b.best_case_points - a.best_case_points)

  // Build portfolio for each user
  const portfolio = Array.from(userPortfolio.entries()).map(([userId, teams]) => {
    const rows = Array.from(teams.entries())
      .map(([team, data]) => ({
        team,
        total_tokens: data.total_tokens,
        weighted_avg_odds: Math.round((data.total_odds_product / data.total_tokens) * 100) / 100,
        points_if_wins: Math.round(data.total_odds_product * 100) / 100,
        status: survivingTeams.has(team) ? 'Active' as const : 'Eliminated' as const,
      }))
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'Active' ? -1 : 1
        return b.points_if_wins - a.points_if_wins
      })

    return { user_id: userId, teams: rows }
  })

  return NextResponse.json({ leaderboard, portfolio })
}
