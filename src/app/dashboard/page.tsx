'use client'

import { useEffect, useState } from 'react'
import { useStage } from '@/lib/StageContext'
import Leaderboard from '@/components/Leaderboard'
import DashboardChart from '@/components/DashboardChart'
import KnockoutDashboard from '@/components/KnockoutDashboard'
import { fetchKnockoutState } from '@/lib/knockout-api'

function GroupDashboard() {
  return (
    <div className="dashboard-page">
      <Leaderboard />
      <DashboardChart />
    </div>
  )
}

function KnockoutDashboardPage() {
  const [state, setState] = useState<any>(null)

  useEffect(() => {
    fetchKnockoutState().then(setState).catch(() => {})
  }, [])

  return <KnockoutDashboard tournamentState={state} />
}

export default function DashboardPage() {
  const { stage } = useStage()

  if (stage === 'knockout') {
    return <KnockoutDashboardPage />
  }

  return <GroupDashboard />
}
