export default function Loading() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="animate-pulse flex flex-col gap-4 w-full max-w-xl p-8">
                <div className="h-16 rounded-3xl bg-slate-200 dark:bg-slate-700" />
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-16 rounded-3xl bg-slate-200 dark:bg-slate-700" />
                ))}
            </div>
        </div>
    )
}
