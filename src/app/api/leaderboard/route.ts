import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

export async function GET() {
  const sb = getServiceClient()

  const [usersResult, betsResult] = await Promise.all([
    sb.from('users').select('id, username, display_name').order('id'),
    sb.from('bets').select('user_id, profit_loss'),
  ])

  if (usersResult.error) {
    return NextResponse.json({ error: usersResult.error.message }, { status: 500 })
  }

  if (betsResult.error) {
    return NextResponse.json({ error: betsResult.error.message }, { status: 500 })
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

  return NextResponse.json({ leaderboard })
}
