import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const email = typeof body === 'object' && body !== null && 'email' in body
    ? (body as Record<string, unknown>).email
    : undefined

  if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }

  await resend.emails.send({
    from: 'ShipAudit <onboarding@resend.dev>',
    to: email,
    subject: "You're on the ShipAudit waitlist",
    text: [
      "Thanks for signing up — you're on the list.",
      '',
      "We're building ShipAudit Phase 2: continuous performance monitoring, GitHub PR checks, and team dashboards.",
      '',
      "We'll reach out when it's ready.",
      '',
      '— ShipAudit',
    ].join('\n'),
  })

  return NextResponse.json({ ok: true })
}
