export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          daily_calorie_goal: number
          full_name: string | null
          created_at: string
          // Onboarding fields
          height_cm: number | null
          weight_kg: number | null
          target_weight_kg: number | null
          goal: 'lose_weight' | 'maintain' | 'gain_muscle' | null
          activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | null
          age: number | null
          gender: 'male' | 'female' | null
          fitness_plan: Json | null
          onboarding_completed: boolean
          // Journey / water
          journey_score: number
          journey_streak: number
          last_adherence_date: string | null
          water_ml_today: number
          water_updated_date: string | null
        }
        Insert: {
          id: string
          daily_calorie_goal?: number
          full_name?: string | null
          created_at?: string
          height_cm?: number | null
          weight_kg?: number | null
          target_weight_kg?: number | null
          goal?: 'lose_weight' | 'maintain' | 'gain_muscle' | null
          activity_level?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | null
          age?: number | null
          gender?: 'male' | 'female' | null
          fitness_plan?: Json | null
          onboarding_completed?: boolean
          journey_score?: number
          journey_streak?: number
          last_adherence_date?: string | null
          water_ml_today?: number
          water_updated_date?: string | null
        }
        Update: {
          id?: string
          daily_calorie_goal?: number
          full_name?: string | null
          created_at?: string
          height_cm?: number | null
          weight_kg?: number | null
          target_weight_kg?: number | null
          goal?: 'lose_weight' | 'maintain' | 'gain_muscle' | null
          activity_level?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | null
          age?: number | null
          gender?: 'male' | 'female' | null
          fitness_plan?: Json | null
          onboarding_completed?: boolean
          journey_score?: number
          journey_streak?: number
          last_adherence_date?: string | null
          water_ml_today?: number
          water_updated_date?: string | null
        }
      }
      meal_logs: {
        Row: {
          id: string
          user_id: string
          food_name: string
          calories: number
          protein: number
          carbs: number
          fat: number
          image_url: string | null
          logged_at: string
          created_at: string
          is_favorite: boolean
        }
        Insert: {
          id?: string
          user_id: string
          food_name: string
          calories: number
          protein: number
          carbs: number
          fat: number
          image_url?: string | null
          logged_at?: string
          created_at?: string
          is_favorite?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          food_name?: string
          calories?: number
          protein?: number
          carbs?: number
          fat?: number
          image_url?: string | null
          logged_at?: string
          created_at?: string
          is_favorite?: boolean
        }
      }
      plan_adherence: {
        Row: {
          id: string
          user_id: string
          date: string
          calories_goal: number
          calories_actual: number
          protein_goal: number
          protein_actual: number
          carbs_goal: number
          carbs_actual: number
          fat_goal: number
          fat_actual: number
          water_goal_ml: number
          water_actual_ml: number
          is_on_track: boolean
          adherence_score: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          calories_goal?: number
          calories_actual?: number
          protein_goal?: number
          protein_actual?: number
          carbs_goal?: number
          carbs_actual?: number
          fat_goal?: number
          fat_actual?: number
          water_goal_ml?: number
          water_actual_ml?: number
          is_on_track?: boolean
          adherence_score?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          calories_goal?: number
          calories_actual?: number
          protein_goal?: number
          protein_actual?: number
          carbs_goal?: number
          carbs_actual?: number
          fat_goal?: number
          fat_actual?: number
          water_goal_ml?: number
          water_actual_ml?: number
          is_on_track?: boolean
          adherence_score?: number
          created_at?: string
        }
      }
      weight_checkins: {
        Row: {
          id: string
          user_id: string
          weight_kg: number
          date: string
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          weight_kg: number
          date: string
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          weight_kg?: number
          date?: string
          note?: string | null
          created_at?: string
        }
      }
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type MealLog = Database['public']['Tables']['meal_logs']['Row']
export type PlanAdherenceRow = Database['public']['Tables']['plan_adherence']['Row']
export type WeightCheckinRow = Database['public']['Tables']['weight_checkins']['Row']

export interface FitnessPlan {
  bmi: number
  bmi_category: 'Underweight' | 'Normal' | 'Overweight' | 'Obese'
  bmr: number
  tdee: number
  daily_calories: number
  daily_protein_g: number
  daily_carbs_g: number
  daily_fat_g: number
  water_liters: number
  weekly_workouts: number
  workout_duration_minutes: number
  workout_types: string[]
  estimated_weeks_to_goal: number
  tips: string[]
  summary: string
}

export interface PlanAdherence {
  id: string
  user_id: string
  date: string
  calories_goal: number
  calories_actual: number
  protein_goal: number
  protein_actual: number
  carbs_goal: number
  carbs_actual: number
  fat_goal: number
  fat_actual: number
  water_goal_ml: number
  water_actual_ml: number
  is_on_track: boolean
  adherence_score: number
  created_at: string
}

export interface WeightCheckin {
  id: string
  user_id: string
  weight_kg: number
  date: string
  note: string | null
  created_at: string
}

export interface NutritionResult {
  foodName: string
  calories: number
  protein: number
  carbs: number
  fat: number
  confidence: 'high' | 'medium' | 'low'
  suggestions?: string[]
}

export interface AnalyzeResponse {
  result?: NutritionResult
  error?: string
}
