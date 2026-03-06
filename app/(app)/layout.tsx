import { Navbar } from '@/components/navbar'
import { MobileBottomNav } from '@/components/mobile-bottom-nav'
import { InstallPrompt } from '@/components/install-prompt'
import { AIAssistantWidget } from '../../components/floating-ai-habit-assistant'
import { ThemeToggle } from '@/components/theme-toggle'
import { PushNotificationPrompt } from '@/components/push-notification-prompt'
import { FeedbackInit } from '@/components/feedback-init'
import { logout } from '@/app/actions/auth'
import { LogOut } from 'lucide-react'
import Script from 'next/script'

export default function AppLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 transition-colors duration-200">
            <Navbar />
            {/* Mobile Header — glassmorphism top bar */}
            <div
                className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-end justify-between px-4 pb-3 ios-blur border-b border-white/20 dark:border-slate-800/20"
                style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)', minHeight: 'calc(env(safe-area-inset-top) + 56px)' }}
            >
                <div className="flex items-center gap-2">
                    <img src="/calsnap-logo.svg" className="w-7 h-7" alt="CalSnap" />
                    <span className="text-lg font-black text-slate-800 dark:text-white">CalSnap</span>
                </div>
                <div className="flex items-center gap-3">
                    <ThemeToggle />
                    <form action={logout}>
                        <button type="submit" className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-red-500 transition-colors">
                            <LogOut className="h-5 w-5" />
                        </button>
                    </form>
                </div>
            </div>
            <main
                className="pb-24 md:pb-8 px-4 md:px-8 md:pt-6 max-w-6xl mx-auto min-w-0 overflow-x-hidden"
                style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4rem)' }}
            >
                {children}
            </main>
            <MobileBottomNav />
            <InstallPrompt />
            <AIAssistantWidget />
            <PushNotificationPrompt />
            <FeedbackInit />
            <Script src="/register-sw.js" strategy="afterInteractive" />
        </div>
    )
}
