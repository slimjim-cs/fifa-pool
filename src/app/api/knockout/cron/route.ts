import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { processKnockoutCron } from '@/lib/knockout-cron'

/**
 * GET /api/knockout/cron
 *
 * Scheduled cron job (runs daily at 12:00 UTC via Vercel Cron).
 * Idempotent — safe to run every day, skips if nothing to do.
 *
 * Handles all three cron actions:
 *   0. Auto-start tournament if past Jun 28 06:00 UTC
 *   1. Close any windows past their window_closes_at deadline
 *   2. Snapshot odds for rounds where snapshot is due
 *
 * User-triggered on-demand checks (on /api/knockout/state) handle
 * sub-hourly precision; this daily run is the safety net.
 */
export async function GET() {
  const sb = getServiceClient()
  const result = await processKnockoutCron(sb)
  return NextResponse.json({
    status: result.status,
    timestamp: new Date().toISOString(),
    actions: result.actions,
    rounds_checked: result.rounds_checked,
  })
}
