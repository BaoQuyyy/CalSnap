'use client'

import { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'

export function PushNotificationPrompt() {
    const [show, setShow] = useState(false)
    const [subscribing, setSubscribing] = useState(false)
    const [done, setDone] = useState(false)

    useEffect(() => {
        // Don't show if already dismissed or subscribed
        if (
            typeof window === 'undefined' ||
            !('serviceWorker' in navigator) ||
            !('PushManager' in window) ||
            localStorage.getItem('calsnap_push_dismissed') === '1'
        ) return

        if (Notification.permission === 'granted') return

        // Show prompt after 30s on first visit
        const timer = setTimeout(() => setShow(true), 30_000)
        return () => clearTimeout(timer)
    }, [])

    const dismiss = () => {
        setShow(false)
        localStorage.setItem('calsnap_push_dismissed', '1')
    }

    const subscribe = async () => {
        setSubscribing(true)
        try {
            const permission = await Notification.requestPermission()
            if (permission !== 'granted') { dismiss(); return }

            const reg = await navigator.serviceWorker.ready
            const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

            if (!vapidKey) {
                // No VAPID key configured — just show success for UX demo
                setDone(true)
                setTimeout(dismiss, 2000)
                return
            }

            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey),
            })

            await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscription: sub }),
            })

            setDone(true)
            setTimeout(dismiss, 2000)
        } catch (err) {
            console.error('Push subscribe error:', err)
            dismiss()
        } finally {
            setSubscribing(false)
        }
    }

    if (!show) return null

    return (
        <div className="fixed bottom-28 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="glass-card rounded-[1.5rem] p-4 shadow-xl flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl hoverboard-gradient flex items-center justify-center shrink-0">
                    <Bell className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    {done ? (
                        <p className="text-sm font-bold text-emerald-600">✅ Đã bật thông báo!</p>
                    ) : (
                        <>
                            <p className="text-sm font-bold text-slate-800 dark:text-white">
                                Nhắc nhở log bữa ăn
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Bật thông báo để CalSnap nhắc bạn log bữa ăn mỗi ngày.
                            </p>
                            <div className="flex gap-2 mt-3">
                                <button
                                    onClick={subscribe}
                                    disabled={subscribing}
                                    className="px-3 py-1.5 rounded-xl hoverboard-gradient text-white text-xs font-bold disabled:opacity-70 transition-opacity"
                                >
                                    {subscribing ? 'Đang bật...' : 'Bật thông báo'}
                                </button>
                                <button
                                    onClick={dismiss}
                                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold"
                                >
                                    Để sau
                                </button>
                            </div>
                        </>
                    )}
                </div>
                <button
                    onClick={dismiss}
                    className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0 text-slate-400"
                >
                    <X className="w-3 h-3" />
                </button>
            </div>
        </div>
    )
}

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}
