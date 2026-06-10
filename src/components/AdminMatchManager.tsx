'use client'

import { useEffect, useState } from 'react'
import { fetchMatches } from '@/lib/api'
import { capitalizeName } from '@/lib/utils'

interface Match {
  id: number
  match_date: string
  match_time: string
  home_team: string
  away_team: string
  result: string | null
  home_group?: string
  away_group?: string
}

const BASE = ''

async function updateMatchResult(matchId: number, result: string) {
  const res = await fetch(`${BASE}/api/admin/update-match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ match_id: matchId, result }),
  })
  return res.json()
}

export default function AdminMatchManager() {
  const [matches, setMatches] = useState<Match[]>([])
  const [selectedId, setSelectedId] = useState<number | ''>('')
  const [loading, setLoading] = useState(true)
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    fetchMatches(1, 100)
      .then((res) => setMatches((res.matches ?? []).sort(
        (a: Match, b: Match) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
      )))
      .finally(() => setLoading(false))
  }, [])

  const selectedMatch = matches.find((m) => m.id === Number(selectedId))

  const resultLabel = (m: Match, r: string) =>
    r === 'H' ? `${capitalizeName(m.home_team)} Win` :
    r === 'A' ? `${capitalizeName(m.away_team)} Win` :
    'Draw'

  const handleConfirm = async () => {
    if (!selectedMatch || !confirmTarget) return
    setUpdating(true)
    setFeedback(null)
    try {
      const data = await updateMatchResult(selectedMatch.id, confirmTarget)
      if (data.success) {
        setFeedback({ ok: true, msg: `Updated — ${data.bets_affected} bet${data.bets_affected === 1 ? '' : 's'} recalculated` })
        setMatches((prev) =>
          prev.map((m) => (m.id === selectedMatch.id ? { ...m, result: confirmTarget } : m))
        )
      } else {
        setFeedback({ ok: false, msg: data.error ?? 'Update failed' })
      }
    } catch {
      setFeedback({ ok: false, msg: 'Network error' })
    } finally {
      setUpdating(false)
      setConfirmTarget(null)
    }
  }

  const handleCancel = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) return <div className="loading">Loading matches...</div>

  return (
    <div className="admin-manager">
      <h2 className="section-title">Match Results</h2>
      <p className="admin-subtitle">Select a match and set its result to recalculate all bets.</p>

      {feedback && (
        <div className={`admin-feedback ${feedback.ok ? 'success' : 'error'}`}>
          {feedback.msg}
        </div>
      )}

      <select
        className="audit-select"
        value={selectedId}
        onChange={(e) => {
          setSelectedId(e.target.value ? Number(e.target.value) : '')
          setFeedback(null)
          setConfirmTarget(null)
        }}
      >
        <option value="">Select a match...</option>
        {matches.map((m) => (
          <option key={m.id} value={m.id}>
            {m.match_date} — {capitalizeName(m.home_team)} vs {capitalizeName(m.away_team)}{m.result ? ` [${resultLabel(m, m.result)}]` : ''}
          </option>
        ))}
      </select>

      {selectedMatch && (
        <div className="admin-match-detail">
          <div className="admin-match-info">
            <span className="match-date">{selectedMatch.match_date}</span>
            <span className="match-time">{selectedMatch.match_time}</span>
            {selectedMatch.home_group && <span className="match-group">{selectedMatch.home_group}</span>}
          </div>

          <div className="admin-teams">
            <span className="admin-team">{capitalizeName(selectedMatch.home_team)}</span>
            <span className="vs">vs</span>
            <span className="admin-team">{capitalizeName(selectedMatch.away_team)}</span>
          </div>

          <div className="admin-current-result">
            Current result:
            {selectedMatch.result ? (
              <span className={`admin-result-badge set-${selectedMatch.result.toLowerCase()}`}>
                {resultLabel(selectedMatch, selectedMatch.result)}
              </span>
            ) : (
              <span className="admin-result-badge pending">Pending</span>
            )}
          </div>

          <div className="admin-actions">
            {(['H', 'D', 'A'] as const).map((r) => {
              const isActive = selectedMatch.result === r
              return (
                <button
                  key={r}
                  className={`admin-result-btn btn-${r.toLowerCase()} ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setConfirmTarget(r)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  disabled={isActive}
                >
                  {resultLabel(selectedMatch, r)}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {confirmTarget && selectedMatch && (
        <div className="admin-confirm">
          <p>
            Set <strong>{capitalizeName(selectedMatch.home_team)} vs {capitalizeName(selectedMatch.away_team)}</strong> to{' '}
            <strong>{resultLabel(selectedMatch, confirmTarget)}</strong>? This will recalculate all bets for this match.
          </p>
          <div className="admin-confirm-actions">
            <button className="admin-btn confirm" onClick={handleConfirm} disabled={updating}>
              {updating ? 'Updating...' : 'Confirm'}
            </button>
            <button className="admin-btn cancel" onClick={() => setConfirmTarget(null)} disabled={updating}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
