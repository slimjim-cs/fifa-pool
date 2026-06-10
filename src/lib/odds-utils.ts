export function americanToDecimal(americanOdds: number): number {
  if (americanOdds > 0) {
    return Math.round((americanOdds / 100 + 1) * 10000) / 10000
  }
  return Math.round((100 / Math.abs(americanOdds) + 1) * 10000) / 10000
}

export function calculateProfit(oddsDecimal: number, isWin: boolean): number {
  if (oddsDecimal <= 0) return 0
  if (isWin) {
    return Math.round((100 * oddsDecimal - 100) * 100) / 100
  }
  return -100
}

export type BetType = 'H' | 'A' | 'D' | 'H+D' | 'A+D' | 'SKIP'

export function isWin(betType: BetType, result: 'H' | 'A' | 'D'): boolean {
  if (betType === result) return true
  if (betType === 'H+D' && (result === 'H' || result === 'D')) return true
  if (betType === 'A+D' && (result === 'A' || result === 'D')) return true
  return false
}

export function getOddsColumn(betType: BetType): keyof MatchRow | null {
  const map: Record<BetType, keyof MatchRow | null> = {
    'H': 'home_win_odds_decimal',
    'A': 'away_win_odds_decimal',
    'D': 'draw_odds_decimal',
    'H+D': 'home_draw_combo_decimal',
    'A+D': 'away_draw_combo_decimal',
    'SKIP': null,
  }
  return map[betType]
}

interface MatchRow {
  home_win_odds_decimal: number
  away_win_odds_decimal: number
  draw_odds_decimal: number
  home_draw_combo_decimal: number
  away_draw_combo_decimal: number
}
