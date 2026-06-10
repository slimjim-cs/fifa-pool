'use client'

import { capitalizeName } from '@/lib/utils'

interface Props {
  homeTeam: string
  awayTeam: string
  homeOdds: number
  drawOdds: number
  awayOdds: number
}

function impliedProb(decimalOdds: number): number {
  if (decimalOdds <= 1) return 0
  return 1 / decimalOdds
}

export default function ProbabilityBar({ homeTeam, awayTeam, homeOdds, drawOdds, awayOdds }: Props) {
  const rawHome = impliedProb(homeOdds)
  const rawDraw = impliedProb(drawOdds)
  const rawAway = impliedProb(awayOdds)
  const total = rawHome + rawDraw + rawAway

  const pHome = total > 0 ? (rawHome / total) * 100 : 0
  const pDraw = total > 0 ? (rawDraw / total) * 100 : 0
  const pAway = total > 0 ? (rawAway / total) * 100 : 0

  const homePct = pHome.toFixed(1)
  const drawPct = pDraw.toFixed(1)
  const awayPct = pAway.toFixed(1)

  return (
    <div className="prob-bar-container">
      <div className="prob-bar">
        <div className="prob-segment prob-home" style={{ width: `${pHome}%` }} />
        <div className="prob-segment prob-draw" style={{ width: `${pDraw}%` }} />
        <div className="prob-segment prob-away" style={{ width: `${pAway}%` }} />
      </div>
      <div className="prob-legend">
        <span className="prob-legend-item">
          <span className="prob-dot home-dot" />
          {capitalizeName(homeTeam)} {homePct}%
        </span>
        <span className="prob-legend-item">
          <span className="prob-dot draw-dot" />
          Draw {drawPct}%
        </span>
        <span className="prob-legend-item">
          <span className="prob-dot away-dot" />
          {capitalizeName(awayTeam)} {awayPct}%
        </span>
      </div>
    </div>
  )
}
