'use client'

import { useEffect, useState } from 'react'
import { useStage } from '@/lib/StageContext'
import GroupBetting from '@/components/GroupBetting'
import KnockoutBetting from '@/components/KnockoutBetting'
import { fetchKnockoutState } from '@/lib/knockout-api'

function KnockoutBettingPage() {
  const [state, setState] = useState<any>(null)

  const loadState = () => {
    fetchKnockoutState().then((data) => setState(data)).catch(() => {})
  }

  useEffect(() => {
    loadState()
  }, [])

  return <KnockoutBetting tournamentState={state} onStateChange={loadState} />
}

export default function HomePage() {
  const { stage } = useStage()

  if (stage === 'knockout') {
    return <KnockoutBettingPage />
  }

  return <GroupBetting />
}
