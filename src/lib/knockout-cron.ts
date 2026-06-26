import { createClient, SupabaseClient } from '@supabase/supabase-js'
import {
  closeWindow,
  snapshotOddsForRound,
  fetchAndAssignFixtures,
} from './knockout-admin'

const TOURNAMENT_START_TIME = new Date('2026-06-28T06:00:00Z')

export interface CronOptions {
  skipAutoStart?: boolean
  checkCooldownMinutes?: number
}

export interface CronResult {
  status: string
  actions: string[]
  skipped?: boolean
  rounds_checked?: number
}

/**
 * Process knockout cron actions: auto-start, close windows, snapshot odds.
 *
 * Idempotent — safe to run multiple times.  When called with a cooldown
 * interval, skips if a previous check ran within that window (checked via
 * the system_state table).
 *
 * @param sb      Supabase service-role client
 * @param opts    Options to skip auto-start and/or enforce a cooldown
 */
export async function processKnockoutCron(
  sb: SupabaseClient,
  opts: CronOptions = {}
): Promise<CronResult> {
  const now = new Date()
  const nowIso = now.toISOString()
  const actions: string[] = []

  // ── Cooldown check ───────────────────────────────────────────
  if (opts.checkCooldownMinutes && opts.checkCooldownMinutes > 0) {
    const { data: stateRow } = await sb
      .from('system_state')
      .select('last_cron_check_at')
      .eq('id', 1)
      .maybeSingle()

    if (stateRow?.last_cron_check_at) {
      const elapsed =
        (now.getTime() - new Date(stateRow.last_cron_check_at).getTime()) / 60000
      if (elapsed < opts.checkCooldownMinutes) {
        return {
          status: 'ok',
          actions: [],
          skipped: true,
          rounds_checked: 0,
        }
      }
    }
  }

  // ── 0. Auto-start tournament ─────────────────────────────────
  if (!opts.skipAutoStart && now >= TOURNAMENT_START_TIME) {
    const { data: existingMatches } = await sb
      .from('knockout_matches')
      .select('id')
      .limit(1)

    if (!existingMatches || existingMatches.length === 0) {
      const autoStartResult = await fetchAndAssignFixtures(sb)
      if (autoStartResult.success) {
        actions.push(
          `Tournament auto-started: ${autoStartResult.inserted} matches, ` +
          `${autoStartResult.pre_tournament_window?.users_credited ?? 0} users credited`
        )
      } else if (autoStartResult.error === 'ODDS_API_KEY not configured') {
        actions.push('ODDS_API_KEY not configured — tournament auto-start skipped')
      } else {
        actions.push(`Tournament auto-start failed: ${autoStartResult.error}`)
      }
    }
  }

  // ── Fetch all rounds ─────────────────────────────────────────
  const { data: rounds } = await sb
    .from('rounds')
    .select('*')
    .order('phase_order')

  if (!rounds || rounds.length === 0) {
    return { status: 'ok', actions, rounds_checked: 0 }
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
        actions.push(
          `Closed round ${round.id} (${round.name}): ${result.auto_allocations_processed} auto-allocations`
        )
      } else {
        actions.push(`Failed to close round ${round.id}: ${result.error}`)
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
          actions.push(
            `Snapshotted odds for round ${round.id}: ${result.odds_stored} teams stored`
          )
        } else {
          actions.push(`Failed to snapshot odds for round ${round.id}: ${result.error}`)
        }
      }
    }
  }

  // ── Update cooldown timestamp ────────────────────────────────
  if (opts.checkCooldownMinutes && opts.checkCooldownMinutes > 0) {
    await sb
      .from('system_state')
      .upsert({ id: 1, last_cron_check_at: nowIso }, { onConflict: 'id' })
  }

  if (actions.length === 0) {
    actions.push('No actions needed')
  }

  return {
    status: 'ok',
    actions,
    rounds_checked: rounds.length,
  }
}
