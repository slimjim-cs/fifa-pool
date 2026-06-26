-- Paste this entire script into Supabase SQL Editor and run it.
-- Creates a single-row table to track cron cooldown state.
-- Used by processKnockoutCron() to limit on-demand cron checks.

CREATE TABLE IF NOT EXISTS system_state (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_cron_check_at TIMESTAMPTZ NOT NULL DEFAULT '1970-01-01T00:00:00Z',
  CONSTRAINT single_row CHECK (id = 1)
);

-- Seed the single row
INSERT INTO system_state (id, last_cron_check_at)
VALUES (1, '1970-01-01T00:00:00Z')
ON CONFLICT (id) DO NOTHING;
