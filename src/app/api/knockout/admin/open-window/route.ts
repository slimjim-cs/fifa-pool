import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { openWindow } from '@/lib/knockout-admin'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { round_id } = body

  if (!round_id) {
    return NextResponse.json({ error: 'round_id is required' }, { status: 400 })
  }

  const sb = getServiceClient()
  const result = await openWindow(round_id, sb)

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json(result)
}
