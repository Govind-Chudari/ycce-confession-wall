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
          email: string | null
          full_name: string | null
          anonymous_username: string
          anonymous_avatar: string | null
          branch: string | null
          department: string | null
          year: number | null
          semester: number | null
          enrollment_number: string | null
          gender: string | null
          phone_number: string | null
          profile_completed: boolean | null
          role: string | null
          is_banned: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          anonymous_username: string
          anonymous_avatar?: string | null
          branch?: string | null
          department?: string | null
          year?: number | null
          semester?: number | null
          enrollment_number?: string | null
          gender?: string | null
          phone_number?: string | null
          profile_completed?: boolean | null
          role?: string | null
          is_banned?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          anonymous_username?: string
          anonymous_avatar?: string | null
          branch?: string | null
          department?: string | null
          year?: number | null
          semester?: number | null
          enrollment_number?: string | null
          gender?: string | null
          phone_number?: string | null
          profile_completed?: boolean | null
          role?: string | null
          is_banned?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
    }
  }
}