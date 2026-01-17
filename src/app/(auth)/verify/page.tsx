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
  const [status, setStatus] = useState("Verifying your email...")

  useEffect(() => {
    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        await checkProfile(session.user.id)
        return
      }

      const code = searchParams.get('code')

      if (!code) {
        setStatus("Invalid link. No code found.")
        setTimeout(() => router.replace("/login"), 2000)
        return
      }

      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error("Verify failed", error)
        setStatus("Link expired or invalid. Redirecting...")
        setTimeout(() => router.replace("/login"), 2000)
        return
      }

      if (data.session) {
        await checkProfile(data.session.user.id)
      }
    }

    const checkProfile = async (userId: string) => {
      setStatus("Checking profile...")
      
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_verified")
        .eq("id", userId)
        .single()

      if (profileError || !profile) {
        console.error("Profile error", profileError)
        router.replace("/login")
        return
      }

      if (profile.is_verified) {
        setStatus("Verified! Redirecting to feed...")
        router.replace("/feed")       // Already verified
      } else {
        setStatus("Email verified! Taking you to ID setup...")
        router.replace("/verify-id")  // Needs ID card
      }
    }

    run()
  }, [router, searchParams, supabase])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#020817] text-white p-4">
      <div className="flex flex-col items-center space-y-4 p-8 bg-[#0f172a] border border-[#1e293b] rounded-xl shadow-2xl">
        <Loader2 className="h-10 w-10 animate-spin text-white" />
        <p className="text-lg font-medium text-slate-200">{status}</p>
      </div>
    </div>
  )
}