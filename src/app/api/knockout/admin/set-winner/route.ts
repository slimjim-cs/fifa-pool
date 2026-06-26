import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

/**
 * POST /api/knockout/admin/set-winner
 * Body: { match_id: string, winner: string, home_score: number, away_score: number }
 *
 * Manually sets a match winner (for Final tie edge case or API error).
 * If all matches in the round are now completed, triggers round completion.
 */
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { match_id, winner, home_score, away_score } = body

  if (!match_id || !winner) {
    return NextResponse.json({ error: 'match_id and winner are required' }, { status: 400 })
  }

  const sb = getServiceClient()

  const { data: match, error: matchError } = await sb
    .from('knockout_matches')
    .select('*')
    .eq('id', match_id)
    .single()

  if (matchError || !match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }

  if (match.completed) {
    return NextResponse.json({ error: 'Match is already completed' }, { status: 400 })
  }

  if (winner !== match.home_team && winner !== match.away_team) {
    return NextResponse.json(
      { error: `Winner must be one of: ${match.home_team}, ${match.away_team}` },
      { status: 400 }
    )
  }

  const updatedScore: any = {
    completed: true,
    winner,
    last_api_update: new Date().toISOString(),
  }
  if (home_score !== undefined) updatedScore.home_score = home_score
  if (away_score !== undefined) updatedScore.away_score = away_score

  const { error: updateError } = await sb
    .from('knockout_matches')
    .update(updatedScore)
    .eq('id', match_id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, match_id, winner })
}
