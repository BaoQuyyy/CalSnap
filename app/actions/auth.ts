'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAppUrl } from '@/lib/app-url'

export async function login(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
        return { error: error.message }
    }

    redirect('/')
}

export async function register(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('full_name') as string | null

    const appUrl = getAppUrl()
    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { full_name: fullName || undefined },
            emailRedirectTo: `${appUrl}/auth/callback`,
        },
    })

    if (error) {
        return { error: error.message }
    }

    redirect('/login?message=Check your email to confirm your account')
}

export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
}
