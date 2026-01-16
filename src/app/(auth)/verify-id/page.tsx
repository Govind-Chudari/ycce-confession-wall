'use client'

export const dynamic = "force-dynamic"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export default function VerifyIdPage() {
  const supabase = createClient()
  const router = useRouter()

  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function submit() {
    if (!file) {
      setError("Please upload your college ID card")
      return
    }

    setLoading(true)
    setError("")

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace("/login")
        return
      }

      // 1️⃣ Upload ID card to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from("id-cards")
        .upload(`cards/${user.id}.jpg`, file, { upsert: true })

      if (uploadError) throw uploadError

      const url = supabase.storage
        .from("id-cards")
        .getPublicUrl(data.path).data.publicUrl

      // 2️⃣ Save ID card in profile
      await supabase.from("profiles").update({
        id_card_url: url,
        verification_status: "processing"
      }).eq("id", user.id)

      // 3️⃣ Trigger backend verification (barcode + OCR + room join)
      await fetch("/api/verify-id", {
        method: "POST",
        body: JSON.stringify({ userId: user.id })
      })

      // 4️⃣ Go to feed
      router.replace("/feed")
    } catch (e: any) {
      setError("Verification failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="p-8 max-w-md w-full space-y-4">
        <h1 className="text-xl font-bold">Upload your College ID</h1>
        <p className="text-sm text-muted-foreground">
          We will scan your ID to unlock your branch rooms.
        </p>

        <input
          type="file"
          accept="image/*"
          onChange={e => setFile(e.target.files?.[0] || null)}
        />

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <Button onClick={submit} disabled={loading} className="w-full">
          {loading ? "Verifying..." : "Verify ID"}
        </Button>
      </div>
    </div>
  )
}
