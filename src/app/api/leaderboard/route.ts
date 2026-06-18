import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

export async function GET() {
  const sb = getServiceClient()

  const [usersResult, betsResult, matchesResult] = await Promise.all([
    sb.from('users').select('id, username, display_name').order('id'),
    sb.from('bets').select('user_id, profit_loss'),
    sb.from('matches').select('result, home_win_odds_decimal, draw_odds_decimal, away_win_odds_decimal').not('result', 'is', null),
  ])

  if (usersResult.error) {
    return NextResponse.json({ error: usersResult.error.message }, { status: 500 })
  }

  if (betsResult.error) {
    return NextResponse.json({ error: betsResult.error.message }, { status: 500 })
  }

  if (matchesResult.error) {
    return NextResponse.json({ error: matchesResult.error.message }, { status: 500 })
  }

  const plByUser = new Map<number, number>()
  for (const bet of betsResult.data ?? []) {
    if (bet.profit_loss !== null) {
      plByUser.set(bet.user_id, (plByUser.get(bet.user_id) ?? 0) + bet.profit_loss)
    }
  }

  const leaderboard = (usersResult.data ?? [])
    .map((u) => ({
      id: u.id,
      username: u.username,
      display_name: u.display_name,
      total_pl: Math.round((plByUser.get(u.id) ?? 0) * 100) / 100,
    }))
    .sort((a, b) => b.total_pl - a.total_pl)

  let maxPossiblePl = 0
  for (const m of matchesResult.data ?? []) {
    const odds =
      m.result === 'H' ? m.home_win_odds_decimal :
      m.result === 'A' ? m.away_win_odds_decimal :
      m.draw_odds_decimal
    maxPossiblePl += 100 * odds - 100
  }
  maxPossiblePl = Math.round(maxPossiblePl * 100) / 100

  return NextResponse.json({ leaderboard, max_possible_pl: maxPossiblePl })
}
