export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen flex items-center justify-center nutri-bg px-4 py-10">
            <div className="w-full max-w-sm">{children}</div>
        </div>
    )
}
