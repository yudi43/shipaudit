import { Globe, Layers, Wind } from 'lucide-react'
import type { DetectedStack } from '@/lib/types'

export function StackBadges({ stack }: { stack: DetectedStack }) {
  const badges = [
    { icon: <Layers className="w-3 h-3" />, label: stack.framework },
    { icon: <Globe className="w-3 h-3" />, label: stack.deployPlatform },
    ...(stack.hasTailwind ? [{ icon: <Wind className="w-3 h-3" />, label: 'Tailwind CSS' }] : []),
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((b) => (
        <span
          key={b.label}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-medium"
        >
          {b.icon}
          {b.label}
        </span>
      ))}
    </div>
  )
}
