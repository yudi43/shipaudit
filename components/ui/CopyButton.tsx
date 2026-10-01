'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

export function CopyButton({
  text,
  label = 'Copy prompt',
  primary = false,
}: {
  text: string | (() => string)
  label?: string
  primary?: boolean
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle')
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        typeof text === 'function' ? text() : text,
      )
      setState('copied')
      setTimeout(() => setState('idle'), 2200)
    } catch {
      setState('error')
    }
  }
  return (
    <>
      <button
        type="button"
        className={primary ? 'button primary' : 'button secondary'}
        aria-label={state === 'copied' ? 'Copied to clipboard' : label}
        onClick={copy}
      >
        {state === 'copied' ? <Check size={16} /> : <Copy size={16} />}
        <span>{state === 'copied' ? 'Copied. Go ship it.' : label}</span>
      </button>
      <span
        role="status"
        className={state === 'error' ? 'copy-error' : 'sr-only'}
      >
        {state === 'copied'
          ? 'Copied to clipboard'
          : state === 'error'
            ? 'Clipboard unavailable. Select the text and copy manually.'
            : ''}
      </span>
    </>
  )
}
