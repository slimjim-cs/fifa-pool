'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/lib/UserContext'
import { fetchDashboard, DashboardEntry, PortfolioRow } from '@/lib/knockout-api'

interface Props {
  tournamentState: any
}

export default function KnockoutDashboard({ tournamentState }: Props) {
  const { user } = useUser()
  const [leaderboard, setLeaderboard] = useState<DashboardEntry[]>([])
  const [portfolio, setPortfolio] = useState<{ user_id: number; teams: PortfolioRow[] }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchDashboard()
      .then((data) => {
        setLeaderboard(data.leaderboard ?? [])
        setPortfolio(data.portfolio ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [tournamentState])

  const userPortfolio = portfolio.find((p) => p.user_id === user?.id)

  if (loading) return <div className="loading">Loading dashboard...</div>

  return (
    <div className="knockout-dashboard">
      <h2 className="section-title">Leaderboard — Best Case Points</h2>
      <p className="admin-subtitle">
        Maximum points each player could earn if their single best surviving investment wins.
      </p>

      {leaderboard.length === 0 ? (
        <div className="empty-state">No investments placed yet.</div>
      ) : (
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Best Case Points</th>
              <th>Teams Still In</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry, i) => (
              <tr
                key={entry.user_id}
                className={i < 3 ? `top-${i + 1}` : ''}
              >
                <td className="rank">{i + 1}</td>
                <td className="player-name">
                  {entry.display_name}
                  {entry.user_id === user?.id && (
                    <span className="ko-you-badge"> (you)</span>
                  )}
                </td>
                <td className="pl positive">
                  {entry.best_case_points.toFixed(2)}
                </td>
                <td>{entry.teams_still_in}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {userPortfolio && (
        <div className="ko-portfolio-section">
          <h2 className="section-title">Your Portfolio</h2>
          {userPortfolio.teams.length === 0 ? (
            <div className="empty-state">No investments yet.</div>
          ) : (
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Total Tokens</th>
                  <th>Avg Odds</th>
                  <th>Points If Wins</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {userPortfolio.teams.map((row) => (
                  <tr key={row.team} className={row.status === 'Eliminated' ? 'ko-eliminated-row' : ''}>
                    <td>{row.team}</td>
                    <td>{row.total_tokens}</td>
                    <td>{row.weighted_avg_odds.toFixed(2)}x</td>
                    <td className="pl positive">{row.points_if_wins.toFixed(2)}</td>
                    <td>
                      <span className={`ko-status-badge ${row.status.toLowerCase()}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {!user && (
        <div className="empty-state">Select a user above to see your portfolio.</div>
      )}
    </div>
  )
}
