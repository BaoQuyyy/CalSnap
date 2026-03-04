export default function Loading() {
  return (
    <div className="max-w-lg mx-auto p-4 space-y-3 animate-pulse pb-24">
      <div className="h-32 rounded-[2rem] bg-slate-200 dark:bg-slate-800" />
      <div className="h-8 w-48 rounded-full bg-slate-200 dark:bg-slate-800" />
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="h-20 rounded-[2rem] bg-slate-200 dark:bg-slate-800" />
      ))}
    </div>
  )
}
