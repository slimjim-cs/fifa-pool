/**
 * Seed script: reads CSV files and inserts data into Supabase.
 *
 * Usage:
 *   set SUPABASE_SERVICE_ROLE_KEY=sr_xxx...
 *   set NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
 *   node scripts/seed.mjs
 *
 * Optionally pass a --data-dir if CSVs are somewhere else:
 *   node scripts/seed.mjs --data-dir ../..
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'
import { fileURLToPath } from 'url'

// ── Resolve paths ──────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '..')

// Default: CSVs live in the parent of the project folder (tidied_data)
let DATA_DIR = path.resolve(PROJECT_ROOT, '..')

// Check for --data-dir override
const dataDirIndex = process.argv.indexOf('--data-dir')
if (dataDirIndex !== -1 && dataDirIndex + 1 < process.argv.length) {
  DATA_DIR = path.resolve(process.argv[dataDirIndex + 1])
}

// ── Supabase client (service role – admin privileges) ──────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing environment variables.')
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY)

// ── Helpers ────────────────────────────────────────────────────

function parsePct(val) {
  if (!val || val.trim().toUpperCase() === 'N/A' || val.trim() === '') return null
  return parseFloat(val.trim().replace('%', ''))
}

function americanToDecimal(odds) {
  if (odds > 0) return Math.round((odds / 100 + 1) * 10000) / 10000
  return Math.round((100 / Math.abs(odds) + 1) * 10000) / 10000
}

function americanToImplied(odds) {
  if (odds > 0) return 100 / (odds + 100)
  return Math.abs(odds) / (Math.abs(odds) + 100)
}

function comboDecimal(odds1, odds2) {
  const prob = americanToImplied(odds1) + americanToImplied(odds2)
  if (prob <= 0) return 0
  return Math.round((1 / prob) * 10000) / 10000
}

function loadCSV(filename) {
  const filePath = path.join(DATA_DIR, filename)
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`)
    process.exit(1)
  }
  const raw = fs.readFileSync(filePath, 'utf-8')
  const result = Papa.parse(raw, { header: true, skipEmptyLines: true, dynamicTyping: false })
  return result.data
}

// ── Main ───────────────────────────────────────────────────────

async function seed() {
  console.log(`Reading CSVs from: ${DATA_DIR}\n`)

  // 1. Parse CSVs
  const teamsData = loadCSV('team_metadata.csv')
  const rostersData = loadCSV('rosters.csv')
  const oddsData = loadCSV('odds.csv')

  console.log(`Parsed: ${teamsData.length} teams, ${rostersData.length} players, ${oddsData.length} matches`)

  // 2. Clear existing data (FK-safe order)
  console.log('\nClearing existing data...')
  for (const table of ['bets', 'users', 'players', 'matches', 'teams']) {
    const idCol = table === 'teams' ? 'id_team' : 'id'
    const sentinel = table === 'teams' ? '' : 0
    const { error } = await sb.from(table).delete().neq(idCol, sentinel)
    if (error && error.code !== 'PGRST116') {
      console.error(`  Error clearing ${table}:`, error.message)
    } else {
      console.log(`  Cleared ${table}`)
    }
  }

  // 3. Insert teams
  console.log('\nInserting teams...')
  const teams = teamsData.map((r) => ({
    id_team: r.id_team.trim(),
    country: r.country.trim(),
    formation: r.formation?.trim() || null,
    average_starter_age: r.average_starter_age ? parseFloat(r.average_starter_age) : null,
    starter_value: r.starter_value?.trim() || null,
    rank: r.rank ? parseInt(r.rank, 10) : null,
    total_points: r.total_points ? parseFloat(r.total_points) : null,
    group: r.group?.trim() || null,
  }))
  const { error: teamsErr } = await sb.from('teams').upsert(teams, { onConflict: 'id_team' })
  if (teamsErr) {
    console.error('  Error inserting teams:', teamsErr.message)
    process.exit(1)
  }
  console.log(`  Inserted ${teams.length} teams`)

  // 4. Insert players
  console.log('\nInserting players...')
  const BATCH_SIZE = 250
  let insertedPlayers = 0
  for (let i = 0; i < rostersData.length; i += BATCH_SIZE) {
    const batch = rostersData.slice(i, i + BATCH_SIZE).map((r) => ({
      id_team: r.id_team.trim(),
      player_name: r.player_name.trim(),
      position: r.position.trim(),
      is_starter: r.is_starter?.trim().toLowerCase() === 'yes',
      pitch_left: parsePct(r.pitch_left),
      pitch_top: parsePct(r.pitch_top),
    }))
    const { error: playersErr } = await sb.from('players').insert(batch)
    if (playersErr) {
      console.error(`  Error inserting players (batch ${i}):`, playersErr.message)
      process.exit(1)
    }
    insertedPlayers += batch.length
    console.log(`  Inserted ${insertedPlayers}/${rostersData.length} players`)
  }

  // 5. Insert matches
  console.log('\nInserting matches...')
  let insertedMatches = 0
  for (const row of oddsData) {
    const idHome = row.id_team_home.trim()
    const idAway = row.id_team_away.trim()

    // Skip self-matches
    if (idHome === idAway) {
      console.log(`  Skipping self-match: ${row.home_team} vs ${row.away_team}`)
      continue
    }

    const homeAmerican = parseInt(row.home_win_odds, 10)
    const drawAmerican = parseInt(row.draw_odds, 10)
    const awayAmerican = parseInt(row.away_win_odds, 10)

    const match = {
      match_date: row.match_date.trim(),
      match_time: row.match_time.trim(),
      home_team: row.home_team.trim(),
      away_team: row.away_team.trim(),
      id_team_home: idHome,
      id_team_away: idAway,
      home_win_odds_american: homeAmerican,
      draw_odds_american: drawAmerican,
      away_win_odds_american: awayAmerican,
      home_win_odds_decimal: americanToDecimal(homeAmerican),
      draw_odds_decimal: americanToDecimal(drawAmerican),
      away_win_odds_decimal: americanToDecimal(awayAmerican),
      home_draw_combo_decimal: comboDecimal(homeAmerican, drawAmerican),
      away_draw_combo_decimal: comboDecimal(awayAmerican, drawAmerican),
      result: null,
    }

    const { error: matchErr } = await sb.from('matches').insert(match)
    if (matchErr) {
      console.error(`  Error inserting match ${row.home_team} vs ${row.away_team}:`, matchErr.message)
      process.exit(1)
    }
    insertedMatches++
  }
  console.log(`  Inserted ${insertedMatches} matches`)

  // 6. Summary
  console.log('\n========== Seed Complete ==========')
  for (const table of ['teams', 'players', 'matches', 'users', 'bets']) {
    const { count, error } = await sb.from(table).select('*', { count: 'exact', head: true })
    if (!error) {
      console.log(`  ${table}: ${count} rows`)
    }
  }
  console.log('===================================\n')
}

seed().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
