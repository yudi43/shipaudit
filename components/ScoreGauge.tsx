'use client'

import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

export function scoreTone(score: number) {
  return score >= 90 ? 'good' : score >= 60 ? 'warn' : 'poor'
}
export default function ScoreGauge({
  score,
  compact = false,
  unavailable = false,
}: {
  score: number
  compact?: boolean
  unavailable?: boolean
}) {
  const reduced = useReducedMotion()
  const [display, setDisplay] = useState(score)
  useEffect(() => {
    if (reduced || unavailable) return
    let frame: number
    const start = performance.now()
    function tick(now: number) {
      const progress = Math.min(1, (now - start) / 850)
      setDisplay(Math.round(score * (1 - (1 - progress) ** 3)))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [score, reduced, unavailable])
  return (
    <div
      className={`score-gauge ${compact ? 'compact' : ''} ${unavailable ? 'unavailable' : scoreTone(score)}`}
      aria-label={
        unavailable
          ? 'Score unavailable'
          : `ShipAudit score ${score} out of 100`
      }
    >
      <svg viewBox="0 0 180 180" aria-hidden="true">
        <circle cx="90" cy="90" r="76" className="gauge-track" />
        <circle
          cx="90"
          cy="90"
          r="76"
          className="gauge-fill"
          pathLength="100"
          strokeDasharray={`${unavailable ? 0 : score} 100`}
        />
      </svg>
      <div>
        <strong aria-hidden="true">
          {unavailable ? '—' : reduced ? score : display}
        </strong>
        <span> {unavailable ? 'NO SCORE' : '/ 100'}</span>
      </div>
    </div>
  )
}
