'use client'

import type { ShipAuditScore } from '@/lib/types'

// 220° arc, 120px radius — gap at the bottom
const R = 120
const CX = 130
const CY = 140

function pt(deg: number) {
  const rad = (deg * Math.PI) / 180
  return { x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) }
}

// Arc from 160° (lower-left) to 20° (lower-right), clockwise through top
const START = pt(160)
const END = pt(20)
const TRACK = `M ${START.x.toFixed(2)} ${START.y.toFixed(2)} A ${R} ${R} 0 1 1 ${END.x.toFixed(2)} ${END.y.toFixed(2)}`
const ARC_LEN = (220 / 360) * 2 * Math.PI * R

function arcColor(score: number) {
  if (score >= 90) return '#10b981' // emerald-500
  if (score >= 60) return '#f59e0b' // amber-500
  return '#ef4444'                  // red-500
}

export function ScoreCard({ score }: { score: ShipAuditScore }) {
  const color = arcColor(score.current)
  const filled = ARC_LEN * (score.current / 100)
  const offset = ARC_LEN - filled

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-slate-400 text-xs font-mono uppercase tracking-widest self-start">ShipAudit Score</p>

      {/* Arc */}
      <div className="relative">
        <svg viewBox="0 0 260 230" className="w-52 sm:w-64" aria-label={`Score: ${score.current} out of 100`}>
          <path d={TRACK} fill="none" stroke="#e2e8f0" strokeWidth={8} strokeLinecap="round" />
          <path
            d={TRACK}
            fill="none"
            stroke={color}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={ARC_LEN}
            strokeDashoffset={offset}
          />
        </svg>

        {/* Score number centered in arc */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pb-4">
          <div className="flex items-end gap-1">
            <span className="text-6xl font-bold font-mono leading-none text-slate-900">
              {score.current}
            </span>
            <span className="text-slate-400 text-xl pb-1">/ 100</span>
          </div>
        </div>
      </div>

      {/* Achievable — only show if there's room to improve */}
      {score.achievable > score.current && (
        <p className="text-slate-500 text-sm -mt-2">
          Achievable: <span className="text-slate-700 font-mono font-semibold">{score.achievable}</span>/100
        </p>
      )}

      {/* Score breakdown */}
      <div className="flex gap-2 flex-wrap justify-center">
        {[
          { label: 'Perf', value: score.breakdown.performance },
          { label: 'A11y', value: score.breakdown.accessibility },
          { label: 'SEO',  value: score.breakdown.seo },
          { label: 'BP',   value: score.breakdown.bestPractices },
        ].map(({ label, value }) => (
          <span key={label} className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-mono border border-slate-200">
            {label} <span style={{ color: arcColor(value) }}>{value}</span>
          </span>
        ))}
      </div>

      <div className="w-full border-t border-slate-200" />

      {/* Top opportunities */}
      <div className="w-full flex flex-col gap-0">
        <p className="text-slate-400 text-xs font-mono uppercase tracking-widest mb-3">Top Opportunities</p>
        {score.topOpportunities.map((f, i) => (
          <div
            key={f.id}
            className={`flex items-center justify-between gap-4 py-2.5 ${i < score.topOpportunities.length - 1 ? 'border-b border-slate-100' : ''}`}
          >
            <span className="text-slate-700 text-sm truncate">{f.title}</span>
            <span className="shrink-0 text-indigo-600 text-xs font-mono">+{f.estimatedPointImpact} pts</span>
          </div>
        ))}
        <p className="text-slate-400 text-xs mt-2">Point impacts are individual estimates, not cumulative.</p>
      </div>
    </div>
  )
}
