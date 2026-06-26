'use client'

import { useEffect, useState, useMemo } from 'react'
import { fetchAudit, Investment } from '@/lib/knockout-api'

export default function KnockoutAudit() {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [filterPlayer, setFilterPlayer] = useState('')
  const [filterTeam, setFilterTeam] = useState('')
  const [sortCol, setSortCol] = useState<string>('invested_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    setLoading(true)
    fetchAudit()
      .then((data) => setInvestments(data.investments ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    const filtered = investments.filter((inv) => {
      const displayName = (inv.users as any)?.display_name ?? ''
      if (filterPlayer && !displayName.toLowerCase().includes(filterPlayer.toLowerCase())) return false
      if (filterTeam && !inv.team.toLowerCase().includes(filterTeam.toLowerCase())) return false
      return true
    })

    return [...filtered].sort((a, b) => {
      let cmp = 0
      switch (sortCol) {
        case 'player':
          cmp = ((a.users as any)?.display_name ?? '').localeCompare((b.users as any)?.display_name ?? '')
          break
        case 'team':
          cmp = a.team.localeCompare(b.team)
          break
        case 'tokens':
          cmp = a.tokens_spent - b.tokens_spent
          break
        case 'odds':
          cmp = Number(a.odds_locked_in) - Number(b.odds_locked_in)
          break
        case 'round':
          cmp = a.round_id - b.round_id
          break
        case 'type':
          cmp = a.type.localeCompare(b.type)
          break
        default:
          cmp = new Date(a.invested_at).getTime() - new Date(b.invested_at).getTime()
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [investments, filterPlayer, filterTeam, sortCol, sortDir])

  if (loading) return <div className="loading">Loading audit log...</div>

  return (
    <div className="knockout-audit">
      <div className="ko-audit-filters">
        <input
          type="text"
          placeholder="Filter by player..."
          value={filterPlayer}
          onChange={(e) => setFilterPlayer(e.target.value)}
          className="ko-audit-input"
        />
        <input
          type="text"
          placeholder="Filter by team..."
          value={filterTeam}
          onChange={(e) => setFilterTeam(e.target.value)}
          className="ko-audit-input"
        />
        <span className="ko-audit-count">{sorted.length} entries</span>
      </div>

      {sorted.length === 0 ? (
        <div className="empty-state">No investments found.</div>
      ) : (
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th className="ko-sortable" onClick={() => handleSort('player')}>
                Player {sortCol === 'player' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th className="ko-sortable" onClick={() => handleSort('team')}>
                Team {sortCol === 'team' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th className="ko-sortable" onClick={() => handleSort('tokens')}>
                Tokens {sortCol === 'tokens' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th className="ko-sortable" onClick={() => handleSort('odds')}>
                Odds {sortCol === 'odds' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th className="ko-sortable" onClick={() => handleSort('round')}>
                Round {sortCol === 'round' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th>Invested At</th>
              <th className="ko-sortable" onClick={() => handleSort('type')}>
                Type {sortCol === 'type' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((inv) => (
              <tr key={inv.id}>
                <td>{(inv.users as any)?.display_name ?? `User #${inv.user_id}`}</td>
                <td>{inv.team}</td>
                <td>{inv.tokens_spent}</td>
                <td>{Number(inv.odds_locked_in).toFixed(2)}x</td>
                <td>{inv.round_id}</td>
                <td>{new Date(inv.invested_at).toLocaleString()}</td>
                <td>
                  <span className={`ko-type-badge ${inv.type === 'auto' ? 'ko-type-auto' : 'ko-type-manual'}`}>
                    {inv.type === 'auto' ? 'Auto' : 'Manual'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
