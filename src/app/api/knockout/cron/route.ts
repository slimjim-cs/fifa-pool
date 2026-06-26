import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import {
  closeWindow,
  snapshotOddsForRound,
  fetchAndAssignFixtures,
} from '@/lib/knockout-admin'

const TOURNAMENT_START_TIME = new Date('2026-06-28T06:00:00Z')

/**
 * GET /api/knockout/cron
 *
 * Scheduled cron job (runs hourly via Vercel Cron).
 * Idempotent — safe to run every hour, skips if nothing to do.
 *
 * Each run:
 * 0. Auto-starts tournament if past Jun 28 06:00 UTC and no matches exist
 * 1. Closes any windows past their window_closes_at deadline
 * 2. Snapshots odds for rounds where odds_snapshot_scheduled_at has passed
 *
 * Does NOT auto-fetch results or resolve tournament — those stay manual.
 */
export async function GET() {
  const sb = getServiceClient()
  const now = new Date()
  const nowIso = now.toISOString()
  const results: string[] = []

  // ── 0. Auto-start tournament ────────────────────────────────
  if (now >= TOURNAMENT_START_TIME) {
    const { data: existingMatches } = await sb
      .from('knockout_matches')
      .select('id')
      .limit(1)

    if (!existingMatches || existingMatches.length === 0) {
      const autoStartResult = await fetchAndAssignFixtures(sb)
      if (autoStartResult.success) {
        results.push(
          `Tournament auto-started: ${autoStartResult.inserted} matches, ` +
          `${autoStartResult.pre_tournament_window?.users_credited ?? 0} users credited`
        )
      } else if (autoStartResult.error === 'ODDS_API_KEY not configured') {
        results.push('ODDS_API_KEY not configured — tournament auto-start skipped')
      } else {
        results.push(`Tournament auto-start failed: ${autoStartResult.error}`)
      }
    }
  }

  // Fetch all rounds
  const { data: rounds } = await sb
    .from('rounds')
    .select('*')
    .order('phase_order')

  if (!rounds || rounds.length === 0) {
    return NextResponse.json({ status: 'ok', actions: results, rounds_found: 0 })
  }

  for (const round of rounds) {
    // ── 1. Close windows past deadline ─────────────────────────
    if (
      round.status === 'window_open' &&
      round.window_closes_at &&
      round.window_closes_at <= nowIso
    ) {
      const result = await closeWindow(round.id, sb)
      if (result.success) {
        results.push(`Closed round ${round.id} (${round.name}): ${result.auto_allocations_processed} auto-allocations`)
      } else {
        results.push(`Failed to close round ${round.id}: ${result.error}`)
      }
    }

    // ── 2. Snapshot odds when scheduled time has passed ────────
    if (
      round.odds_snapshot_scheduled_at &&
      round.odds_snapshot_scheduled_at <= nowIso
    ) {
      const { data: existing } = await sb
        .from('odds_snapshots')
        .select('id')
        .eq('round_id', round.id)
        .limit(1)

      if (!existing || existing.length === 0) {
        const result = await snapshotOddsForRound(round.id, sb)
        if (result.success) {
          results.push(`Snapshotted odds for round ${round.id}: ${result.odds_stored} teams stored`)
        } else {
          results.push(`Failed to snapshot odds for round ${round.id}: ${result.error}`)
        }
      }
    }
  }

  if (results.length === 0) {
    results.push('No actions needed')
  }

  return NextResponse.json({
    status: 'ok',
    timestamp: nowIso,
    actions: results,
    rounds_checked: rounds.length,
  })
}
