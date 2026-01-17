'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRouter } from "next/navigation"
import { isYCCEEmail, getURL } from '@/lib/utils/helpers' // ✅ Imported correctly

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  
  const [error, setError] = useState('') 

  const supabase = createClient()

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()

      if (data.session) {
        router.replace("/verify")
      }
    }

    checkSession()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!isYCCEEmail(email)) {
      setError('Please use your @ycce.in email address')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${getURL()}verify`,
        },
      })

      if (error) throw error
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Failed to send magic link')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
      <Card className="w-full max-w-md p-6">
        <CardHeader>
          <CardTitle>YCCE Confession Wall</CardTitle>
          <CardDescription>
            Anonymous confessions for YCCE students
          </CardDescription>
        </CardHeader>

        <CardContent>
          {success ? (
            <div className="space-y-4">
              <p>
                ✅ Magic link sent! Check your email ({email}) to sign in.
              </p>
              <p>
                Didn't receive the email? Check your spam folder or try again.
              </p>
              <Button
                variant="outline"
                onClick={() => setSuccess(false)}
                className="w-full"
              >
                Try another email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="email"
                placeholder="your.email@ycce.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-background/50"
              />

              <p className="text-sm text-muted-foreground">
                Only @ycce.in emails are allowed
              </p>

              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Loading...' : 'Send Magic Link'}
              </Button>
            </form>
          )}

          <div className="mt-6 text-sm space-y-1">
            <p>🔒 Your identity remains completely anonymous</p>
            <p>📧 Secure authentication via email</p>
            <p>📜 Terms & Community Guidelines apply</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}