import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body || typeof body !== 'object')
    return NextResponse.json({ error: 'Invalid feedback' }, { status: 400 })
  const mood = typeof body.mood === 'string' ? body.mood.slice(0, 100) : ''
  const message =
    typeof body.message === 'string' ? body.message.slice(0, 5000) : ''
  const page = typeof body.page === 'string' ? body.page.slice(0, 2000) : ''
  if (!mood && !message.trim())
    return NextResponse.json(
      { error: 'Add a mood or message' },
      { status: 400 },
    )
  if (!process.env.RESEND_API_KEY || !process.env.FOUNDER_EMAIL)
    return NextResponse.json(
      { error: 'Feedback delivery is unavailable' },
      { status: 503 },
    )
  try {
    const result = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: 'ShipAudit Feedback <onboarding@resend.dev>',
      to: process.env.FOUNDER_EMAIL,
      subject: `ShipAudit feedback: ${mood || 'Note'}`,
      text: `Mood: ${mood}\nMessage: ${message}\nPage: ${page}\nTime: ${new Date().toISOString()}`,
    })
    if (result.error) throw new Error('Delivery failed')
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: 'Feedback delivery failed' },
      { status: 502 },
    )
  }
}
