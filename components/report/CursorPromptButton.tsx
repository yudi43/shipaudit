'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export function CursorPromptButton({ cursorPrompt }: { cursorPrompt: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    if (copied) return
    await navigator.clipboard.writeText(cursorPrompt)
    console.log('cursor_prompt_copied')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const preview = cursorPrompt.length > 140 ? cursorPrompt.slice(0, 140) + '…' : cursorPrompt

  return (
    <div className="flex flex-col gap-3">
      <p className="text-slate-400 text-[11px] font-mono uppercase tracking-widest">AI FIX PROMPT</p>
      <div className="bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-200">
        <p className="text-slate-500 text-xs font-mono leading-relaxed line-clamp-2">{preview}</p>
      </div>
      <button
        onClick={handleCopy}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-colors',
          copied
            ? 'bg-emerald-600 text-white'
            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
        )}
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        {copied ? '✓ Copied to clipboard' : 'Copy AI Fix Prompt'}
      </button>
    </div>
  )
}
