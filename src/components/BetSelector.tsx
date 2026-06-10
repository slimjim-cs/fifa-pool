'use client'

import { capitalizeName } from '@/lib/utils'

interface Props {
  match: {
    home_team: string
    away_team: string
    home_win_odds_decimal: number
    away_win_odds_decimal: number
    draw_odds_decimal: number
    home_draw_combo_decimal: number
    away_draw_combo_decimal: number
    result: string | null
  }
  selected: string | null
  onSelect: (betType: string) => void
  disabled?: boolean
}

export default function BetSelector({ match, selected, onSelect, disabled }: Props) {
  const home = capitalizeName(match.home_team)
  const away = capitalizeName(match.away_team)

  const BET_OPTIONS = [
    { key: 'H', label: home },
    { key: 'A', label: away },
    { key: 'D', label: 'Draw' },
    { key: 'H+D', label: `${home} / Draw` },
    { key: 'A+D', label: `${away} / Draw` },
    { key: 'SKIP', label: 'Skip' },
  ] as const

  const oddsMap: Record<string, number> = {
    H: match.home_win_odds_decimal,
    A: match.away_win_odds_decimal,
    D: match.draw_odds_decimal,
    'H+D': match.home_draw_combo_decimal,
    'A+D': match.away_draw_combo_decimal,
    SKIP: 0,
  }

  return (
    <div className="bet-selector">
      <div className="bet-options">
        {BET_OPTIONS.map((opt) => {
          const odds = oddsMap[opt.key]
          const profit = odds > 0 ? (100 * odds - 100).toFixed(0) : '0'
          const isSelected = selected === opt.key
          const isDisabled = disabled || !!match.result

          return (
            <button
              key={opt.key}
              className={`bet-btn ${isSelected ? 'selected' : ''} ${match.result ? 'settled' : ''}`}
              onClick={() => onSelect(opt.key)}
              disabled={isDisabled}
              title={opt.key === 'SKIP' ? 'Skip this match ($0 P/L)' : `Win: +$${profit}`}
            >
              <span className="bet-label">{opt.label}</span>
              {opt.key !== 'SKIP' && (
                <span className="bet-odds">{odds.toFixed(2)}x</span>
              )}
              <span className={`bet-pl ${opt.key === 'SKIP' ? 'skip' : ''}`}>
                {opt.key === 'SKIP' ? '$0' : `+$${profit}`}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
