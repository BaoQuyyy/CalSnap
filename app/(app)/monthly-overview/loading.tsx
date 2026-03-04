export default function Loading() {
    return (
        <div className="max-w-5xl mx-auto p-4 space-y-4 animate-pulse pb-24">
            <div className="h-20 rounded-[2rem] bg-slate-200 dark:bg-slate-800" />
            <div className="grid gap-4 md:grid-cols-2">
                <div className="h-64 rounded-[2rem] bg-slate-200 dark:bg-slate-800" />
                <div className="h-64 rounded-[2rem] bg-slate-200 dark:bg-slate-800" />
            </div>
        </div>
    )
}
