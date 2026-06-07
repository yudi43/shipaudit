export function ExecutiveSummary({ summary }: { summary: string }) {
  return (
    <div className="border-l-[3px] border-indigo-500 pl-5 py-1">
      <p className="text-zinc-300 text-lg leading-relaxed">{summary}</p>
    </div>
  )
}
