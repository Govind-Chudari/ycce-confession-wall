// 'use client'

// import { useEffect, useState } from 'react'
// import { createClient } from '@/lib/supabase/client'
// import type { User } from '@supabase/supabase-js'

// export interface Profile {
//   id: string
//   email: string
//   anonymous_username: string
//   anonymous_avatar: string | null
//   is_verified: boolean
//   is_banned: boolean
//   role: string
//   department: string | null
//   year: number | null
// }

// export function useAuth() {
//   const [user, setUser] = useState(null)
//   const [profile, setProfile] = useState(null)
//   const [loading, setLoading] = useState(true)
  
//   const supabase = createClient()
  
//   useEffect(() => {
//     supabase.auth.getSession().then(({ data: { session } }) => {
//       setUser(session?.user ?? null)
//       if (session?.user) {
//         loadProfile(session.user.id)
//       } else {
//         setLoading(false)
//       }
//     })
    
//     const {
//       data: { subscription },
//     } = supabase.auth.onAuthStateChange((_event, session) => {
//       setUser(session?.user ?? null)
//       if (session?.user) {
//         loadProfile(session.user.id)
//       } else {
//         setProfile(null)
//         setLoading(false)
//       }
//     })
    
//     return () => subscription.unsubscribe()
//   }, [])
  
//   async function loadProfile(userId: string) {
//     try {
//       const { data, error } = await supabase
//         .from('profiles')
//         .select('*')
//         .eq('id', userId)
//         .single()
      
//       if (error) throw error
//       setProfile(data)
//     } catch (error) {
//       console.error('Error loading profile:', error)
//     } finally {
//       setLoading(false)
//     }
//   }
  
//   async function signOut() {
//     await supabase.auth.signOut()
//   }
  
//   return {
//     user,
//     profile,
//     loading,
//     signOut,
//     isAuthenticated: !!user,
//     isVerified: profile?.is_verified ?? false,
//     isAdmin: profile?.role === 'admin',
//     isModerator: profile?.role === 'moderator' || profile?.role === 'admin',
//   }
// }




'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export interface Profile {
  id: string
  email: string
  anonymous_username: string
  anonymous_avatar: string | null
  is_verified: boolean
  is_banned: boolean
  role: string
  department: string | null
  year: number | null
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    // Initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()   // 🔥 IMPORTANT FIX

      if (error) {
        console.error('Profile fetch error:', error)
        setProfile(null)
      } else {
        setProfile(data)
      }
    } catch (err) {
      console.error('Error loading profile:', err)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return {
    user,
    profile,
    loading,
    signOut,
    isAuthenticated: !!user,
    isVerified: profile?.is_verified ?? false,
    isAdmin: profile?.role === 'admin',
    isModerator: profile?.role === 'moderator' || profile?.role === 'admin',
  }
}
