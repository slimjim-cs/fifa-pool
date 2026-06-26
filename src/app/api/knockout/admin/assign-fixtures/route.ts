import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { fetchAndAssignFixtures } from '@/lib/knockout-admin'

export async function POST() {
  const key = process.env.ODDS_API_KEY
  if (!key) {
    return NextResponse.json({ error: 'ODDS_API_KEY not configured' }, { status: 500 })
  }

  const sb = getServiceClient()
  const result = await fetchAndAssignFixtures(sb)

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json(result)
}
