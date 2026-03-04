export default function Loading() {
  return (
    <div className="max-w-lg mx-auto p-4 space-y-4 animate-pulse pb-24">
      <div className="h-24 rounded-[2rem] bg-slate-200 dark:bg-slate-800" />
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-16 rounded-[2rem] bg-slate-200 dark:bg-slate-800" />
      ))}
    </div>
  )
}
