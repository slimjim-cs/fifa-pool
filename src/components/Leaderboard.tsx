'use client'

import { useEffect, useState } from 'react'
import { fetchLeaderboard } from '@/lib/api'

interface UserRow {
  id: number
  username: string
  display_name: string
  total_pl: number
}

export default function Leaderboard() {
  const [data, setData] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeaderboard()
      .then((res) => setData(res.leaderboard ?? []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading">Loading leaderboard...</div>

  if (data.length === 0) {
    return <div className="empty-state">No users yet — register and start betting!</div>
  }

  return (
    <div className="leaderboard">
      <h2 className="section-title">Leaderboard</h2>
      <table className="leaderboard-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th>Total P/L</th>
          </tr>
        </thead>
        <tbody>
          {data.map((user, i) => (
            <tr key={user.id} className={i < 3 ? `top-${i + 1}` : ''}>
              <td className="rank">{i + 1}</td>
              <td className="player-name">{user.display_name}</td>
              <td className={`pl ${user.total_pl >= 0 ? 'positive' : 'negative'}`}>
                {user.total_pl >= 0 ? '+' : ''}${user.total_pl.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
