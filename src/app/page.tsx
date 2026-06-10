'use client'

import { useEffect, useState, useCallback } from 'react'
import { fetchMatches, fetchUserBets } from '@/lib/api'
import MatchCard from '@/components/MatchCard'
import Pagination from '@/components/Pagination'
import { useUser } from '@/lib/UserContext'

const GROUPS = [
  'Group A', 'Group B', 'Group C', 'Group D',
  'Group E', 'Group F', 'Group G', 'Group H',
  'Group I', 'Group J', 'Group K', 'Group L',
] as const

type FilterMode = 'unbet' | 'all' | (typeof GROUPS)[number]

interface Match {
  id: number
  match_date: string
  match_time: string
  home_team: string
  away_team: string
  home_win_odds_decimal: number
  draw_odds_decimal: number
  away_win_odds_decimal: number
  home_draw_combo_decimal: number
  away_draw_combo_decimal: number
  result: string | null
  home_team_meta: Record<string, any> | null
  away_team_meta: Record<string, any> | null
}

export default function BettingPage() {
  const { user } = useUser()
  const [allMatches, setAllMatches] = useState<Match[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterMode>('unbet')
  const limit = 10

  // Fetch all matches once (for unbet filtering)
  useEffect(() => {
    fetchMatches(1, 100).then((res) => {
      setAllMatches(res.matches ?? [])
    })
  }, [])

  // Determine which matches to display based on filter
  const applyFilter = useCallback(async () => {
    setLoading(true)
    try {
      if (filter === 'unbet') {
        const res = await fetchMatches(1, 100)
        let filtered = res.matches ?? []
        if (user) {
          const betsRes = await fetchUserBets(user.id)
          const betMatchIds = new Set((betsRes.bets ?? []).map((b: any) => b.match_id))
          filtered = filtered.filter((m: Match) => !betMatchIds.has(m.id) && !m.result)
        }
        const start = (page - 1) * limit
        setMatches(filtered.slice(start, start + limit))
        setTotal(filtered.length)
      } else if (filter === 'all') {
        const res = await fetchMatches(page, limit)
        setMatches(res.matches ?? [])
        setTotal(res.total ?? 0)
      } else {
        const res = await fetchMatches(page, limit, filter)
        setMatches(res.matches ?? [])
        setTotal(res.total ?? 0)
      }
    } finally {
      setLoading(false)
    }
  }, [filter, page, user])

  useEffect(() => {
    applyFilter()
  }, [applyFilter])

  const handleFilterChange = (f: FilterMode) => {
    setFilter(f)
    setPage(1)
  }

  return (
    <div className="betting-page">
      <div className="page-header">
        <h1 className="page-title">Group Stage — Matchups</h1>
        <div className="group-filter">
          <button
            className={`group-btn ${filter === 'unbet' ? 'active' : ''}`}
            onClick={() => handleFilterChange('unbet')}
          >
            Unbet
          </button>
          <button
            className={`group-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => handleFilterChange('all')}
          >
            All
          </button>
          {GROUPS.map((g) => (
            <button
              key={g}
              className={`group-btn ${filter === g ? 'active' : ''}`}
              onClick={() => handleFilterChange(g)}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading matches...</div>
      ) : (
        <>
          <div className="matches-list">
            {matches.length === 0 ? (
              <div className="empty-state">
                {filter === 'unbet'
                  ? 'All matches have bets! Try the All tab to review your picks.'
                  : 'No matches found.'}
              </div>
            ) : (
              matches.map((m) => <MatchCard key={m.id} match={m} />)
            )}
          </div>
          <Pagination page={page} total={total} limit={limit} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
