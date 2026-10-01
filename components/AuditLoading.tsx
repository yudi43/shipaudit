'use client'

import {
  ArrowLeft,
  Check,
  Cpu,
  Radio,
  Sparkles,
  Timer,
  Wifi,
} from 'lucide-react'
import { useEffect, useState } from 'react'

const steps = [
  'Read page structure',
  'Run the mobile stress test',
  'Analyze findings + write fixes',
  'Report ready',
]
const notes = [
  'A fast laptop can hide a slow experience. This test simulates a mobile CPU and a throttled 4G connection.',
  'LCP measures when the main content becomes visible. A good result is 2.5 seconds or less.',
  'INP needs real interactions. A navigation-only lab audit can’t measure it; missing data is shown as unavailable.',
  'Estimated point gains help prioritize work. They overlap, so adding them together overstates the improvement.',
]
export default function AuditLoading({
  url,
  stage,
  onExit,
}: {
  url: string
  stage: number
  onExit: () => void
}) {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <main id="main" className="loading-page shell">
      <div className="loading-top">
        <span className="eyebrow">
          <Radio size={15} /> LIVE AUDIT SESSION
        </span>
        <span className="mono muted">
          <Timer size={14} />{' '}
          {String(Math.floor(seconds / 60)).padStart(2, '0')}:
          {String(seconds % 60).padStart(2, '0')}
        </span>
      </div>
      <div className="loading-layout">
        <div>
          <p className="eyebrow accent">OBSERVE → DIAGNOSE → FIX</p>
          <h1>
            Putting your site
            <br />
            under pressure<span className="accent">.</span>
          </h1>
          <p className="loading-domain mono">{url}</p>
          <div className="scan-visual" aria-hidden="true">
            <div className="scan-line" />
            <svg viewBox="0 0 600 140">
              <path d="M0 80 H60 L80 60 L100 100 L125 25 L150 120 L180 65 H230 L250 48 L270 85 L295 35 L320 102 L350 80 H600" />
            </svg>
            <span>CPU ×4</span>
            <span>4G NETWORK</span>
            <span>COLD CACHE</span>
          </div>
          <p className="muted">
            {seconds > 90
              ? 'This run is taking longer than usual. The runner may be queued; we’re still checking for its result.'
              : 'Usually 60–90 seconds. Queue times and page complexity can add time.'}
          </p>
          <button className="text-button" onClick={onExit}>
            <ArrowLeft size={16} /> Back to the URL field
          </button>
        </div>
        <div className="panel loading-console">
          <div className="panel-head">
            <span className="eyebrow">SESSION ACTIVITY</span>
            <span className="live-dot">CONNECTED</span>
          </div>
          <ol className="stage-list" aria-live="polite">
            {steps.map((step, i) => (
              <li
                key={step}
                className={i < stage ? 'done' : i === stage ? 'active' : ''}
              >
                <span className="stage-index">
                  {i < stage ? (
                    <Check size={16} />
                  ) : (
                    String(i + 1).padStart(2, '0')
                  )}
                </span>
                <div>
                  <strong>{step}</strong>
                  <small>
                    {i < stage
                      ? 'Confirmed'
                      : i === stage
                        ? i === 1
                          ? 'Queued or running · waiting for Lighthouse'
                          : 'In progress'
                        : 'Waiting for previous stage'}
                  </small>
                </div>
                {i === stage && <span className="activity-dot" />}
              </li>
            ))}
          </ol>
          <div className="session-facts">
            <span>
              <Cpu size={15} /> Simulated mobile
            </span>
            <span>
              <Wifi size={15} /> Throttled 4G
            </span>
          </div>
          <div className="field-note">
            <span className="eyebrow">
              <Sparkles size={14} /> WHILE WE MEASURE
            </span>
            <p>{notes[Math.floor(seconds / 18) % notes.length]}</p>
          </div>
        </div>
      </div>
    </main>
  )
}
