import Link from 'next/link'
import Logo from '@/components/Logo'
import { ArrowRight, Radar } from 'lucide-react'
export default function NotFound() {
  return (
    <main id="main" className="shell error-page">
      <Link href="/">
        <Logo theme="dark" />
      </Link>
      <Radar size={44} className="accent" />
      <span className="eyebrow">NO SIGNAL / 404</span>
      <h1>This link has gone quiet.</h1>
      <p>
        Reports expire after one hour. This link may have expired, or the
        address may be incorrect. Run a fresh audit and export the report to
        keep it.
      </p>
      <Link href="/" className="button primary">
        Start a new audit <ArrowRight size={16} />
      </Link>
    </main>
  )
}
