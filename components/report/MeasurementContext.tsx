'use client'

import { useState } from 'react'
import { Gauge } from 'lucide-react'

export function MeasurementContext() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex items-center gap-3 bg-slate-100 border border-slate-200 rounded-lg px-4 py-3">
      <Gauge className="w-4 h-4 text-slate-400 shrink-0" />

      <div className="flex-1 min-w-0">
        <p className="text-slate-700 text-sm font-medium">Measured under stress conditions</p>
        <p className="text-slate-400 text-xs">
          Simulated mobile device · Throttled 4G network · Cold cache · No browser optimisations
        </p>
      </div>

      <div className="relative shrink-0">
        <button
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          className="w-5 h-5 rounded-full border border-slate-300 text-slate-400 text-xs flex items-center justify-center hover:border-slate-400 hover:text-slate-500 transition-colors"
          aria-label="Why are scores lower than DevTools?"
        >
          ?
        </button>

        {open && (
          <div
            role="tooltip"
            className="absolute bottom-full right-0 mb-2 w-72 bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs text-slate-600 z-20 leading-relaxed"
          >
            ShipAudit runs Lighthouse with mobile CPU throttling and slow 4G network simulation — the same conditions Google uses to measure real-world Core Web Vitals. This is intentionally harder than your DevTools score, which runs on your local machine with your fast connection and warm cache. A good ShipAudit score means your site is fast for everyone, not just you.
          </div>
        )}
      </div>
    </div>
  )
}
