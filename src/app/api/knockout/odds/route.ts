import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const roundId = searchParams.get('round_id')
  const team = searchParams.get('team')

  if (!roundId) {
    return NextResponse.json({ error: 'round_id is required' }, { status: 400 })
  }

  const sb = getServiceClient()

  let query = sb
    .from('odds_snapshots')
    .select('*')
    .eq('round_id', roundId)

  if (team) {
    query = query.eq('team', team)
  }

  const { data: odds, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ odds, round_id: parseInt(roundId) })
}
