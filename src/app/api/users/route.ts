import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

export async function GET() {
  const sb = getServiceClient()

  const { data: users, error } = await sb
    .from('users')
    .select('id, username, display_name, created_at')
    .order('username')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ users })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { username, display_name } = body

  if (!username || !display_name) {
    return NextResponse.json(
      { error: 'username and display_name are required' },
      { status: 400 }
    )
  }

  const sb = getServiceClient()

  const { data: user, error } = await sb
    .from('users')
    .insert({ username: username.trim(), display_name: display_name.trim() })
    .select('id, username, display_name, created_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ user }, { status: 201 })
}
