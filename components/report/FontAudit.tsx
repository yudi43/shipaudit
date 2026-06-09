import type { FontAudit as FontAuditData, FontIssue } from '@/lib/types'

const SOURCE_STYLE: Record<FontIssue['source'], string> = {
  'google-fonts':  'bg-blue-50 text-blue-700',
  'typekit':       'bg-purple-50 text-purple-700',
  'self-hosted':   'bg-slate-100 text-slate-600',
  'other':         'bg-slate-100 text-slate-500',
}

const SOURCE_LABEL: Record<FontIssue['source'], string> = {
  'google-fonts':  'Google Fonts',
  'typekit':       'Typekit',
  'self-hosted':   'Self-hosted',
  'other':         'Other',
}

export function FontAudit({ data }: { data: FontAuditData }) {
  const hasIssues = data.missingFontDisplayCount > 0 || data.renderBlockingCount > 0

  return (
    <div className="flex flex-col gap-3">
      <p className="text-slate-400 text-[11px] font-mono uppercase tracking-widest">Font Loading</p>

      {!hasIssues ? (
        <p className="text-emerald-600 text-sm font-medium flex items-center gap-1.5">
          <span>✓</span> Fonts are loading efficiently
        </p>
      ) : (
        <>
          <div className="flex gap-3 flex-wrap">
            {data.missingFontDisplayCount > 0 && (
              <span className="text-xs text-slate-600">
                <span className="font-mono font-semibold text-slate-800">{data.missingFontDisplayCount}</span>{' '}
                font{data.missingFontDisplayCount > 1 ? 's' : ''} missing{' '}
                <code className="text-[11px] bg-slate-100 px-1 py-0.5 rounded">font-display: swap</code>
              </span>
            )}
            {data.renderBlockingCount > 0 && (
              <span className="text-xs text-slate-600">
                <span className="font-mono font-semibold text-slate-800">{data.renderBlockingCount}</span>{' '}
                render-blocking
              </span>
            )}
          </div>

          {data.issues.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {data.issues.map((font, i) => (
                <div
                  key={font.url}
                  className={`flex items-center gap-3 px-4 py-3 ${i < data.issues.length - 1 ? 'border-b border-slate-100' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-800 text-sm font-medium">{font.family}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium uppercase ${SOURCE_STYLE[font.source]}`}>
                        {SOURCE_LABEL[font.source]}
                      </span>
                      {font.sizeKb > 0 && (
                        <span className="text-slate-400 text-[10px] font-mono">{font.sizeKb}KB</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    {font.hasFontDisplay ? (
                      <span className="bg-emerald-50 text-emerald-700 text-[9px] font-medium px-1.5 py-0.5 rounded uppercase">
                        swap ✓
                      </span>
                    ) : (
                      <span className="bg-red-50 text-red-600 text-[9px] font-medium px-1.5 py-0.5 rounded uppercase">
                        No font-display
                      </span>
                    )}
                    {font.isRenderBlocking && (
                      <span className="bg-red-50 text-red-600 text-[9px] font-medium px-1.5 py-0.5 rounded uppercase">
                        Render-blocking
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
