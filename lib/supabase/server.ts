import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function getSafeUrl(): string {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    try {
        new URL(url)
        return url
    } catch {
        console.warn('[CalSnap] NEXT_PUBLIC_SUPABASE_URL is missing or invalid. Authentication will not work.')
        return 'https://placeholder.supabase.co'
    }
}

export async function createClient() {
    const cookieStore = await cookies()
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!anonKey) {
        console.warn('[CalSnap] NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Authentication will not work.')
    }

    return createServerClient(
        getSafeUrl(),
        anonKey || 'placeholder-anon-key',
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // Server Component — can be ignored
                    }
                },
            },
        }
    )
}
