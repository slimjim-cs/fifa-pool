import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

/**
 * POST /api/knockout/admin/resolve-tournament
 *
 * Identifies the champion from the Final match result,
 * computes Final Points for all users,
 * and marks tournament status as COMPLETE.
 *
 * Designed to be triggered automatically when the Final match
 * is completed, or manually by admin.
 */
export async function POST() {
  const sb = getServiceClient()

  // Find the Final round (phase_order = 5)
  const { data: finalRound } = await sb
    .from('rounds')
    .select('*')
    .eq('phase_order', 5)
    .single()

  if (!finalRound) {
    return NextResponse.json({ error: 'Final round not found' }, { status: 404 })
  }

  // Find the Final match
  const { data: finalMatches } = await sb
    .from('knockout_matches')
    .select('*')
    .eq('round_id', finalRound.id)

  if (!finalMatches || finalMatches.length === 0) {
    return NextResponse.json({ error: 'No Final match found' }, { status: 404 })
  }

  const finalMatch = finalMatches[0]
  if (!finalMatch.completed || !finalMatch.winner) {
    return NextResponse.json({ error: 'Final match is not yet completed' }, { status: 400 })
  }

  const champion = finalMatch.winner

  // Get all investments in the champion
  const { data: championInvestments } = await sb
    .from('investment_ledger')
    .select('*, users ( id, username, display_name )')
    .eq('team', champion)

  if (!championInvestments) {
    return NextResponse.json({ error: 'Failed to query investments' }, { status: 500 })
  }

  // Compute Final Points per user
  const userPoints = new Map<number, { display_name: string; points: number; investments: any[] }>()

  for (const inv of championInvestments) {
    const userId = inv.user_id
    const existing = userPoints.get(userId) ?? {
      display_name: (inv.users as any)?.display_name ?? `User #${userId}`,
      points: 0,
      investments: [],
    }
    existing.points += inv.tokens_spent * Number(inv.odds_locked_in)
    existing.investments.push(inv)
    userPoints.set(userId, existing)
  }

  // Round points
  const results = Array.from(userPoints.entries()).map(([userId, data]) => ({
    user_id: userId,
    display_name: data.display_name,
    final_points: Math.round(data.points * 100) / 100,
    champion_investments: data.investments.length,
    total_investments: data.investments.reduce((s, i) => s + i.tokens_spent, 0),
  })).sort((a, b) => b.final_points - a.final_points)

  // Update Final round status
  await sb
    .from('rounds')
    .update({ status: 'complete' })
    .eq('id', finalRound.id)

  return NextResponse.json({
    success: true,
    champion,
    total_users_with_points: results.length,
    leaderboard: results,
    final_round_id: finalRound.id,
  })
}
