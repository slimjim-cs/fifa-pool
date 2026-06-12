import { NextResponse } from 'next/server'

export async function GET() {
  const enabled = process.env.BETTING_ENABLED !== 'false'
  return NextResponse.json({ enabled })
}
