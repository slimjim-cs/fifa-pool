import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { isWin, calculateProfit } from '@/lib/odds-utils'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { match_id, result } = body

  if (!match_id) {
    return NextResponse.json({ error: 'match_id is required' }, { status: 400 })
  }

  if (!result || !['H', 'A', 'D'].includes(result)) {
    return NextResponse.json(
      { error: 'result must be one of: H (Home Win), A (Away Win), D (Draw)' },
      { status: 400 }
    )
  }

  const sb = getServiceClient()

  const { data: match, error: matchError } = await sb
    .from('matches')
    .select('id')
    .eq('id', match_id)
    .single()

  if (matchError || !match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }

  const { error: updateError } = await sb
    .from('matches')
    .update({ result })
    .eq('id', match_id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  const { data: bets, error: betsError } = await sb
    .from('bets')
    .select('*')
    .eq('match_id', match_id)

  if (betsError) {
    return NextResponse.json({ error: betsError.message }, { status: 500 })
  }

  let affectedCount = 0
  for (const bet of bets ?? []) {
    if (bet.bet_type === 'SKIP') {
      await sb.from('bets').update({ profit_loss: 0 }).eq('id', bet.id)
      affectedCount++
      continue
    }

    const won = isWin(bet.bet_type, result as 'H' | 'A' | 'D')
    const profit = calculateProfit(bet.odds_at_bet, won)

    const { error: updateBetError } = await sb
      .from('bets')
      .update({ profit_loss: profit })
      .eq('id', bet.id)

    if (!updateBetError) {
      affectedCount++
    }
  }

  return NextResponse.json({
    success: true,
    match_id,
    result,
    bets_affected: affectedCount,
  })
}
