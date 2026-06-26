import { createClient } from '@supabase/supabase-js'

const ODDS_API_BASE = 'https://api.the-odds-api.com/v4'

const EXPECTED_GAMES: Record<string, number> = {
  'Round of 32': 16,
  'Round of 16': 8,
  'Quarterfinals': 4,
  'Semifinals': 2,
  'Final': 1,
}

type SupabaseClient = ReturnType<typeof createClient>

/**
 * Credit tokens to all users and open the investment window for a round.
 * Round must have status 'upcoming'.
 */
export async function openWindow(roundId: number, sb: SupabaseClient) {
  const { data: round, error: roundError } = await sb
    .from('rounds')
    .select('*')
    .eq('id', roundId)
    .single()

  if (roundError || !round) {
    return { error: 'Round not found' }
  }

  if (round.status !== 'upcoming') {
    return { error: `Round status is "${round.status}", expected "upcoming"` }
  }

  const { data: users } = await sb.from('users').select('id')
  if (!users || users.length === 0) {
    return { error: 'No users registered' }
  }

  let creditedCount = 0
  for (const user of users) {
    const { data: existing } = await sb
      .from('token_ledger')
      .select('id')
      .eq('user_id', user.id)
      .eq('round_id', roundId)
      .maybeSingle()

    if (existing) continue

    const { error } = await sb.from('token_ledger').insert({
      user_id: user.id,
      round_id: roundId,
      tokens_received: round.token_injection,
    })
    if (!error) creditedCount++
  }

  const now = new Date().toISOString()
  await sb
    .from('rounds')
    .update({ status: 'window_open', window_opens_at: now, odds_snapshot_scheduled_at: now })
    .eq('id', roundId)

  return {
    success: true,
    round_id: roundId,
    round_name: round.name,
    users_credited: creditedCount,
    total_users: users.length,
  }
}

/**
 * Fetch upcoming fixtures from the Odds API and assign them to rounds.
 *
 * If `preFetchedData` is provided, reuses that response instead of making
 * a new API call. Only assigns to rounds whose status is 'upcoming' or
 * 'window_open' (skips in-progress / complete rounds).
 *
 * Filters to games with commence_time >= now AND both teams defined.
 * Enforces EXPECTED_GAMES per round (e.g. R32 max 16) — takes the N
 * earliest games and discards extras (group stage / same-day leakage).
 *
 * Sets window_closes_at on each round to its first game's commence_time.
 * Pre-Tournament's window_closes_at is set to R32's first game time so
 * the cron auto-closes it.
 *
 * When `openPreTournamentWindow` is true (default), credits 32 tokens
 * to all users and opens the Pre-Tournament window.
 */
