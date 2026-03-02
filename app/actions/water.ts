'use server'

import { createClient } from '@/lib/supabase/server'
import { updateDailyAdherence, updateJourneyProgress } from './adherence'

export async function addWater(ml: number) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const today = new Date().toISOString().split('T')[0]

  const { data: profile } = await supabase
    .from('profiles')
    .select('water_ml_today, water_updated_date')
    .eq('id', user.id)
    .single()

  const currentTotal =
    profile?.water_updated_date === today ? profile.water_ml_today ?? 0 : 0

  const newTotal = currentTotal + ml

  await supabase
    .from('profiles')
    .update({
      water_ml_today: newTotal,
      water_updated_date: today,
    })
    .eq('id', user.id)

  await updateDailyAdherence(today)
  await updateJourneyProgress()

  return { success: true, total: newTotal }
}

export async function getWaterToday() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 0

  const today = new Date().toISOString().split('T')[0]
  const { data: profile } = await supabase
    .from('profiles')
    .select('water_ml_today, water_updated_date')
    .eq('id', user.id)
    .single()

  if (profile?.water_updated_date !== today) return 0
  return profile?.water_ml_today ?? 0
}

