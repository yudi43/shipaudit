'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import posthog from 'posthog-js'

export function ReanalyzeButton({ url }: { url: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handle() {
    if (loading) return
    setLoading(true)
    posthog.capture('report_reanalyzed', { url })
    try {
      await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, refresh: true }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handle}
      disabled={loading}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors',
        'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100',
        loading && 'opacity-50 cursor-not-allowed'
      )}
    >
      <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
      {loading ? 'Re-analyzing…' : 'Re-analyze'}
    </button>
  )
}
