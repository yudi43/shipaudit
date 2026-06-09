import type { DetectedStack } from '@/lib/types'

export function StackBadges({ stack }: { stack: DetectedStack }) {
  const badges: string[] = []
  if (stack.framework !== 'Unknown') badges.push(stack.framework)
  if (stack.deployPlatform !== 'Unknown') badges.push(stack.deployPlatform)
  if (stack.hasTailwind) badges.push('Tailwind CSS')

  if (badges.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((label) => (
        <span
          key={label}
          className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-medium"
        >
          {label}
        </span>
      ))}
    </div>
  )
}
