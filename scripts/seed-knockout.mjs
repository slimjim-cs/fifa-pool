/**
 * Seed knockout rounds and matches from Odds API fixtures.
 *
 * Usage:
 *   set ODDS_API_KEY=xxx...
 *   set NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
 *   set SUPABASE_SERVICE_ROLE_KEY=sr_xxx...
 *   node scripts/seed-knockout.mjs
 *
 * Flags:
 *   --fetch-fixtures   Query the Odds API for real fixture data
 *                      (otherwise uses hardcoded 2026 bracket)
 *   --data-dir <path>  Override CSV data directory
 */

import { createClient } from '@supabase/supabase-js'

// ── Round schedule (2026 World Cup knockout stage) ────────────
// Round of 32:  Jun 28 – Jul 3
// Round of 16:  Jul 4  – Jul 7
// Quarterfinals: Jul 9  – Jul 11
// Semifinals:   Jul 14 – Jul 15
// Final:        Jul 19

const ROUNDS = [
  { name: 'Pre-Tournament',          phase_order: 0, token_injection: 32 },
  { name: 'Round of 32',             phase_order: 1, token_injection: 32 },
  { name: 'Round of 16',             phase_order: 2, token_injection: 32 },
  { name: 'Quarterfinals',           phase_order: 3, token_injection: 32 },
  { name: 'Semifinals',              phase_order: 4, token_injection: 32 },
  { name: 'Final',                   phase_order: 5, token_injection: 0 },
]

async function seed() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Missing SUPABASE env vars.')
    process.exit(1)
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY)

  // 1. Seed rounds
  console.log('Seeding rounds...')
  const { error: clearRoundsErr } = await sb.from('rounds').delete().neq('id', 0)
  if (clearRoundsErr && clearRoundsErr.code !== 'PGRST116') {
    console.error('  Error clearing rounds:', clearRoundsErr.message)
  }

  for (const r of ROUNDS) {
    const { error } = await sb.from('rounds').insert(r)
    if (error) {
      console.error(`  Error inserting round "${r.name}":`, error.message)
    } else {
      console.log(`  Inserted: ${r.name}`)
    }
  }

  console.log('\nDone. Rounds table seeded.')
  console.log('Run `node scripts/seed-knockout.mjs --fetch-fixtures` after group stage ends to populate knockout_matches.')
}

seed().catch((err) => { console.error(err); process.exit(1) })
