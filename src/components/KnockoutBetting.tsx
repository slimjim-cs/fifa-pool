'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/lib/UserContext'
import {
  fetchLedger,
  fetchKnockoutMatches,
  submitInvestments,
  Round,
  KnockoutMatch,
  OddsEntry,
  TokenLedger,
  Investment,
} from '@/lib/knockout-api'

interface Props {
  tournamentState: any
  onStateChange: () => void
}

export default function KnockoutBetting({ tournamentState, onStateChange }: Props) {
  const { user } = useUser()
  const [activeRound, setActiveRound] = useState<Round | null>(null)
  const [ledger, setLedger] = useState<TokenLedger | null>(null)
  const [odds, setOdds] = useState<OddsEntry[]>([])
  const [allocations, setAllocations] = useState<Record<string, number>>({})
  const [existingInvestments, setExistingInvestments] = useState<Investment[]>([])
  const [pastInvestments, setPastInvestments] = useState<Investment[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const [eliminatedTeams, setEliminatedTeams] = useState<string[]>([])

  const { state, current_round, surviving_teams, rounds } = tournamentState ?? {}

  useEffect(() => {
    if (!user) return
    setActiveRound(current_round)

    if (current_round) {
      fetchLedger(user.id).then((res) => {
        const row = (res.ledger ?? []).find((l: TokenLedger) => l.round_id === current_round.id)
        setLedger(row ?? null)
      }).catch(() => {})

      // Fetch odds snapshots for current round
      fetch(`/api/knockout/rounds`)
        .then((r) => r.json())
        .then((data) => {
          const round = (data.rounds ?? []).find((r: Round) => r.id === current_round.id)
          if (round) {
            fetch(`/api/knockout/audit?round_id=${current_round.id}`)
              .then((r) => r.json())
              .then((auditRes) => {
                const userInv = (auditRes.investments ?? []).filter(
                  (i: Investment) => i.user_id === user.id
                )
                setExistingInvestments(userInv)
                if (userInv.length > 0) setSubmitted(true)
              })
              .catch(() => {})
          }
        })
        .catch(() => {})
    }
  }, [user, current_round])

  useEffect(() => {
    if (!surviving_teams || !current_round) return

    // Fetch odds for this round
    fetch(`/api/knockout/odds?round_id=${current_round.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.odds) {
          setOdds(data.odds.map((o: any) => ({ team: o.team, decimal_odds: Number(o.decimal_odds) })))
        }
      })
      .catch(() => {})

    // Load previous rounds' investments
    if (user) {
      fetch(`/api/knockout/audit?user_id=${user.id}`)
        .then((r) => r.json())
        .then((data) => {
          setPastInvestments(data.investments ?? [])
        })
        .catch(() => {})
    }
  }, [surviving_teams, current_round, user])

  useEffect(() => {
    if (!surviving_teams || !tournamentState?.eliminated_teams) return
    setEliminatedTeams(tournamentState.eliminated_teams)
  }, [tournamentState])

  if (!tournamentState) {
    return <div className="loading">Loading knockout stage...</div>
  }

  const balance = ledger ? ledger.tokens_received - ledger.tokens_spent : 0
  const allocated = Object.values(allocations).reduce((s, v) => s + (v || 0), 0)
  const remaining = balance - allocated

  const handleAllocationChange = (team: string, value: string) => {
    const num = parseInt(value, 10) || 0
    setAllocations((prev) => ({ ...prev, [team]: Math.max(0, num) }))
  }

  const handleSubmit = async () => {
    if (!user || !activeRound || remaining !== 0 || submitting) return

    setSubmitting(true)
    setFeedback(null)

    const allocs = Object.entries(allocations)
      .filter(([_, val]) => val > 0)
      .map(([team, tokens_spent]) => ({ team, tokens_spent }))

    try {
      const res = await submitInvestments(user.id, activeRound.id, allocs)
      if (res.success) {
        setSubmitted(true)
        setFeedback({ ok: true, msg: `Locked in! ${res.tokens_allocated} tokens allocated.` })
        onStateChange()
      } else {
        setFeedback({ ok: false, msg: res.error ?? 'Submission failed' })
      }
    } catch (err: any) {
      setFeedback({ ok: false, msg: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  // Find odds for a team
  const getOdds = (team: string): string => {
    const entry = odds.find((o) => o.team === team)
    return entry ? entry.decimal_odds.toFixed(2) : '—'
  }

  if (!user) {
    return <div className="empty-state">Select a user above to place knockout investments.</div>
  }

  if (state === 'TOURNAMENT_COMPLETE') {
    return (
      <div className="knockout-betting">
        <div className="betting-closed-banner">Tournament Complete</div>
        <h3>Your Final Portfolio</h3>
        {/* Full summary rendered inline */}
      </div>
    )
  }

  return (
    <div className="knockout-betting">
      {state === 'WINDOW_OPEN' && !submitted && (
        <>
          <div className="ko-balance-card">
            <span className="ko-balance-label">Your Liquid Balance</span>
            <span className="ko-balance-value">{balance} tokens</span>
          </div>

          {feedback && (
            <div className={`admin-feedback ${feedback.ok ? 'success' : 'error'}`}>
              {feedback.msg}
            </div>
          )}

          <p className="admin-subtitle">
            All investments are permanent. You must allocate all <strong>{balance}</strong> tokens before the window closes.
          </p>

          <div className="ko-odds-table">
            <div className="ko-odds-header">
              <span className="ko-col-team">Team</span>
              <span className="ko-col-odds">Current Odds</span>
              <span className="ko-col-input">Tokens</span>
            </div>
            {(surviving_teams ?? []).map((team: string) => (
              <div key={team} className="ko-odds-row">
                <span className="ko-col-team">{team}</span>
                <span className="ko-col-odds">{getOdds(team)}x</span>
                <span className="ko-col-input">
                  <input
                    type="number"
                    min={0}
                    max={remaining + (allocations[team] || 0)}
                    value={allocations[team] ?? 0}
                    onChange={(e) => handleAllocationChange(team, e.target.value)}
                    className="ko-token-input"
                    disabled={submitting}
                  />
                </span>
              </div>
            ))}
          </div>

          <div className="ko-summary">
            <span>Allocated: <strong>{allocated}</strong></span>
            <span className={remaining !== 0 ? 'text-negative' : 'text-positive'}>
              Remaining: <strong>{remaining}</strong>
            </span>
          </div>

          <button
            className="ko-lock-btn"
            onClick={handleSubmit}
            disabled={remaining !== 0 || submitting}
          >
            {submitting ? 'Locking In...' : 'Lock In'}
          </button>
        </>
      )}

      {state === 'WINDOW_OPEN' && submitted && (
        <div className="ko-submitted-summary">
          <div className="admin-feedback success">
            Investments locked in for this round!
          </div>
          <h3>Your Allocations</h3>
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Team</th>
                <th>Tokens</th>
                <th>Odds Locked</th>
              </tr>
            </thead>
            <tbody>
              {existingInvestments.map((inv) => (
                <tr key={inv.id}>
                  <td>{inv.team}</td>
                  <td>{inv.tokens_spent}</td>
                  <td>{Number(inv.odds_locked_in).toFixed(2)}x</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(state === 'WINDOW_CLOSED' || state === 'ROUND_IN_PROGRESS' || state === 'ROUND_COMPLETE') && (
        <div className="ko-window-closed">
          <p className="admin-subtitle">
            {state === 'WINDOW_CLOSED' && 'The investment window for this round has closed.'}
            {state === 'ROUND_IN_PROGRESS' && 'Matches are in progress.'}
            {state === 'ROUND_COMPLETE' && 'This round is complete.'}
          </p>

          {eliminatedTeams.length > 0 && (
            <div className="ko-eliminated-banner">
              Eliminated: {eliminatedTeams.join(', ')}
            </div>
          )}

          {existingInvestments.length > 0 && (
            <>
              <h3>Your Investments This Round</h3>
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Team</th>
                    <th>Tokens</th>
                    <th>Odds Locked</th>
                  </tr>
                </thead>
                <tbody>
                  {existingInvestments.map((inv) => (
                    <tr key={inv.id}>
                      <td>{inv.team}</td>
                      <td>{inv.tokens_spent}</td>
                      <td>{Number(inv.odds_locked_in).toFixed(2)}x</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {pastInvestments.length > 0 && (
            <>
              <h3>All Your Investments</h3>
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Round</th>
                    <th>Team</th>
                    <th>Tokens</th>
                    <th>Odds</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pastInvestments.map((inv) => {
                    const eliminated = eliminatedTeams.includes(inv.team)
                    return (
                      <tr key={inv.id} className={eliminated ? 'ko-eliminated-row' : ''}>
                        <td>Round {inv.round_id}</td>
                        <td>{inv.team}</td>
                        <td>{inv.tokens_spent}</td>
                        <td>{Number(inv.odds_locked_in).toFixed(2)}x</td>
                        <td>{eliminated ? 'Eliminated' : 'Active'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  )
}
