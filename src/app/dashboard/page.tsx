'use client'

import Leaderboard from '@/components/Leaderboard'
import DashboardChart from '@/components/DashboardChart'

export default function DashboardPage() {
  return (
    <div className="dashboard-page">
      <Leaderboard />
      <DashboardChart />
    </div>
  )
}
