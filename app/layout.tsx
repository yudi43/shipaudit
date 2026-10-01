import type { Metadata } from 'next'
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google'
import './globals.css'
import FeedbackWidget from '@/components/FeedbackWidget'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-inter-mono',
  display: 'swap',
})
const display = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ShipAudit | AI-Powered Performance Audit',
  description:
    'Paste any URL. Get a stress-tested performance audit under simulated mobile conditions. AI-generated findings ranked by impact with framework-specific fix instructions.',
  keywords: [
    'performance audit',
    'web performance',
    'core web vitals',
    'lighthouse',
    'Next.js performance',
    'AI performance tool',
  ],
  authors: [{ name: 'ShipAudit' }],
  creator: 'ShipAudit',
  metadataBase: new URL('https://getshipaudit.vercel.app'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://getshipaudit.vercel.app',
    siteName: 'ShipAudit',
    title: 'ShipAudit | AI-Powered Performance Audit',
    description:
      'Paste any URL. Get a stress-tested performance audit with simulated mobile conditions. AI fix instructions ready to paste into Cursor.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'ShipAudit | AI-Powered Performance Audit',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ShipAudit | AI-Powered Performance Audit',
    description:
      'Paste any URL. Get a stress-tested performance audit with prioritized fixes.',
    images: ['/opengraph-image'],
    creator: '@buildwithyudi',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${jetbrainsMono.variable} ${display.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
        <FeedbackWidget />
      </body>
    </html>
  )
}
