'use client'

import { useStage } from '@/lib/StageContext'
import AuditTable from '@/components/AuditTable'
import KnockoutAudit from '@/components/KnockoutAudit'

export default function AuditPage() {
  const { stage } = useStage()

  return (
    <div className="audit-page">
      {stage === 'knockout' ? <KnockoutAudit /> : <AuditTable />}
    </div>
  )
}
