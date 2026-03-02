import { Navbar } from '@/components/navbar'
import { MobileBottomNav } from '@/components/mobile-bottom-nav'
import { InstallPrompt } from '@/components/install-prompt'
import { FloatingAIAssistant } from '@/components/floating-ai-assistant'
// Thêm sau {children}:
<FloatingAIAssistant />


export default function AppLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <Navbar />
            <main className="pb-24 md:pb-8 px-4 md:px-8 pt-6 max-w-6xl mx-auto min-w-0 overflow-x-hidden">
                {children}
            </main>
            <MobileBottomNav />
            <InstallPrompt />
        </div>
    )
}
