export function ExecutiveSummary({ summary }: { summary: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-slate-400 text-[11px] font-mono uppercase tracking-widest">SUMMARY</p>
      <div className="border-l-[3px] border-indigo-200 pl-4">
        <p className="text-slate-600 text-sm leading-relaxed">{summary}</p>
      </div>
    </div>
  )
}
