-- Paste this entire script into Supabase SQL Editor and run it.
-- Creates all knockout-stage tables for the World Cup Betting Pool.
-- Does NOT modify existing group-stage tables.

CREATE TABLE IF NOT EXISTS rounds (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  phase_order INT NOT NULL,
  token_injection INT NOT NULL DEFAULT 32,
  window_opens_at TIMESTAMP,
  window_closes_at TIMESTAMP,
  odds_snapshot_scheduled_at TIMESTAMP,
  status VARCHAR NOT NULL DEFAULT 'upcoming'
);

CREATE TABLE IF NOT EXISTS knockout_matches (
  id VARCHAR PRIMARY KEY,
  round_id INT NOT NULL REFERENCES rounds(id),
  home_team VARCHAR NOT NULL,
  away_team VARCHAR NOT NULL,
  commence_time TIMESTAMP NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  winner VARCHAR,
  home_score INT,
  away_score INT,
  last_api_update TIMESTAMP
);

CREATE TABLE IF NOT EXISTS odds_snapshots (
  id SERIAL PRIMARY KEY,
  round_id INT NOT NULL REFERENCES rounds(id),
  team VARCHAR NOT NULL,
  decimal_odds DECIMAL(8,2) NOT NULL,
  snapshot_taken_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS token_ledger (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  round_id INT NOT NULL REFERENCES rounds(id),
  tokens_received INT NOT NULL DEFAULT 32,
  tokens_spent INT NOT NULL DEFAULT 0,
  awarded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS investment_ledger (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  team VARCHAR NOT NULL,
  round_id INT NOT NULL REFERENCES rounds(id),
  tokens_spent INT NOT NULL,
  odds_locked_in DECIMAL(8,2) NOT NULL,
  invested_at TIMESTAMP NOT NULL DEFAULT NOW(),
  type VARCHAR NOT NULL DEFAULT 'manual'
);

CREATE INDEX IF NOT EXISTS idx_knockout_matches_round ON knockout_matches(round_id);
CREATE INDEX IF NOT EXISTS idx_knockout_matches_completed ON knockout_matches(completed);
CREATE INDEX IF NOT EXISTS idx_odds_snapshots_round ON odds_snapshots(round_id);
CREATE INDEX IF NOT EXISTS idx_token_ledger_user_round ON token_ledger(user_id, round_id);
CREATE INDEX IF NOT EXISTS idx_investment_ledger_user ON investment_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_ledger_team ON investment_ledger(team);
CREATE INDEX IF NOT EXISTS idx_investment_ledger_round ON investment_ledger(round_id);