export async function fetchAndAssignFixtures(
  sb: SupabaseClient,
  options?: { preFetchedData?: any[]; openPreTournamentWindow?: boolean }
) {
  const key = process.env.ODDS_API_KEY
  if (!key) return { error: 'ODDS_API_KEY not configured' }

  const { data: rounds } = await sb
    .from('rounds')
    .select('*')
    .order('phase_order')

  if (!rounds || rounds.length === 0) {
    return { error: 'No rounds seeded. Run seed-knockout.mjs first.' }
  }

  // Round date ranges map to phase_orders 1–5 (index i → round i+1)
  const roundRanges: { min: Date; max: Date }[] = [
    { min: new Date('2026-06-28'), max: new Date('2026-07-03T23:59:59Z') },
    { min: new Date('2026-07-04'), max: new Date('2026-07-07T23:59:59Z') },
    { min: new Date('2026-07-09'), max: new Date('2026-07-11T23:59:59Z') },
    { min: new Date('2026-07-14'), max: new Date('2026-07-15T23:59:59Z') },
    { min: new Date('2026-07-19'), max: new Date('2026-07-19T23:59:59Z') },
  ]

  // Fetch or reuse data
  let apiData = options?.preFetchedData
  let apiHeaders = {}
  if (!apiData) {
    const res = await fetch(
      `${ODDS_API_BASE}/sports/soccer_fifa_world_cup/scores/?apiKey=${key}`
    )
    apiHeaders = Object.fromEntries(res.headers.entries())
    apiData = await res.json()
    if (!Array.isArray(apiData)) {
      return { error: 'Unexpected API response format', apiHeaders }
    }
  }

  // Only future games with both teams decided
  const now = new Date()
  const futureGames = (apiData as any[]).filter((g) => {
    const t = new Date(g.commence_time)
    return t >= now && g.home_team && g.away_team
  })

  // Group by round ID
  const gamesByRound = new Map<number, any[]>()
  for (const game of futureGames) {
    const t = new Date(game.commence_time)
    for (let i = 0; i < roundRanges.length; i++) {
      if (t >= roundRanges[i].min && t <= roundRanges[i].max) {
        const roundId = rounds[i + 1]?.id
        if (roundId === undefined) break
        if (!gamesByRound.has(roundId)) gamesByRound.set(roundId, [])
        gamesByRound.get(roundId)!.push(game)
        break
      }
    }
  }

  // Upsert games per round, enforcing expected count
  let insertedCount = 0
  let skippedCount = 0

  for (const [roundId, games] of gamesByRound) {
    const round = rounds.find((r) => r.id === roundId)
    if (!round) continue
    if (round.status === 'in_progress' || round.status === 'complete') continue

    const sorted = games
      .filter((g) => g.home_team && g.away_team)
      .sort((a, b) => new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime())

    const expected = EXPECTED_GAMES[round.name] ?? Infinity
    const toInsert = sorted.slice(0, expected)

    for (const game of toInsert) {
      const { error } = await sb.from('knockout_matches').upsert({
        id: game.id,
        round_id: roundId,
        home_team: game.home_team,
        away_team: game.away_team,
        commence_time: game.commence_time,
        completed: game.completed ?? false,
      }, { onConflict: 'id' })

      if (error) {
        skippedCount++
      } else {
        insertedCount++
      }
    }

    if (sorted.length > expected) {
      skippedCount += sorted.length - expected
    }
  }

  // Set window_closes_at on rounds that now have games
  let preTournamentCloseAt: string | null = null

  for (const round of rounds) {
    if (round.status === 'in_progress' || round.status === 'complete') continue

    const { data: roundMatches } = await sb
      .from('knockout_matches')
      .select('commence_time')
      .eq('round_id', round.id)
      .order('commence_time')
      .limit(1)

    if (roundMatches && roundMatches.length > 0) {
      const firstGame = roundMatches[0].commence_time
      await sb
        .from('rounds')
        .update({ window_closes_at: firstGame })
        .eq('id', round.id)

      if (round.phase_order === 1) {
        preTournamentCloseAt = firstGame
      }
    }
  }

  // Pre-Tournament closes at R32's first game time (so cron auto-closes it)
  const preTournament = rounds.find((r) => r.phase_order === 0)
  if (preTournament && preTournamentCloseAt) {
    await sb
      .from('rounds')
      .update({ window_closes_at: preTournamentCloseAt })
      .eq('id', preTournament.id)
  }

  // Optionally open Pre-Tournament window (default: yes)
  let windowResult = null
  if (
    options?.openPreTournamentWindow !== false &&
    preTournament &&
    preTournament.status === 'upcoming'
  ) {
    windowResult = await openWindow(preTournament.id, sb)
  }

  return {
    success: true,
    games_found: futureGames.length,
    inserted: insertedCount,
    skipped: skippedCount,
    pre_tournament_window: windowResult,
    apiHeaders,
  }
}

/**
 * Close the investment window, auto-allocate unspent tokens, lock betting.
 * Round must have status 'window_open'.
 */
export async function closeWindow(roundId: number, sb: SupabaseClient) {
  const { data: round, error: roundError } = await sb
    .from('rounds')
    .select('*')
    .eq('id', roundId)
    .single()

  if (roundError || !round) {
    return { error: 'Round not found' }
  }

  if (round.status !== 'window_open') {
    return { error: `Round status is "${round.status}", expected "window_open"` }
  }

  const { data: oddsSnapshots } = await sb
    .from('odds_snapshots')
    .select('*')
    .eq('round_id', roundId)

  if (!oddsSnapshots || oddsSnapshots.length === 0) {
    return { error: 'No odds snapshots for this round. Run snapshot-odds first.' }
  }

  const oddsMap = new Map(oddsSnapshots.map((o) => [o.team, Number(o.decimal_odds)]))
  const survivingTeams = oddsSnapshots.map((o) => o.team)

  const { data: allLedgerRows } = await sb
    .from('token_ledger')
    .select('*')
    .eq('round_id', roundId)

  let autoAllocationCount = 0
  const now = new Date().toISOString()

  for (const ledgerRow of allLedgerRows ?? []) {
    const remaining = ledgerRow.tokens_received - ledgerRow.tokens_spent
    if (remaining <= 0) continue

    const { data: existingInvestments } = await sb
      .from('investment_ledger')
      .select('id')
      .eq('user_id', ledgerRow.user_id)
      .eq('round_id', roundId)
      .limit(1)

    if (existingInvestments && existingInvestments.length > 0) continue

    const teamCount = survivingTeams.length
    if (teamCount === 0) continue

    const baseTokens = Math.floor(remaining / teamCount)
    let remainder = remaining - baseTokens * teamCount

    const sortedTeams = [...survivingTeams].sort(
      (a, b) => (oddsMap.get(a) ?? Infinity) - (oddsMap.get(b) ?? Infinity)
    )

    const autoAllocations: any[] = []
    for (let i = 0; i < teamCount; i++) {
      const team = sortedTeams[i]
      const extra = i < remainder ? 1 : 0
      const tokens = baseTokens + extra
      if (tokens > 0) {
        autoAllocations.push({
          user_id: ledgerRow.user_id,
          team,
          round_id: roundId,
          tokens_spent: tokens,
          odds_locked_in: oddsMap.get(team) ?? 0,
          type: 'auto',
          invested_at: now,
        })
      }
    }

    if (autoAllocations.length > 0) {
      const { error } = await sb.from('investment_ledger').insert(autoAllocations)
      if (!error) {
        const totalAuto = autoAllocations.reduce((s, a) => s + a.tokens_spent, 0)
        await sb
          .from('token_ledger')
          .update({ tokens_spent: ledgerRow.tokens_spent + totalAuto })
          .eq('id', ledgerRow.id)
        autoAllocationCount++
      }
    }
  }

  await sb
    .from('rounds')
    .update({ status: 'in_progress' })
    .eq('id', roundId)

  return {
    success: true,
    round_id: roundId,
    round_name: round.name,
    auto_allocations_processed: autoAllocationCount,
    surviving_teams: survivingTeams.length,
    new_status: 'in_progress',
  }
}

