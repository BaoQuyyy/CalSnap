import { createBrowserClient } from '@supabase/ssr'

function getSafeUrl(): string {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    try {
        new URL(url)
        return url
    } catch {
        if (typeof window !== 'undefined') {
            console.warn('[CalSnap] NEXT_PUBLIC_SUPABASE_URL is missing or invalid. Authentication will not work.')
        }
        return 'https://placeholder.supabase.co'
    }
}

export function createClient() {
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!anonKey && typeof window !== 'undefined') {
        console.warn('[CalSnap] NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Authentication will not work.')
    }
    return createBrowserClient(getSafeUrl(), anonKey || 'placeholder-anon-key')
}
