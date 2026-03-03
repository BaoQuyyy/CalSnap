import { Navbar } from '@/components/navbar'
import { MobileBottomNav } from '@/components/mobile-bottom-nav'
import { InstallPrompt } from '@/components/install-prompt'
import { FloatingAIAssistant } from '@/components/floating-ai-assistant'
import { ThemeToggle } from '@/components/theme-toggle'
import { PushNotificationPrompt } from '@/components/push-notification-prompt'
import Script from 'next/script'

export default function AppLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 transition-colors duration-200">
            <Navbar />
            {/* Mobile theme toggle — fixed top-right, hidden on desktop (navbar has it) */}
            <div className="md:hidden fixed top-3 right-4 z-50">
                <ThemeToggle />
            </div>
            <main className="pb-24 md:pb-8 px-4 md:px-8 pt-6 max-w-6xl mx-auto min-w-0 overflow-x-hidden">
                {children}
            </main>
            <MobileBottomNav />
            <InstallPrompt />
            <FloatingAIAssistant />
            <PushNotificationPrompt />
            <Script src="/register-sw.js" strategy="afterInteractive" />
        </div>
    )
}
