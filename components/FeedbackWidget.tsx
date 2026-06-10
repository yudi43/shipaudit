'use client'

import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import posthog from 'posthog-js'

const MOODS = [
  { emoji: '😍', label: 'Loving it' },
  { emoji: '😐', label: "It's okay" },
  { emoji: '😤', label: 'Needs work' },
  { emoji: '🐛', label: "Something's broken" },
]

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedMood, setSelectedMood] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  function reset() {
    setSelectedMood(null)
    setMessage('')
    setIsSubmitting(false)
    setIsSuccess(false)
  }

  function close() {
    setIsOpen(false)
    setTimeout(reset, 300)
  }

  async function handleSubmit() {
    setIsSubmitting(true)
    posthog.capture('feedback_submitted', { mood: selectedMood, hasMessage: !!message.trim() })
    fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mood: selectedMood, message: message.trim(), page: window.location.href }),
    }).catch(() => {})
    setIsSuccess(true)
    setTimeout(close, 2500)
  }

  const canSubmit = !isSubmitting && (!!selectedMood || !!message.trim())

  return (
    <>
      {/* Trigger */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 flex flex-col items-center gap-1.5 z-50">
        <AnimatePresence>
          {!isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              className="px-2.5 py-1 rounded-full text-[10px] text-white/50 select-none pointer-events-none"
              style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)' }}
            >
              Got feedback?
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setIsOpen((o) => !o)}
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center shadow-lg transition-colors"
          aria-label="Give feedback"
        >
          <MessageCircle className="w-[20px] h-[20px] sm:w-[22px] sm:h-[22px] text-white" />
        </button>
      </div>

      {/* Sticky note */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 16 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="fixed z-50 right-4 bottom-[70px] w-[calc(100vw-32px)] sm:right-6 sm:bottom-[82px] sm:w-[280px]"
            style={{ transformOrigin: 'bottom right' }}
          >
            <div
              className="relative sm:rotate-[-1.5deg]"
              style={{
                background: '#fef9c3',
                borderRadius: '2px 12px 12px 12px',
                boxShadow: '3px 4px 0px rgba(0,0,0,0.3)',
                padding: '20px 16px 16px',
              }}
            >
              {/* Tape strip */}
              <div
                style={{
                  position: 'absolute',
                  top: '-10px',
                  left: '20px',
                  width: '48px',
                  height: '20px',
                  background: 'rgba(254,243,135,0.7)',
                  borderRadius: '2px',
                }}
              />

              {/* Close button */}
              <button
                onClick={close}
                className="absolute top-2.5 right-3 text-lg leading-none transition-opacity hover:opacity-100"
                style={{ color: '#92400e', opacity: 0.45 }}
                aria-label="Close"
              >
                ×
              </button>

              {isSuccess ? (
                <div className="flex flex-col items-center gap-2 py-4 text-center">
                  <span style={{ fontSize: '32px' }}>🙌</span>
                  <p style={{ color: '#713f12', fontSize: '13px', fontWeight: 500, margin: 0 }}>noted. thank you.</p>
                  <p style={{ color: '#92400e', fontSize: '11px', opacity: 0.6, margin: 0 }}>
                    you&apos;re helping build something good
                  </p>
                </div>
              ) : (
                <>
                  <p style={{ color: '#713f12', fontSize: '13px', fontWeight: 500, margin: '0 0 2px' }}>
                    leave a note
                  </p>
                  <p style={{ color: '#92400e', fontSize: '11px', opacity: 0.7, margin: '0 0 12px' }}>
                    takes 10 seconds, means a lot
                  </p>

                  {/* Mood row */}
                  <div className="flex gap-1.5 mb-3">
                    {MOODS.map(({ emoji, label }) => (
                      <button
                        key={emoji}
                        title={label}
                        onClick={() => setSelectedMood(selectedMood === emoji ? null : emoji)}
                        className="flex-1 flex items-center justify-center py-1.5 rounded-lg transition-transform active:scale-95 hover:scale-110"
                        style={{
                          border: `1.5px solid ${selectedMood === emoji ? '#92400e' : 'rgba(180,130,0,0.2)'}`,
                          background: selectedMood === emoji ? 'white' : 'rgba(255,255,255,0.5)',
                          fontSize: '18px',
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  {/* Textarea */}
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="what's on your mind? (optional)"
                    rows={3}
                    className="w-full resize-none rounded-lg outline-none block mb-3 transition-colors"
                    style={{
                      background: 'rgba(255,255,255,0.5)',
                      border: '1.5px solid rgba(180,130,0,0.2)',
                      padding: '8px',
                      fontSize: '12px',
                      color: '#78350f',
                      lineHeight: 1.5,
                    }}
                    onFocus={(e) => (e.target.style.borderColor = 'rgba(180,130,0,0.5)')}
                    onBlur={(e) => (e.target.style.borderColor = 'rgba(180,130,0,0.2)')}
                  />

                  {/* Submit */}
                  <button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="w-full rounded-lg transition-opacity disabled:opacity-40"
                    style={{
                      background: '#92400e',
                      color: '#fef9c3',
                      fontSize: '12px',
                      padding: '8px',
                      fontWeight: 500,
                    }}
                  >
                    {isSubmitting ? 'sending…' : 'send it'}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
