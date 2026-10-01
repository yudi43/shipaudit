import type { Metadata } from 'next'
import AuditHistory from '@/components/AuditHistory'
export const metadata: Metadata = {
  title: 'Your audit history | ShipAudit',
  robots: { index: false, follow: false },
}
export default function HistoryPage() {
  return <AuditHistory />
}
