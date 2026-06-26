import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { autoOpenNextRound, fetchAndAssignFixtures } from '@/lib/knockout-admin'

const ODDS_API_BASE = 'https://api.the-odds-api.com/v4'

/**
 * POST /api/knockout/admin/fetch-results
 *
 * Makes exactly ONE Odds API call to fetch completed match results
 * AND populate the next round's fixtures from the same response.
 *
 * Call this manually whenever you know a match has finished.
 * Safe to call any time — skips matches that are already complete.
 */
export async function POST() {
  const key = process.env.ODDS_API_KEY
  if (!key) {
    return NextResponse.json({ error: 'ODDS_API_KEY not configured' }, { status: 500 })
  }

  const sb = getServiceClient()

  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()

  const { data: pendingMatches, error: matchError } = await sb
    .from('knockout_matches')
    .select('*')
    .eq('completed', false)
    .lt('commence_time', fourHoursAgo)

  if (matchError) {
    return NextResponse.json({ error: matchError.message }, { status: 500 })
  }

  if (!pendingMatches || pendingMatches.length === 0) {
    return NextResponse.json({
      status: 'skipped',
      reason: 'No pending matches to resolve',
      api_calls_made: 0,
    })
  }

  const url = `${ODDS_API_BASE}/sports/soccer_fifa_world_cup/scores/?daysFrom=1&apiKey=${key}`
  let apiResponse
  try {
    const res = await fetch(url)
    if (!res.ok) {
      return NextResponse.json(
        { error: `Odds API returned ${res.status}`, status: res.status },
        { status: 502 }
      )
    }
    apiResponse = await res.json()
  } catch (err) {
    return NextResponse.json({ error: `API request failed: ${String(err)}` }, { status: 502 })
  }

  if (!Array.isArray(apiResponse)) {
    return NextResponse.json({
      status: 'error',
      reason: 'Unexpected API response format',
      api_calls_made: 1,
    })
  }

  // Load round phase map for Final tie detection
  const { data: rounds } = await sb.from('rounds').select('id, phase_order')
  const phaseByRoundId = new Map<number, number>(
    (rounds ?? []).map((r) => [r.id, r.phase_order])
  )

  const completedMap = new Map<string, any>()
  for (const entry of apiResponse) {
    if (entry.completed) {
      completedMap.set(entry.id, entry)
    }
  }

  let updatedCount = 0
  let skippedTieCount = 0
  const roundCompletions = new Set<number>()

  for (const match of pendingMatches) {
    const scoreEntry = completedMap.get(match.id)
    if (!scoreEntry) continue

    const homeScore = parseInt(scoreEntry.home_score, 10)
    const awayScore = parseInt(scoreEntry.away_score, 10)

    // Final tie → flag for admin (skip auto-resolve)
    if (phaseByRoundId.get(match.round_id) === 5 && homeScore === awayScore) {
      skippedTieCount++
      continue
    }

    const winner = homeScore > awayScore ? scoreEntry.home_team : scoreEntry.away_team

    const { error: updateError } = await sb
      .from('knockout_matches')
      .update({
        completed: true,
        home_score: homeScore,
        away_score: awayScore,
        winner,
        last_api_update: new Date().toISOString(),
      })
      .eq('id', match.id)

    if (!updateError) {
      updatedCount++
      roundCompletions.add(match.round_id)
    }
  }

  // Upsert the next round's fixtures from the same API response
  // (zero extra API calls — reuses the data already fetched)
  const fixtureResult = await fetchAndAssignFixtures(sb, {
    preFetchedData: apiResponse,
    openPreTournamentWindow: false,
  })

  const roundsCompleted: { round_id: number; name: string; next_round_opened: boolean }[] = []
  for (const roundId of roundCompletions) {
    const { data: matchesInRound } = await sb
      .from('knockout_matches')
      .select('completed')
      .eq('round_id', roundId)

    if (
      matchesInRound &&
      matchesInRound.length > 0 &&
      matchesInRound.every((m) => m.completed)
    ) {
      const { data: round } = await sb
        .from('rounds')
        .select('name')
        .eq('id', roundId)
        .single()

      const nextRoundResult = await autoOpenNextRound(roundId, sb)

      roundsCompleted.push({
        round_id: roundId,
        name: round?.name ?? `Round #${roundId}`,
        next_round_opened: 'success' in nextRoundResult && nextRoundResult.success === true,
      })

      if (phaseByRoundId.get(roundId) === 5) {
        await sb.from('rounds').update({ status: 'complete' }).eq('id', roundId)
      }
    }
  }

  return NextResponse.json({
    status: 'success',
    api_calls_made: 1,
    pending_matches_before: pendingMatches.length,
    matches_updated: updatedCount,
    ties_flagged_for_admin: skippedTieCount,
    rounds_completed: roundsCompleted,
    fixtures_upserted: fixtureResult.success ? fixtureResult.inserted : 0,
    timestamp: new Date().toISOString(),
  })
}
