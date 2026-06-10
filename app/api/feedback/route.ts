import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const MOOD_LABELS: Record<string, string> = {
  '😍': 'Loving it',
  '😐': "It's okay",
  '😤': 'Needs work',
  '🐛': "Something's broken",
}

export async function POST(req: NextRequest) {
  const { mood, message, page } = await req.json()
  const moodLabel = mood ? (MOOD_LABELS[mood] ?? mood) : 'No mood selected'

  try {
    await resend.emails.send({
      from: 'ShipAudit Feedback <onboarding@resend.dev>',
      to: process.env.FOUNDER_EMAIL!,
      subject: `Feedback: ${moodLabel}`,
      html: `
        <div style="font-family: monospace; padding: 20px; max-width: 600px;">
          <h2 style="margin: 0 0 16px; font-size: 18px;">New ShipAudit Feedback</h2>
          <p style="margin: 0 0 8px;"><strong>Mood:</strong> ${mood ?? '—'} ${moodLabel}</p>
          <p style="margin: 0 0 8px;"><strong>Message:</strong> ${message || '(none)'}</p>
          <p style="margin: 0 0 8px;"><strong>Page:</strong> ${page}</p>
          <p style="margin: 0; color: #666;"><strong>Time:</strong> ${new Date().toISOString()}</p>
        </div>
      `,
    })
  } catch (err) {
    console.error('[feedback] Resend error:', err instanceof Error ? err.message : err)
    // Don't surface the error — UX should succeed regardless
  }

  return NextResponse.json({ ok: true })
}
