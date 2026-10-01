'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, HardDrive } from 'lucide-react'
import { getSavedAudit, type SavedAudit } from '@/lib/audit-history'
import ReportDashboard from './report/ReportDashboard'
export default function SavedReport({ auditKey }: { auditKey: string }) {
  const [audit, setAudit] = useState<SavedAudit | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    getSavedAudit(auditKey)
      .then((item) => {
        if (active) setAudit(item ?? null)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [auditKey])
  if (audit) return <ReportDashboard report={audit.report} saved />
  return (
    <main id="main" className="shell error-page">
      <HardDrive size={42} className="accent" />
      <span className="eyebrow">SAVED ON THIS BROWSER</span>
      <h1>{loading ? 'Opening the snapshot…' : 'This snapshot isn’t here.'}</h1>
      <p>
        {loading
          ? 'Reading your local audit history.'
          : 'It may have been removed, or this link was opened on a different browser or device. Saved history stays on the browser where you ran the audit.'}
      </p>
      <Link href="/history" className="button secondary">
        <ArrowLeft size={16} /> Back to history
      </Link>
    </main>
  )
}
