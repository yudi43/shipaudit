'use client'
import Link from 'next/link'
import { RefreshCw, TriangleAlert } from 'lucide-react'
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="shell error-page">
      <TriangleAlert size={44} className="warn" />
      <span className="eyebrow">CONNECTION INTERRUPTED</span>
      <h1>We lost the signal.</h1>
      <p>
        The report service couldn’t respond. Try loading it again, or head back
        to start a fresh audit.
      </p>
      <button className="button primary" onClick={reset}>
        Try loading again <RefreshCw size={16} />
      </button>
      <Link href="/" className="text-button">
        Back to ShipAudit
      </Link>
    </main>
  )
}
