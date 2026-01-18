"use client"

export const dynamic = "force-dynamic"

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
      const code = searchParams.get("code")

      // 1️⃣ Exchange magic link code FIRST (mobile safe)
      if (code) {
        const { data, error } =
          await supabase.auth.exchangeCodeForSession(code)

        if (error || !data.session) {
          setStatus("Link expired. Redirecting...")
          setTimeout(() => router.replace("/login"), 2000)
          return
        }

        await checkProfileStatus(data.session.user.id)
        return
      }

      // 2️⃣ Fallback: check existing session
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        await checkProfileStatus(session.user.id)
        return
      }

      // 3️⃣ Nothing worked
      router.replace("/login")
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
    <div className="flex min-h-screen flex-col items-center justify-center">
      <Loader2 className="animate-spin mb-4" />
      <p>{status}</p>
    </div>
  )
}
