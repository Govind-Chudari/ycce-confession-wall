'use client'

export const dynamic = 'force-dynamic'
export const revalidate = 0


import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { generateAnonymousUsername, generateAnonymousAvatar } from '@/lib/utils/anonymity'
import { extractInfoFromRollNumber } from '@/lib/utils/helpers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function OnboardingPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    fullName: '',
    rollNumber: '',
    idCardFile: null as File | null,
    agreedToTerms: false,
  })

  const supabase = createClient()

  const handleIdCardUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB')
      return
    }

    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      setError('Only JPG and PNG files are allowed')
      return
    }

    setFormData({ ...formData, idCardFile: file })
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.agreedToTerms) {
      setError('You must agree to the Terms & Community Guidelines to continue')
      return
    }

    if (!user) {
      setError('Not authenticated')
      return
    }

    setLoading(true)

    try {
      const info = extractInfoFromRollNumber(formData.rollNumber)
      if (!info) throw new Error('Invalid roll number format')

      let idCardUrl = ''

      if (formData.idCardFile) {
        const fileExt = formData.idCardFile.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('id-cards')
          .upload(fileName, formData.idCardFile)

        if (uploadError) throw uploadError

        const { data } = supabase.storage.from('id-cards').getPublicUrl(fileName)
        idCardUrl = data.publicUrl
      }

      const anonymousUsername = generateAnonymousUsername()
      const anonymousAvatar = generateAnonymousAvatar(user.id)

      const { error: profileError } = await supabase.from('profiles').update({
        full_name: formData.fullName,
        roll_number: formData.rollNumber,
        department: info.department,
        year: info.year,
        anonymous_username: anonymousUsername,
        anonymous_avatar: anonymousAvatar,
        id_card_url: idCardUrl,
        verification_status: 'pending',
        terms_accepted_at: new Date().toISOString(),
      }).eq('id', user.id)

      if (profileError) throw profileError

      const { data: rooms } = await supabase
        .from('rooms')
        .select('id')
        .or(`room_type.eq.global,and(room_type.eq.department,department.eq.${info.department})`)

      if (rooms) {
        const memberships = rooms.map((room: any) => ({
          user_id: user.id,
          room_id: room.id,
        }))
        await supabase.from('room_memberships').insert(memberships)
      }

      setStep(2)
    } catch (err: any) {
      setError(err.message || 'Failed to complete onboarding')
    } finally {
      setLoading(false)
    }
  }

  if (step === 2) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md p-6 text-center space-y-4">
          <h2 className="text-xl font-bold">Verification Pending</h2>
          <p>Your account is being reviewed by our admin team.</p>
          <p className="text-sm text-muted-foreground">
            This usually takes 24–48 hours. You’ll receive an email once approved.
          </p>
          <Button onClick={() => router.push('/feed')} className="w-full">
            Continue to App
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md p-6">
        <CardHeader>
          <CardTitle>Complete Your Profile</CardTitle>
          <CardDescription>
            We need some information to verify your identity
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="text"
              placeholder="Full Name"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              required
            />

            <Input
              type="text"
              placeholder="Roll Number"
              value={formData.rollNumber}
              onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
              required
            />

            <Input type="file" accept="image/*" onChange={handleIdCardUpload} />

            <div className="flex items-start gap-2">
              <Checkbox
                checked={formData.agreedToTerms}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, agreedToTerms: checked as boolean })
                }
              />
              <p className="text-sm">
                I agree to the Terms & Community Guidelines
              </p>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Submitting…' : 'Submit for Verification'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
