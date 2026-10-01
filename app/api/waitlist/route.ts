import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getRedis } from '@/lib/redis'
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const email =
    body && typeof body === 'object' && 'email' in body ? body.email : null
  if (
    typeof email !== 'string' ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  )
    return NextResponse.json(
      { error: 'Invalid email address' },
      { status: 400 },
    )
  try {
    // Save first, so a mail delivery failure cannot lose a signup.
    await getRedis().sadd('guard-waitlist', email.trim().toLowerCase())
    if (process.env.RESEND_API_KEY && process.env.FOUNDER_EMAIL) {
      try {
        await new Resend(process.env.RESEND_API_KEY).emails.send({
          from: 'ShipAudit <onboarding@resend.dev>',
          to: process.env.FOUNDER_EMAIL,
          subject: 'New ShipAudit Guard signup',
          text: `Email: ${email}\nTime: ${new Date().toISOString()}`,
        })
      } catch {
        console.error('[waitlist] Notification delivery failed; signup saved')
      }
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: 'Could not save signup' },
      { status: 503 },
    )
  }
}
