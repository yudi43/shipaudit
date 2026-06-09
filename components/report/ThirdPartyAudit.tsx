import type { ThirdPartyAudit as ThirdPartyAuditData, ThirdPartyService } from '@/lib/types'

const CATEGORY_STYLE: Record<ThirdPartyService['category'], string> = {
  analytics:   'bg-blue-50 text-blue-700',
  advertising: 'bg-orange-50 text-orange-700',
  social:      'bg-green-50 text-green-700',
  chat:        'bg-purple-50 text-purple-700',
  cdn:         'bg-slate-100 text-slate-600',
  other:       'bg-slate-100 text-slate-600',
}

function blockingStyle(ms: number): string {
  if (ms > 200) return 'text-red-600 font-mono font-semibold'
  if (ms > 50)  return 'text-amber-700 font-mono'
  return 'text-slate-400 font-mono'
}

export function ThirdPartyAudit({ data }: { data: ThirdPartyAuditData }) {
  if (data.services.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      <p className="text-slate-400 text-[11px] font-mono uppercase tracking-widest">Third Party Scripts</p>

      {data.worstOffender && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
          <span className="text-amber-600 text-sm shrink-0">⚠</span>
          <p className="text-amber-700 text-xs leading-relaxed">
            <span className="font-medium">{data.worstOffender.name}</span> is your biggest third-party
            impact — {data.worstOffender.blockingTimeMs}ms of main thread blocking
          </p>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-2 border-b border-slate-100 bg-slate-50">
          <span className="text-slate-400 text-[10px] font-mono uppercase tracking-wider">Service</span>
          <span className="text-slate-400 text-[10px] font-mono uppercase tracking-wider text-right">Blocking</span>
          <span className="text-slate-400 text-[10px] font-mono uppercase tracking-wider text-right">Size</span>
          <span className="text-slate-400 text-[10px] font-mono uppercase tracking-wider text-right">Reqs</span>
        </div>

        {data.services.map((svc, i) => (
          <div
            key={`${svc.domain}-${i}`}
            className={`grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center px-4 py-2.5 ${i < data.services.length - 1 ? 'border-b border-slate-100' : ''}`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-slate-800 text-xs font-medium truncate">{svc.name}</span>
              <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wide ${CATEGORY_STYLE[svc.category]}`}>
                {svc.category}
              </span>
            </div>
            <span className={`text-xs text-right tabular-nums ${blockingStyle(svc.blockingTimeMs)}`}>
              {svc.blockingTimeMs > 0 ? `${svc.blockingTimeMs}ms` : '—'}
            </span>
            <span className="text-slate-500 text-xs font-mono text-right tabular-nums">
              {svc.transferSizeKb > 0 ? `${svc.transferSizeKb}KB` : '—'}
            </span>
            <span className="text-slate-400 text-xs font-mono text-right tabular-nums">
              {svc.requestCount}
            </span>
          </div>
        ))}
      </div>

      <p className="text-slate-400 text-xs">
        Total: <span className="font-mono">{data.totalBlockingTimeMs}ms</span> blocking
        {' · '}
        <span className="font-mono">{data.totalTransferSizeKb}KB</span> loaded
      </p>
    </div>
  )
}
