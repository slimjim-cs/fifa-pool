import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { getOddsColumn } from '@/lib/odds-utils'

const VALID_BET_TYPES = ['H', 'A', 'D', 'H+D', 'A+D', 'SKIP'] as const

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const matchId = searchParams.get('match_id')
  const userId = searchParams.get('user_id')

  const sb = getServiceClient()

  let query = sb
    .from('bets')
    .select('*, users ( username, display_name )')
    .order('id')

  if (matchId) {
    query = query.eq('match_id', matchId)
  }

  if (userId) {
    query = query.eq('user_id', userId)
  }

  const { data: bets, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ bets })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { user_id, match_id, bet_type } = body

  if (!user_id || !match_id || !bet_type) {
    return NextResponse.json(
      { error: 'user_id, match_id, and bet_type are required' },
      { status: 400 }
    )
  }

  if (!VALID_BET_TYPES.includes(bet_type)) {
    return NextResponse.json(
      { error: `bet_type must be one of: ${VALID_BET_TYPES.join(', ')}` },
      { status: 400 }
    )
  }

  const sb = getServiceClient()

  const { data: match, error: matchError } = await sb
    .from('matches')
    .select('*')
    .eq('id', match_id)
    .single()

  if (matchError || !match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }

  if (match.result) {
    return NextResponse.json(
      { error: 'This match already has a result; betting is closed' },
      { status: 400 }
    )
  }

  const { data: user, error: userError } = await sb
    .from('users')
    .select('id')
    .eq('id', user_id)
    .single()

  if (userError || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const oddsColumn = getOddsColumn(bet_type)
  const odds = oddsColumn ? match[oddsColumn] : 0

  const { data: existing } = await sb
    .from('bets')
    .select('id')
    .eq('user_id', user_id)
    .eq('match_id', match_id)
    .maybeSingle()

  if (existing) {
    const { error: updateError } = await sb
      .from('bets')
      .update({ bet_type, odds_at_bet: odds, profit_loss: null })
      .eq('id', existing.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, updated: true })
  }

  const { error: insertError } = await sb
    .from('bets')
    .insert({ user_id, match_id, bet_type, odds_at_bet: odds })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, updated: false }, { status: 201 })
}
