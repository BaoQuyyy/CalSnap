export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse flex flex-col items-center gap-4 w-full max-w-md p-8">
        <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-10 w-full rounded-2xl bg-slate-200 dark:bg-slate-700" />
        <div className="h-10 w-full rounded-2xl bg-slate-200 dark:bg-slate-700" />
        <div className="h-10 w-3/4 rounded-2xl bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  )
}
