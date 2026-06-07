export function ExecutiveSummary({ summary }: { summary: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-slate-400 text-xs font-mono uppercase tracking-widest">Summary</p>
      <div className="border-l-[3px] border-indigo-200 pl-4">
        <p className="text-slate-700 text-sm leading-relaxed">{summary}</p>
      </div>
    </div>
  )
}
