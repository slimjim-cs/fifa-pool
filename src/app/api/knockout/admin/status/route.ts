import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

/**
 * GET /api/knockout/admin/status
 *
 * Returns current job status and round states for admin monitoring.
 */
export async function GET() {
  const sb = getServiceClient()

  const { data: rounds } = await sb
    .from('rounds')
    .select('*')
    .order('phase_order')

  const { data: pendingMatches } = await sb
    .from('knockout_matches')
    .select('id, round_id, home_team, away_team, completed, commence_time')
    .eq('completed', false)
    .order('commence_time')

  const { data: lastSnapshot } = await sb
    .from('odds_snapshots')
    .select('round_id, snapshot_taken_at')
    .order('snapshot_taken_at', { ascending: false })
    .limit(1)

  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  const matchesNeedingPoll = (pendingMatches ?? []).filter(
    (m) => m.commence_time < fourHoursAgo
  )

  return NextResponse.json({
    rounds,
    matches_pending: pendingMatches?.length ?? 0,
    matches_needing_poll: matchesNeedingPoll.length,
    last_odds_snapshot: lastSnapshot?.[0] ?? null,
    timestamp: new Date().toISOString(),
  })
}
