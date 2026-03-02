export default function LogLoading() {
  return (
    <div className="space-y-6 max-w-lg mx-auto animate-pulse">
      <div className="h-8 w-48 bg-slate-200 rounded-xl" />
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="h-10 w-14 bg-slate-200 rounded-2xl" />
        ))}
      </div>
      <div className="h-32 bg-slate-200 rounded-[2rem]" />
      <div className="space-y-3">
        <div className="h-24 bg-slate-200 rounded-[2rem]" />
        <div className="h-24 bg-slate-200 rounded-[2rem]" />
        <div className="h-24 bg-slate-200 rounded-[2rem]" />
      </div>
    </div>
  )
}
