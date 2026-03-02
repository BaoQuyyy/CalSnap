export default function LoginLoading() {
  return (
    <div className="glass-card rounded-[3rem] p-10 max-w-sm mx-auto animate-pulse">
      <div className="h-14 w-14 rounded-full bg-slate-200 mx-auto mb-6" />
      <div className="h-8 w-48 bg-slate-200 rounded-xl mx-auto mb-2" />
      <div className="h-4 w-40 bg-slate-200 rounded mx-auto mb-8" />
      <div className="space-y-4">
        <div className="h-12 bg-slate-200 rounded-2xl" />
        <div className="h-12 bg-slate-200 rounded-2xl" />
      </div>
      <div className="h-12 bg-slate-200 rounded-2xl mt-6" />
    </div>
  )
}
