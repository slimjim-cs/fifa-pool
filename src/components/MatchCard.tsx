'use client'

import { useState, useEffect } from 'react'
import TeamMetaPanel from './TeamMetaPanel'
import BetSelector from './BetSelector'
import PitchGraphic from './PitchGraphic'
import BenchList from './BenchList'
import ProbabilityBar from './ProbabilityBar'
import { fetchMatch, placeBet, fetchUserBets } from '@/lib/api'
import { useUser } from '@/lib/UserContext'
import { capitalizeName } from '@/lib/utils'

interface Player {
  id: number
  player_name: string
  position: string
  is_starter: boolean
  pitch_left: number | null
  pitch_top: number | null
}

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

interface PitchData {
  home_team_roster: Player[]
  away_team_roster: Player[]
}

interface Props {
  match: Match
  bettingEnabled?: boolean
}

export default function MatchCard({ match, bettingEnabled = true }: Props) {
  const { user } = useUser()
  const [selectedBet, setSelectedBet] = useState<string | null>(null)
  const [betPl, setBetPl] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [showPitchFor, setShowPitchFor] = useState<'home' | 'away' | null>(null)
  const [pitchData, setPitchData] = useState<PitchData | null>(null)
  const [loadingPitch, setLoadingPitch] = useState(false)

  const group = match.home_team_meta?.group ?? match.away_team_meta?.group

  useEffect(() => {
    if (!user) {
      setSelectedBet(null)
      setBetPl(null)
      return
    }
    fetchUserBets(user.id, match.id).then((res) => {
      const myBet = res.bets?.[0]
      setSelectedBet(myBet?.bet_type ?? null)
      setBetPl(myBet?.profit_loss ?? null)
    })
  }, [user?.id, match.id])

  const handleBet = async (betType: string) => {
    if (!user || saving) return
    setSaving(true)
    setSelectedBet(betType)
    try {
      await placeBet(user.id, match.id, betType)
    } finally {
      setSaving(false)
    }
  }

  const handleTogglePitch = async (side: 'home' | 'away') => {
    if (showPitchFor === side) {
      setShowPitchFor(null)
      return
    }
    setShowPitchFor(side)
    if (!pitchData) {
      setLoadingPitch(true)
      try {
        const data = await fetchMatch(match.id)
        setPitchData(data)
      } finally {
        setLoadingPitch(false)
      }
    }
  }

  const settled = !!match.result
  const noUser = !user
  const resultLabel =
    match.result === 'H' ? capitalizeName(match.home_team) :
    match.result === 'A' ? capitalizeName(match.away_team) :
    match.result === 'D' ? 'Draw' : null

  return (
    <div className={`match-card ${settled ? 'settled' : ''}`}>
      <div className="match-header">
        <span className="match-date">{match.match_date}</span>
        <span className="match-time">{match.match_time}</span>
        {group && <span className="match-group">{group}</span>}
        {resultLabel && <span className="match-result">{resultLabel}</span>}
      </div>

      <div className="match-body">
        <TeamMetaPanel side="home" country={match.home_team} meta={match.home_team_meta} />
        <div className="match-center">
          <div className="match-teams">
            <span className="team-score home">{capitalizeName(match.home_team)}</span>
            <span className="vs">vs</span>
            <span className="team-score away">{capitalizeName(match.away_team)}</span>
          </div>
        </div>
        <TeamMetaPanel side="away" country={match.away_team} meta={match.away_team_meta} />
      </div>

      <ProbabilityBar
        homeTeam={match.home_team}
        awayTeam={match.away_team}
        homeOdds={match.home_win_odds_decimal}
        drawOdds={match.draw_odds_decimal}
        awayOdds={match.away_win_odds_decimal}
      />

      <BetSelector
        match={match}
        selected={selectedBet}
        onSelect={handleBet}
        disabled={settled || noUser || saving || !bettingEnabled}
      />

      {settled && betPl !== null && (
        <div className={`bet-result ${betPl >= 0 ? 'won' : 'lost'}`}>
          {betPl === 0 ? 'Skipped — $0.00' : betPl > 0 ? `Won +$${betPl.toFixed(2)}` : `Lost $${betPl.toFixed(2)}`}
        </div>
      )}

      {noUser && !settled && (
        <div className="bet-result hint">Select a user above to place bets</div>
      )}
      {!noUser && !settled && !bettingEnabled && (
        <div className="bet-result hint">Betting is currently closed</div>
      )}

      <div className="match-actions">
        <button
          className={`toggle-pitch-btn ${showPitchFor === 'home' ? 'active' : ''}`}
          onClick={() => handleTogglePitch('home')}
          disabled={loadingPitch}
        >
          {loadingPitch && !pitchData
            ? 'Loading...'
            : `Roster: ${capitalizeName(match.home_team)}`}
        </button>
        <button
          className={`toggle-pitch-btn ${showPitchFor === 'away' ? 'active' : ''}`}
          onClick={() => handleTogglePitch('away')}
          disabled={loadingPitch}
        >
          {loadingPitch && !pitchData
            ? 'Loading...'
            : `Roster: ${capitalizeName(match.away_team)}`}
        </button>
      </div>

      {showPitchFor && pitchData && (
        <div className="pitch-section">
          <PitchGraphic
            teamName={showPitchFor === 'home' ? match.home_team : match.away_team}
            opponentName={showPitchFor === 'home' ? match.away_team : match.home_team}
            players={showPitchFor === 'home' ? pitchData.home_team_roster : pitchData.away_team_roster}
          />
          <BenchList
            teamName={showPitchFor === 'home' ? match.home_team : match.away_team}
            players={showPitchFor === 'home' ? pitchData.home_team_roster : pitchData.away_team_roster}
          />
        </div>
      )}
    </div>
  )
}
