import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { capitalizeName } from '@/lib/utils'

function parseMatchDate(match: { match_date: string; match_time: string }): Date {
  const parts = match.match_date.split(' ')
  const month = parts[1]
  const day = parts[2].replace(',', '')
  return new Date(`${month} ${day}, 2026 ${match.match_time}`)
}

export async function GET() {
  const sb = getServiceClient()

  const [matchesRes, betsRes, usersRes] = await Promise.all([
    sb.from('matches').select('id, match_date, match_time, home_team, away_team, result'),
    sb.from('bets').select('user_id, match_id, profit_loss'),
    sb.from('users').select('id, display_name').order('id'),
  ])

  if (matchesRes.error || betsRes.error || usersRes.error) {
    return NextResponse.json({ error: 'Failed to load chart data' }, { status: 500 })
  }

  const matches = (matchesRes.data ?? []).sort(
    (a, b) => parseMatchDate(a).getTime() - parseMatchDate(b).getTime()
  )

  const users = usersRes.data ?? []

  const betsByMatch = new Map<number, { user_id: number; profit_loss: number | null }[]>()
  for (const bet of betsRes.data ?? []) {
    if (!betsByMatch.has(bet.match_id)) {
      betsByMatch.set(bet.match_id, [])
    }
    betsByMatch.get(bet.match_id)!.push(bet)
  }

  const cumulative = new Map<number, number>()
  for (const u of users) cumulative.set(u.id, 0)

  const points: { matchIndex: number; matchLabel: string; date: string; pl: Record<string, number> }[] = []

  const zeroPl: Record<string, number> = {}
  for (const u of users) zeroPl[u.id] = 0
  points.push({ matchIndex: 0, matchLabel: '', date: '', pl: zeroPl })

  let completedCount = 0
  for (const m of matches) {
    if (!m.result) continue
    completedCount++

    const matchBets = betsByMatch.get(m.id)
    if (matchBets) {
      for (const bet of matchBets) {
        if (bet.profit_loss !== null) {
          cumulative.set(bet.user_id, (cumulative.get(bet.user_id) ?? 0) + bet.profit_loss)
        }
      }
    }

    const pl: Record<string, number> = {}
    for (const u of users) {
      pl[u.id] = Math.round((cumulative.get(u.id) ?? 0) * 100) / 100
    }

    const dateParts = m.match_date.split(', ')
    const shortDate = dateParts.length > 1 ? dateParts[1] : m.match_date

    points.push({
      matchIndex: completedCount,
      matchLabel: `${capitalizeName(m.home_team)} vs ${capitalizeName(m.away_team)}`,
      date: shortDate,
      pl,
    })
  }

  return NextResponse.json({
    users: users.map((u) => ({ id: u.id, display_name: u.display_name })),
    series: points,
  })
}
