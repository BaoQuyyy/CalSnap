import { createBrowserClient } from '@supabase/ssr'

function getSafeUrl(): string {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    try {
        new URL(url)
        return url
    } catch {
        return 'https://placeholder.supabase.co'
    }
}

export function createClient() {
    return createBrowserClient(
        getSafeUrl(),
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
    )
}
