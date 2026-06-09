import type { ImageAudit as ImageAuditData } from '@/lib/types'

const ISSUE_STYLE: Record<string, string> = {
  'oversized':            'bg-red-50 text-red-600',
  'wrong-format':         'bg-amber-50 text-amber-700',
  'not-lazy':             'bg-blue-50 text-blue-700',
  'too-large-for-display': 'bg-orange-50 text-orange-700',
}

const FORMAT_STYLE: Record<string, string> = {
  jpeg:    'bg-amber-50 text-amber-700',
  png:     'bg-amber-50 text-amber-700',
  gif:     'bg-amber-50 text-amber-700',
  webp:    'bg-emerald-50 text-emerald-700',
  avif:    'bg-emerald-50 text-emerald-700',
  svg:     'bg-slate-100 text-slate-600',
  unknown: 'bg-slate-100 text-slate-500',
}

export function ImageAudit({ data }: { data: ImageAuditData }) {
  if (data.issues.length === 0 || data.totalWastedKb < 50) return null

  return (
    <div className="flex flex-col gap-3">
      <p className="text-slate-400 text-[11px] font-mono uppercase tracking-widest">Image Opportunities</p>

      <p className="text-slate-500 text-xs">
        Potential savings:{' '}
        <span className="text-slate-700 font-mono font-semibold">{data.totalWastedKb}KB</span>{' '}
        across <span className="font-mono">{data.imagesWithIssues}</span> image{data.imagesWithIssues !== 1 ? 's' : ''}
      </p>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {data.issues.map((issue, i) => (
          <div
            key={issue.url}
            className={`flex items-start gap-3 px-4 py-3 ${i < data.issues.length - 1 ? 'border-b border-slate-100' : ''}`}
          >
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-800 text-xs font-medium font-mono truncate max-w-[200px]">
                  {issue.filename}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium uppercase ${FORMAT_STYLE[issue.format] ?? FORMAT_STYLE.unknown}`}>
                  {issue.format}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {issue.issues.map((label) => (
                  <span
                    key={label}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${ISSUE_STYLE[label] ?? 'bg-slate-100 text-slate-600'}`}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="text-slate-800 text-xs font-mono font-semibold">
                −{issue.wastedSizeKb}KB
              </span>
              {issue.estimatedLcpImpactMs !== undefined && issue.estimatedLcpImpactMs > 0 && (
                <span className="text-indigo-600 text-[10px] font-mono">
                  ~{issue.estimatedLcpImpactMs}ms LCP
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
