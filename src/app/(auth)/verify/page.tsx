'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

export default function VerifyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [status, setStatus] = useState("Verifying...")

  useEffect(() => {
    const verifyUser = async () => {
      // 1. Check if we already have a session (Fixes the loop issue)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        // Already logged in? Just check profile and move on
        await checkProfileStatus(session.user.id)
        return
      }

      // 2. No session? Try to exchange the code
      const code = searchParams.get('code')
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        
        if (!error && data.session) {
          await checkProfileStatus(data.session.user.id)
        } else {
          // Only redirect to login if it truly fails AND we aren't logged in
          console.error("Exchange failed:", error)
          setStatus("Link expired. Redirecting...")
          setTimeout(() => router.replace("/login"), 2000)
        }
      } else {
         // No code and no session
         setStatus("Invalid link.")
         setTimeout(() => router.replace("/login"), 2000)
      }
    }

    const checkProfileStatus = async (userId: string) => {
      setStatus("Checking profile...")
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_verified")
        .eq("id", userId)
        .single()

      if (profile?.is_verified) {
        router.replace("/feed")
      } else {
        router.replace("/verify-id")
      }
    }

    verifyUser()
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#020817] text-white">
      <Loader2 className="h-8 w-8 animate-spin mb-4" />
      <p>{status}</p>
    </div>
  )
}