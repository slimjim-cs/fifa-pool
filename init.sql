-- Paste this entire script into Supabase SQL Editor and run it.
-- This creates all tables needed for the World Cup Betting Pool.

CREATE TABLE IF NOT EXISTS teams (
  id_team TEXT PRIMARY KEY,
  country TEXT NOT NULL,
  formation TEXT,
  average_starter_age NUMERIC,
  starter_value TEXT,
  rank INTEGER,
  total_points NUMERIC,
  "group" TEXT
);

ALTER TABLE teams ADD COLUMN IF NOT EXISTS "group" TEXT;

CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  match_date TEXT NOT NULL,
  match_time TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  id_team_home TEXT NOT NULL REFERENCES teams(id_team),
  id_team_away TEXT NOT NULL REFERENCES teams(id_team),
  home_win_odds_american INTEGER NOT NULL,
  draw_odds_american INTEGER NOT NULL,
  away_win_odds_american INTEGER NOT NULL,
  home_win_odds_decimal NUMERIC NOT NULL,
  draw_odds_decimal NUMERIC NOT NULL,
  away_win_odds_decimal NUMERIC NOT NULL,
  home_draw_combo_decimal NUMERIC NOT NULL,
  away_draw_combo_decimal NUMERIC NOT NULL,
  result TEXT
);

CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  id_team TEXT NOT NULL REFERENCES teams(id_team),
  player_name TEXT NOT NULL,
  position TEXT NOT NULL,
  is_starter BOOLEAN NOT NULL DEFAULT false,
  pitch_left NUMERIC,
  pitch_top NUMERIC
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  match_id INTEGER NOT NULL REFERENCES matches(id),
  bet_type TEXT NOT NULL CHECK(bet_type IN ('H','A','D','H+D','A+D','SKIP')),
  odds_at_bet NUMERIC NOT NULL,
  profit_loss NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bets_user ON bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_match ON bets(match_id);
CREATE INDEX IF NOT EXISTS idx_players_team ON players(id_team);
