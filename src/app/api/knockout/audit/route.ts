import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')
  const team = searchParams.get('team')

  const sb = getServiceClient()

  let query = sb
    .from('investment_ledger')
    .select('*, users ( username, display_name )')
    .order('invested_at', { ascending: false })

  if (userId) {
    query = query.eq('user_id', userId)
  }

  if (team) {
    query = query.eq('team', team)
  }

  const { data: investments, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ investments })
}
