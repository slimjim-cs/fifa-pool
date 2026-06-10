import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
  const groupFilter = searchParams.get('group')?.trim()

  const sb = getServiceClient()

  // If filtering by group, get team IDs for that group first
  let groupTeamIds: string[] | null = null
  if (groupFilter) {
    const { data: groupTeams } = await sb
      .from('teams')
      .select('id_team')
      .eq('group', groupFilter)
    groupTeamIds = groupTeams?.map((t) => t.id_team) ?? []
  }

  // Build query
  let query = sb
    .from('matches')
    .select('*', { count: 'exact' })
    .order('id')

  if (groupTeamIds && groupTeamIds.length > 0) {
    // Filter: match involves any team from this group
    query = query.or(
      `id_team_home.in.(${groupTeamIds.join(',')}),id_team_away.in.(${groupTeamIds.join(',')})`
    )
  }

  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data: matches, error, count } = await query.range(from, to)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get team metadata for all teams in these matches
  const teamIds = new Set<string>()
  for (const m of matches ?? []) {
    teamIds.add(m.id_team_home)
    teamIds.add(m.id_team_away)
  }

  const { data: teams } = await sb
    .from('teams')
    .select('*')
    .in('id_team', Array.from(teamIds))

  const teamMap = new Map(teams?.map((t) => [t.id_team, t]) ?? [])

  const enriched = (matches ?? []).map((m) => {
    const homeMeta = teamMap.get(m.id_team_home) ?? null
    const awayMeta = teamMap.get(m.id_team_away) ?? null
    return {
      id: m.id,
      match_date: m.match_date,
      match_time: m.match_time,
      home_team: m.home_team,
      away_team: m.away_team,
      home_win_odds_decimal: m.home_win_odds_decimal,
      draw_odds_decimal: m.draw_odds_decimal,
      away_win_odds_decimal: m.away_win_odds_decimal,
      home_draw_combo_decimal: m.home_draw_combo_decimal,
      away_draw_combo_decimal: m.away_draw_combo_decimal,
      result: m.result,
      home_team_meta: homeMeta,
      away_team_meta: awayMeta,
    }
  })

  return NextResponse.json({
    matches: enriched,
    total: count ?? 0,
    page,
    limit,
    group: groupFilter || null,
  })
}
