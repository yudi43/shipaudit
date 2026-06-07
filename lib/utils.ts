import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function generateReportId(url: string): Promise<string> {
  const data = new TextEncoder().encode(url)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16)
}

export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim()
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  const parsed = new URL(withProtocol) // throws TypeError on invalid URL
  parsed.hash = ''
  const href = parsed.toString()
  return href.endsWith('/') ? href.slice(0, -1) : href
}

export function formatVitalValue(value: number, unit: 'ms' | 's' | ''): string {
  if (unit === 'ms') {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}s`
    return `${Math.round(value)}ms`
  }
  if (unit === 's') return `${value.toFixed(2)}s`
  return value.toFixed(3)
}
