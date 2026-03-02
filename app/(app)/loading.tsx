export default function AppLoading() {
  return (
    <div className="p-4 lg:p-8 flex flex-col lg:flex-row gap-8 max-w-[1920px] mx-auto animate-pulse">
      {/* Left panel skeleton */}
      <section className="w-full lg:w-1/4 flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-slate-200" />
          <div className="space-y-2">
            <div className="h-3 w-20 bg-slate-200 rounded" />
            <div className="h-5 w-24 bg-slate-200 rounded" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-4 w-24 bg-slate-200 rounded" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-slate-200 rounded-[2rem]" />
          ))}
        </div>
        <div className="mt-auto h-32 bg-slate-200 rounded-[2.5rem]" />
      </section>
      {/* Center panel skeleton */}
      <div className="flex-1 flex flex-col gap-6 min-w-0">
        <div className="h-16 bg-slate-200 rounded-[2rem]" />
        <div className="h-64 bg-slate-200 rounded-[3rem]" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-slate-200 rounded-[2rem]" />
          ))}
        </div>
        <div className="h-48 bg-slate-200 rounded-[2rem]" />
      </div>
      {/* Right panel skeleton */}
      <section className="w-full lg:w-1/4">
        <div className="h-96 bg-slate-200 rounded-[3rem]" />
      </section>
    </div>
  )
}
