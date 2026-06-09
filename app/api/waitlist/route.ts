import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getPostHogClient } from '@/lib/posthog-server'

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

  console.log('Waitlist signup:', email)

  try {
    // TODO: re-enable user confirmation once custom domain is verified in Resend.
    // In sandbox mode Resend can only deliver to verified addresses, so we skip
    // the user confirmation to avoid silent failures for unverified recipients.

    await resend.emails.send({
      from: 'ShipAudit <onboarding@resend.dev>',
      to: process.env.FOUNDER_EMAIL!,
      subject: `New waitlist signup: ${email}`,
      html: `
        <p>New ShipAudit Guard waitlist signup: <strong>${email}</strong></p>
        <p>Time: ${new Date().toISOString()}</p>
      `,
    })
  } catch (err) {
    console.error('Resend error:', err)
    // Still return success to the user — their email is recorded in the log
  }

  const posthog = getPostHogClient()
  posthog.capture({
    distinctId: email,
    event: 'waitlist_signup_completed',
    properties: { email },
  })
  posthog.identify({ distinctId: email, properties: { email } })
  await posthog.shutdown()

  return NextResponse.json({ ok: true })
}
