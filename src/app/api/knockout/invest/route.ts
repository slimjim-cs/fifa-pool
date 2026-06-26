import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { user_id, round_id, allocations } = body

  if (!user_id || !round_id || !Array.isArray(allocations)) {
    return NextResponse.json(
      { error: 'user_id, round_id, and allocations array are required' },
      { status: 400 }
    )
  }

  const sb = getServiceClient()

  // Validate round is in window_open state
  const { data: round, error: roundError } = await sb
    .from('rounds')
    .select('*')
    .eq('id', round_id)
    .single()

  if (roundError || !round) {
    return NextResponse.json({ error: 'Round not found' }, { status: 404 })
  }

  if (round.status !== 'window_open') {
    return NextResponse.json(
      { error: 'Investment window is not open for this round' },
      { status: 400 }
    )
  }

  // Validate user exists
  const { data: user, error: userError } = await sb
    .from('users')
    .select('id')
    .eq('id', user_id)
    .single()

  if (userError || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Check for existing investment this round (user can only lock once)
  const { data: existingInvestments } = await sb
    .from('investment_ledger')
    .select('id')
    .eq('user_id', user_id)
    .eq('round_id', round_id)
    .limit(1)

  if (existingInvestments && existingInvestments.length > 0) {
    return NextResponse.json(
      { error: 'You have already locked in your investments for this round' },
      { status: 400 }
    )
  }

  // Get or create token ledger row
  let { data: ledgerRow } = await sb
    .from('token_ledger')
    .select('*')
    .eq('user_id', user_id)
    .eq('round_id', round_id)
    .maybeSingle()

  if (!ledgerRow) {
    const { data: newLedger, error: createError } = await sb
      .from('token_ledger')
      .insert({
        user_id,
        round_id,
        tokens_received: round.token_injection,
        tokens_spent: 0,
      })
      .select()
      .single()

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }
    ledgerRow = newLedger
  }

  // Validate total allocation equals full balance
  const totalTokens = allocations.reduce((sum, a) => sum + a.tokens_spent, 0)
  const balance = ledgerRow.tokens_received - ledgerRow.tokens_spent
  const remaining = balance - totalTokens

  if (remaining !== 0) {
    return NextResponse.json(
      { error: `You must allocate all ${balance} tokens. ${remaining} tokens remaining.` },
      { status: 400 }
    )
  }

  // Validate each allocation
  for (const alloc of allocations) {
    if (!Number.isInteger(alloc.tokens_spent) || alloc.tokens_spent < 0) {
      return NextResponse.json(
        { error: 'Each allocation must be a non-negative integer' },
        { status: 400 }
      )
    }
  }

  // Get odds snapshot for this round
  const { data: oddsSnapshots } = await sb
    .from('odds_snapshots')
    .select('*')
    .eq('round_id', round_id)

  const oddsMap = new Map((oddsSnapshots ?? []).map((o) => [o.team, o.decimal_odds]))

  // Write investments
  const investments = allocations
    .filter((a) => a.tokens_spent > 0)
    .map((a) => ({
      user_id,
      team: a.team,
      round_id,
      tokens_spent: a.tokens_spent,
      odds_locked_in: oddsMap.get(a.team) ?? 0,
      type: 'manual',
    }))

  if (investments.length === 0) {
    // All tokens allocated but 0 to each team — should not happen due to balance check
    return NextResponse.json({ error: 'No valid investments' }, { status: 400 })
  }

  const { error: investError } = await sb
    .from('investment_ledger')
    .insert(investments)

  if (investError) {
    return NextResponse.json({ error: investError.message }, { status: 500 })
  }

  // Update token_ledger
  const { error: updateError } = await sb
    .from('token_ledger')
    .update({ tokens_spent: ledgerRow.tokens_spent + totalTokens })
    .eq('id', ledgerRow.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    investments_placed: investments.length,
    tokens_allocated: totalTokens,
  })
}
