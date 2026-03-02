'use server'

import { createClient } from '@/lib/supabase/server'

export async function addWeightCheckin(weight_kg: number, note?: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const today = new Date().toISOString().split('T')[0]

  await supabase.from('weight_checkins').upsert(
    {
      user_id: user.id,
      weight_kg,
      date: today,
      note: note ?? null,
    },
    { onConflict: 'user_id,date' }
  )

  await supabase
    .from('profiles')
    .update({ weight_kg })
    .eq('id', user.id)

  return { success: true }
}

export async function getWeightHistory() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('weight_checkins')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: true })
    .limit(12)

  return (data as any[]) ?? []
}

