'use client'

import { useRef, useState } from 'react'
import { Check, MessageCircle, X } from 'lucide-react'
export default function FeedbackWidget() {
  const dialog = useRef<HTMLDialogElement>(null)
  const [mood, setMood] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<
    'idle' | 'sending' | 'success' | 'error'
  >('idle')
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mood,
          message: message.trim(),
          page: window.location.href,
        }),
      })
      if (!response.ok) throw new Error()
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }
  function open() {
    setStatus('idle')
    setMood('')
    setMessage('')
    dialog.current?.showModal()
  }
  return (
    <>
      <button className="feedback-trigger" onClick={open}>
        <MessageCircle size={15} />
        <span>Feedback</span>
      </button>
      <dialog
        ref={dialog}
        className="feedback-dialog"
        aria-labelledby="feedback-title"
      >
        <button
          className="dialog-close"
          aria-label="Close feedback"
          onClick={() => dialog.current?.close()}
        >
          <X size={20} />
        </button>
        <span className="eyebrow">HELP SHAPE THE TOOL</span>
        <h2 id="feedback-title">Leave a signal.</h2>
        {status === 'success' ? (
          <p role="status">
            <Check size={18} className="good" /> Received. Thanks for helping
            improve ShipAudit.
          </p>
        ) : (
          <form onSubmit={submit}>
            <p>What worked? What got in your way?</p>
            <div
              className="moods"
              role="group"
              aria-label="How was your experience?"
            >
              {['Useful', 'Needs work', 'Found a bug'].map((label) => (
                <button
                  type="button"
                  key={label}
                  aria-pressed={mood === label}
                  onClick={() => setMood(mood === label ? '' : label)}
                >
                  {label}
                </button>
              ))}
            </div>
            <label htmlFor="feedback-message" className="sr-only">
              Feedback message
            </label>
            <textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="A little context goes a long way…"
            />
            <button
              className="button primary"
              style={{ marginTop: 16 }}
              disabled={status === 'sending' || (!mood && !message.trim())}
            >
              {status === 'sending' ? 'Sending…' : 'Send feedback'}
            </button>
            {status === 'error' && (
              <p role="alert" className="poor" style={{ marginTop: 12 }}>
                Couldn’t send your note. Try again in a moment.
              </p>
            )}
          </form>
        )}
      </dialog>
    </>
  )
}
