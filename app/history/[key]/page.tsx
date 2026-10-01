import type { Metadata } from 'next'
import SavedReport from '@/components/SavedReport'
export const metadata: Metadata = {
  title: 'Saved audit | ShipAudit',
  robots: { index: false, follow: false },
}
export default async function SavedReportPage({
  params,
}: {
  params: Promise<{ key: string }>
}) {
  const { key } = await params
  return <SavedReport key={key} auditKey={key} />
}
