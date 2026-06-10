import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sb = getServiceClient()

  const { data: match, error } = await sb
    .from('matches')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }

  const teamIds = [match.id_team_home, match.id_team_away]

  const [teamsResult, playersResult] = await Promise.all([
    sb.from('teams').select('*').in('id_team', teamIds),
    sb.from('players').select('*').in('id_team', teamIds).order('id'),
  ])

  const teamMap = new Map(teamsResult.data?.map((t) => [t.id_team, t]) ?? [])

  const rosterMap = new Map<string, typeof playersResult.data>()
  for (const p of playersResult.data ?? []) {
    if (!rosterMap.has(p.id_team)) rosterMap.set(p.id_team, [])
    rosterMap.get(p.id_team)!.push(p)
  }

  return NextResponse.json({
    match,
    home_team_meta: teamMap.get(match.id_team_home) ?? null,
    away_team_meta: teamMap.get(match.id_team_away) ?? null,
    home_team_roster: rosterMap.get(match.id_team_home) ?? [],
    away_team_roster: rosterMap.get(match.id_team_away) ?? [],
  })
}
