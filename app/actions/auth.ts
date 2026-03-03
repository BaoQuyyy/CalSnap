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
        const raw = error.message ?? ''
        let friendly = raw

        if (raw.toLowerCase().includes('user already registered')) {
            friendly = 'Email này đã được đăng ký. Bạn hãy thử đăng nhập hoặc dùng email khác.'
        } else if (raw.toLowerCase().includes('invalid email')) {
            friendly = 'Địa chỉ email không hợp lệ. Vui lòng kiểm tra lại.'
        } else if (raw.toLowerCase().includes('password')) {
            friendly = 'Mật khẩu chưa đủ mạnh hoặc không hợp lệ. Thử mật khẩu dài hơn (tối thiểu 6 ký tự).'
        }

        return { error: friendly }
    }

    redirect('/login?message=Vui%20l%C3%B2ng%20ki%E1%BB%83m%20tra%20email%20%C4%91%E1%BB%83%20x%C3%A1c%20nh%E1%BA%ADn%20t%C3%A0i%20kho%E1%BA%A3n')
}

export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
}
