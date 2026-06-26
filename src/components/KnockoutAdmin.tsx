'use client'

import { useEffect, useState } from 'react'

interface ActionResult {
  ok: boolean
  msg: string
  details?: any
}

export default function KnockoutAdmin() {
  const [actionResult, setActionResult] = useState<ActionResult | null>(null)
  const [running, setRunning] = useState<string | null>(null)
  const [status, setStatus] = useState<any>(null)
  const [statusLoading, setStatusLoading] = useState(false)

  const fetchStatus = async () => {
    setStatusLoading(true)
    try {
      const res = await fetch('/api/knockout/admin/status')
      const data = await res.json()
      setStatus(data)
    } catch {
      setStatus({ error: 'Failed to fetch status' })
    } finally {
      setStatusLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  const handleRun = async (action: string) => {
    if (running) return

    setRunning(action)
    setActionResult(null)

    try {
      const res = await fetch(`/api/knockout/admin/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()

      if (res.ok && (data.success || data.status === 'success')) {
        setActionResult({
          ok: true,
          msg: `${action} completed successfully.`,
          details: data,
        })
      } else if (data.status === 'skipped') {
        setActionResult({
          ok: true,
          msg: `Skipped — ${data.reason ?? 'nothing to do.'}`,
          details: data,
        })
      } else {
        setActionResult({
          ok: false,
          msg: data.error ?? `Request failed (${res.status})`,
          details: data,
        })
      }
    } catch (err: any) {
      setActionResult({ ok: false, msg: `Network error: ${err.message}` })
    } finally {
      setRunning(null)
      fetchStatus()
    }
  }

  return (
    <div className="admin-manager">
      <h2 className="section-title">Knockout Admin</h2>

      {/* ── Status readout ──────────────────────────────────── */}
      <div className="ko-admin-status" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Tournament Status</h3>
          <button
            className="ko-lock-btn"
            onClick={fetchStatus}
            disabled={statusLoading}
            style={{ padding: '4px 12px', fontSize: 12 }}
          >
            {statusLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {status && !status.error && (
          <div className="admin-feedback success" style={{ marginTop: 12, fontSize: 13 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '4px 8px' }}>Round</th>
                  <th style={{ textAlign: 'left', padding: '4px 8px' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '4px 8px' }}>Window Opens</th>
                  <th style={{ textAlign: 'left', padding: '4px 8px' }}>Window Closes</th>
                </tr>
              </thead>
              <tbody>
                {(status.rounds ?? []).map((r: any) => (
                  <tr key={r.id}>
                    <td style={{ padding: '4px 8px' }}>{r.name}</td>
                    <td style={{ padding: '4px 8px' }}>{r.status}</td>
                    <td style={{ padding: '4px 8px' }}>
                      {r.window_opens_at ? new Date(r.window_opens_at).toLocaleString() : '—'}
                    </td>
                    <td style={{ padding: '4px 8px' }}>
                      {r.window_closes_at ? new Date(r.window_closes_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 8, display: 'flex', gap: 16 }}>
              <span>Pending matches: <strong>{status.matches_pending}</strong></span>
              <span>Needing poll: <strong>{status.matches_needing_poll}</strong></span>
              <span>
                Last odds snapshot:{' '}
                <strong>
                  {status.last_odds_snapshot
                    ? new Date(status.last_odds_snapshot.snapshot_taken_at).toLocaleString()
                    : 'Never'}
                </strong>
              </span>
            </div>
          </div>
        )}

        {status?.error && (
          <div className="admin-feedback error" style={{ marginTop: 12 }}>
            {status.error}
          </div>
        )}
      </div>

      {/* ── Action buttons ──────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button
          className="ko-admin-action-btn"
          onClick={() => handleRun('fetch-results')}
          disabled={running !== null}
          style={{ opacity: running === 'fetch-results' ? 0.6 : 1 }}
        >
          <span className="ko-admin-action-label">
            {running === 'fetch-results' ? 'Fetching...' : 'Fetch Match Results'}
          </span>
          <span className="ko-admin-action-desc">
            Call Odds API once to pull completed match results. Auto-opens next round.
          </span>
        </button>

        <button
          className="ko-admin-action-btn"
          onClick={() => handleRun('resolve-tournament')}
          disabled={running !== null}
          style={{ opacity: running === 'resolve-tournament' ? 0.6 : 1 }}
        >
          <span className="ko-admin-action-label">
            {running === 'resolve-tournament' ? 'Resolving...' : 'End Tournament'}
          </span>
          <span className="ko-admin-action-desc">
            Compute Final Points after champion is crowned.
          </span>
        </button>
      </div>

      {/* ── Result detail ───────────────────────────────────── */}
      {actionResult && (
        <div
          className={`ko-admin-result ${actionResult.ok ? 'ko-admin-success' : 'ko-admin-error'}`}
          style={{ marginTop: 16 }}
        >
          <p className="ko-admin-result-msg">{actionResult.msg}</p>
          {actionResult.details && (
            <pre className="ko-admin-result-details">
              {JSON.stringify(actionResult.details, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}
