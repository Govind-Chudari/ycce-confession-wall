'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { Loader2 } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated, isVerified, loading } = useAuth()
  
  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/login')
      } else if (!isVerified) {
        router.push('/onboarding')
      } else {
        router.push('/feed')
      }
    }
  }, [isAuthenticated, isVerified, loading, router])
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
    )
  }
  
  return null
}