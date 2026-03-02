export default function ProfileLoading() {
  return (
    <div className="space-y-6 max-w-lg mx-auto animate-pulse">
      <div className="h-8 w-32 bg-slate-200 rounded-xl" />
      <div className="h-32 bg-slate-200 rounded-[2.5rem]" />
      <div className="grid grid-cols-3 gap-4">
        <div className="h-20 bg-slate-200 rounded-[2rem]" />
        <div className="h-20 bg-slate-200 rounded-[2rem]" />
        <div className="h-20 bg-slate-200 rounded-[2rem]" />
      </div>
      <div className="h-24 bg-slate-200 rounded-[2rem]" />
    </div>
  )
}
