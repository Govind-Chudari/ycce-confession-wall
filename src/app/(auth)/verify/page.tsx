'use client'

export const dynamic = "force-dynamic"
export const revalidate = 0

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function VerifyPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const run = async () => {
      // 1️⃣ Exchange magic link for session
      const { error } = await supabase.auth.exchangeCodeForSession(
        window.location.href
      )

      if (error) {
        console.error("Verify failed", error)
        router.replace("/login")
        return
      }

      // 2️⃣ Get logged in user
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace("/login")
        return
      }

      // 3️⃣ Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_verified")
        .eq("id", user.id)
        .single()

      if (profileError || !profile) {
        router.replace("/login")
        return
      }

      // 4️⃣ Decide where to go
      if (profile.is_verified) {
        router.replace("/feed")       // Already verified
      } else {
        router.replace("/verify-id")  // Needs ID card
      }
    }

    run()
  }, [])

  return (
    <div className="h-screen flex items-center justify-center">
      <p>Verifying your email…</p>
    </div>
  )
}