/**
 * Fetch championship odds from DraftKings and store a snapshot for a round.
 * Only retains teams that are currently surviving.
 * Requires ODDS_API_KEY env var.
 */
export async function snapshotOddsForRound(roundId: number, sb: SupabaseClient) {
  const key = process.env.ODDS_API_KEY
  if (!key) {
    return { error: 'ODDS_API_KEY not configured' }
  }

  const { data: round, error: roundError } = await sb
    .from('rounds')
    .select('*')
    .eq('id', roundId)
    .single()

  if (roundError || !round) {
    return { error: 'Round not found' }
  }

  // Compute surviving teams
  const { data: allMatches } = await sb.from('knockout_matches').select('*')

  const allTeams = new Set<string>()
  const eliminatedTeams = new Set<string>()
  for (const m of allMatches ?? []) {
    allTeams.add(m.home_team)
    allTeams.add(m.away_team)
    if (m.completed && m.winner) {
      const loser = m.winner === m.home_team ? m.away_team : m.home_team
      eliminatedTeams.add(loser)
    }
  }

  const survivingTeams = new Set(Array.from(allTeams).filter((t) => !eliminatedTeams.has(t)))

  try {
    const res = await fetch(
      `${ODDS_API_BASE}/sports/soccer_fifa_world_cup_winner/odds/?regions=us&oddsFormat=decimal&apiKey=${key}`
    )
    const apiHeaders = Object.fromEntries(res.headers.entries())
    const data = await res.json()

    if (!Array.isArray(data) || data.length === 0) {
      return { error: 'No odds data returned from API', apiHeaders }
    }

    const draftKings = data.find(
      (entry: any) =>
        entry.bookmaker?.key === 'draftkings' ||
        entry.bookmakers?.find((b: any) => b.key === 'draftkings')
    )

    if (!draftKings) {
      return { error: 'DraftKings odds not found in API response', apiHeaders }
    }

    const outcomes =
      draftKings.outcomes ??
      draftKings.bookmakers?.find((b: any) => b.key === 'draftkings')?.outcomes ??
      []

    if (outcomes.length === 0) {
      return { error: 'No outcomes in DraftKings response', apiHeaders }
    }

    const now = new Date().toISOString()
    let storedCount = 0
    let skippedCount = 0
    const skippedTeams: string[] = []

    await sb.from('odds_snapshots').delete().eq('round_id', roundId)

    for (const outcome of outcomes) {
      const teamName = outcome.title
      if (!survivingTeams.has(teamName)) {
        skippedCount++
        skippedTeams.push(teamName)
        continue
      }

      const { error } = await sb.from('odds_snapshots').insert({
        round_id: roundId,
        team: teamName,
        decimal_odds: outcome.price,
        snapshot_taken_at: now,
      })
      if (!error) storedCount++
    }

    return {
      success: true,
      round_id: roundId,
      round_name: round.name,
      odds_stored: storedCount,
      odds_skipped: skippedCount,
      skipped_teams: skippedTeams,
      apiHeaders,
    }
  } catch (err) {
    return { error: String(err) }
  }
}

/**
 * Auto-open the next round's investment window when a round completes.
 * Finds the round with phase_order = completedRoundPhase + 1,
 * credits tokens, and sets status to window_open.
 */
export async function autoOpenNextRound(completedRoundId: number, sb: SupabaseClient) {
  const { data: completedRound } = await sb
    .from('rounds')
    .select('phase_order')
    .eq('id', completedRoundId)
    .single()

  if (!completedRound) return { skipped: true, reason: 'Completed round not found' }

  const { data: nextRound } = await sb
    .from('rounds')
    .select('*')
    .eq('phase_order', completedRound.phase_order + 1)
    .single()

  if (!nextRound) {
    return { skipped: true, reason: 'No next round — tournament may be complete' }
  }

  if (nextRound.token_injection === 0) {
    return { skipped: true, reason: 'Next round has no token injection (Final)' }
  }

  return openWindow(nextRound.id, sb)
}


