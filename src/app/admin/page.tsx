'use client'

import { useStage } from '@/lib/StageContext'
import AdminMatchManager from '@/components/AdminMatchManager'
import KnockoutAdmin from '@/components/KnockoutAdmin'

export default function AdminPage() {
  const { stage } = useStage()

  return (
    <div className="admin-page">
      {stage === 'knockout' ? <KnockoutAdmin /> : <AdminMatchManager />}
    </div>
  )
}
