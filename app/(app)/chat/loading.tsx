export default function ChatLoading() {
  return (
    <div className="flex flex-col h-[calc(100dvh-10rem)] md:h-[calc(100vh-6rem)] max-w-2xl mx-auto animate-pulse min-w-0">
      <div className="glass-card rounded-[2rem] p-4 mb-4 h-20 bg-slate-100" />
      <div className="flex-1 p-4 space-y-4">
        <div className="h-16 w-3/4 bg-slate-100 rounded-2xl rounded-tl-sm" />
        <div className="h-20 w-2/3 ml-auto bg-slate-100 rounded-2xl rounded-tr-sm" />
        <div className="h-16 w-3/4 bg-slate-100 rounded-2xl rounded-tl-sm" />
      </div>
      <div className="glass-card rounded-[2rem] p-4 mt-4 h-16 bg-slate-100" />
    </div>
  )
}
