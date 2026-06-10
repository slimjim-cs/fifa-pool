'use client'

import { useEffect, useState } from 'react'
import { fetchBetsForMatch, fetchMatches } from '@/lib/api'
import { capitalizeName } from '@/lib/utils'

interface Bet {
  id: number
  bet_type: string
  odds_at_bet: number
  profit_loss: number | null
  users: { username: string; display_name: string }
}

export default function AuditTable() {
  const [matches, setMatches] = useState<any[]>([])
  const [selectedMatchId, setSelectedMatchId] = useState<number | ''>('')
  const [bets, setBets] = useState<Bet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMatches(1, 100)
      .then((res) => setMatches(res.matches ?? []))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedMatchId) {
      setBets([])
      return
    }
    fetchBetsForMatch(Number(selectedMatchId)).then((res) => {
      setBets(res.bets ?? [])
    })
  }, [selectedMatchId])

  if (loading) return <div className="loading">Loading matches...</div>

  return (
    <div className="audit">
      <h2 className="section-title">Audit — View Bets by Match</h2>
      <select
        className="audit-select"
        value={selectedMatchId}
        onChange={(e) => setSelectedMatchId(e.target.value ? Number(e.target.value) : '')}
      >
        <option value="">Select a match...</option>
        {matches.map((m) => (
          <option key={m.id} value={m.id}>
            {capitalizeName(m.home_team)} vs {capitalizeName(m.away_team)} — {m.match_date}
          </option>
        ))}
      </select>

      {selectedMatchId && (
        <table className="audit-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Bet</th>
              <th>Odds</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {bets.length === 0 ? (
              <tr>
                <td colSpan={4} className="no-bets">No bets placed on this match</td>
              </tr>
            ) : (
              bets.map((b) => {
                const selectedMatch = matches.find((m) => m.id === Number(selectedMatchId))
                const home = selectedMatch ? capitalizeName(selectedMatch.home_team) : 'Home'
                const away = selectedMatch ? capitalizeName(selectedMatch.away_team) : 'Away'
                const betLabel: Record<string, string> = {
                  H: home,
                  A: away,
                  D: 'Draw',
                  'H+D': `${home} / Draw`,
                  'A+D': `${away} / Draw`,
                  SKIP: 'Skip',
                }
                return (
                <tr key={b.id}>
                  <td>{b.users.display_name}</td>
                  <td>
                    <span className={`bet-type-badge type-${b.bet_type.toLowerCase().replace('+', '_')}`}>
                      {betLabel[b.bet_type] ?? b.bet_type}
                    </span>
                  </td>
                  <td>{b.bet_type === 'SKIP' ? '—' : `${b.odds_at_bet.toFixed(2)}x`}</td>
                  <td className={`pl ${b.profit_loss === null ? '' : b.profit_loss >= 0 ? 'positive' : 'negative'}`}>
                    {b.profit_loss === null ? 'Pending' : `${b.profit_loss >= 0 ? '+' : ''}$${b.profit_loss.toFixed(2)}`}
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
        </table>
      )}
    </div>
  )
}
