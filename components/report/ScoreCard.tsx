'use client'

import { useEffect, useState } from 'react'
import { animate } from 'framer-motion'
import type { ShipAuditScore } from '@/lib/types'

// 240° speedometer arc: gap at the bottom, arc goes over the top
// SVG angles measured clockwise from positive X (right = 0°, down = 90°, top = 270°)
const R = 75
const CX = 100
const CY = 102

function pt(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) }
}

const START = pt(150) // lower-left
const END = pt(30)   // lower-right

// large-arc=1, sweep=1 → clockwise 240° through the top
const TRACK = `M ${START.x.toFixed(2)} ${START.y.toFixed(2)} A ${R} ${R} 0 1 1 ${END.x.toFixed(2)} ${END.y.toFixed(2)}`
const ARC_LEN = (240 / 360) * 2 * Math.PI * R // ≈ 314.16

function arcColor(score: number) {
  if (score >= 90) return '#34d399' // emerald-400
  if (score >= 60) return '#fbbf24' // amber-400
  return '#f87171'                  // red-400
}

export function ScoreCard({ score }: { score: ShipAuditScore }) {
  const [count, setCount] = useState(0)
  const [offset, setOffset] = useState(ARC_LEN)
  const color = arcColor(score.current)

  useEffect(() => {
    const anim = animate(0, score.current, {
      duration: 1.4,
      ease: [0.22, 1, 0.36, 1],
      onUpdate(v) {
        setCount(Math.round(v))
        setOffset(ARC_LEN * (1 - v / 100))
      },
    })
    return () => anim.stop()
  }, [score.current])

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Arc + score */}
      <div className="relative">
        <svg viewBox="0 0 200 170" className="w-60 sm:w-72" aria-label={`Score: ${score.current} out of 100`}>
          {/* Background track */}
          <path d={TRACK} fill="none" stroke="#27272a" strokeWidth={13} strokeLinecap="round" />
          {/* Score fill */}
          <path
            d={TRACK}
            fill="none"
            stroke={color}
            strokeWidth={13}
            strokeLinecap="round"
            strokeDasharray={ARC_LEN}
            strokeDashoffset={offset}
            style={{ filter: `drop-shadow(0 0 6px ${color}60)` }}
          />
        </svg>

        {/* Score number */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pb-6">
          <span className="text-6xl font-bold font-mono leading-none" style={{ color }}>
            {count}
          </span>
          <span className="text-zinc-500 text-sm font-mono mt-1">/ 100</span>
        </div>
      </div>

      {/* Achievable */}
      <p className="text-zinc-400 text-sm">
        Achievable:{' '}
        <span className="text-zinc-200 font-mono font-semibold">{score.achievable}</span>/100
      </p>

      {/* Score breakdown */}
      <div className="grid grid-cols-4 gap-3 w-full text-center">
        {[
          { label: 'Perf', value: score.breakdown.performance },
          { label: 'A11y', value: score.breakdown.accessibility },
          { label: 'SEO', value: score.breakdown.seo },
          { label: 'BP', value: score.breakdown.bestPractices },
        ].map(({ label, value }) => (
          <div key={label} className="bg-zinc-900 rounded-lg p-2 border border-zinc-800">
            <div className="text-xs text-zinc-500 mb-1">{label}</div>
            <div
              className="text-base font-mono font-semibold"
              style={{ color: arcColor(value) }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Top 3 opportunities */}
      <div className="w-full space-y-2.5">
        <p className="text-zinc-500 text-xs uppercase tracking-widest">Top opportunities</p>
        {score.topOpportunities.map((f) => (
          <div key={f.id} className="flex items-center justify-between gap-4">
            <span className="text-zinc-300 text-sm truncate">{f.title}</span>
            <span className="shrink-0 px-2 py-0.5 rounded text-xs font-mono font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              +{f.estimatedPointImpact} pts
            </span>
          </div>
        ))}
        <p className="text-zinc-600 text-xs">Point impacts are per-issue estimates, not cumulative.</p>
      </div>
    </div>
  )
}
