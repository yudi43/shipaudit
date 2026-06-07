'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Check } from 'lucide-react'

export function CursorPromptButton({ cursorPrompt }: { cursorPrompt: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    if (copied) return
    await navigator.clipboard.writeText(cursorPrompt)
    console.log('cursor_prompt_copied')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const preview = cursorPrompt.length > 120
    ? cursorPrompt.slice(0, 120) + '…'
    : cursorPrompt

  return (
    <div className="flex flex-col gap-3">
      {/* Prompt preview */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-2 font-medium">Cursor / Claude Code prompt</p>
        <p className="text-zinc-400 font-mono text-xs leading-relaxed">{preview}</p>
      </div>

      {/* Copy button */}
      <motion.button
        onClick={handleCopy}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl font-semibold text-sm transition-colors bg-indigo-600 hover:bg-indigo-500 text-white"
      >
        <AnimatePresence mode="wait" initial={false}>
          {copied ? (
            <motion.span
              key="copied"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Copied to clipboard
            </motion.span>
          ) : (
            <motion.span
              key="copy"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy Cursor Prompt
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  )
}
