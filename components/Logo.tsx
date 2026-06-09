interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  theme?: 'dark' | 'light'
}

export default function Logo({ size = 'md', theme = 'dark' }: LogoProps) {
  const iconPx = size === 'sm' ? 28 : size === 'md' ? 36 : 48
  const textSize = size === 'sm' ? 'text-base' : size === 'md' ? 'text-xl' : 'text-2xl'
  const textColor = theme === 'dark' ? 'text-white' : 'text-slate-900'
  const radius = Math.round(iconPx * 0.22)

  return (
    <div className="flex items-center gap-2.5">
      <div
        className="flex items-center justify-center bg-slate-900 flex-shrink-0"
        style={{ width: iconPx, height: iconPx, borderRadius: radius }}
      >
        <svg
          width={Math.round(iconPx * 0.7)}
          height={Math.round(iconPx * 0.45)}
          viewBox="0 0 24 16"
          fill="none"
        >
          <polyline
            points="0,8 4,8 7,2 10,14 13,0 16,10 18,8 24,8"
            stroke="#818cf8"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <span className={`${textSize} font-bold tracking-tight ${textColor}`}>
        Ship<span className="text-indigo-400">Audit</span>
      </span>
    </div>
  )
}
