'use client'

import { useEffect } from 'react'
import Lenis from '@studio-freight/lenis'

export default function LenisProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({
      smooth: true,
      lerp: 0.08,
      wheelMultiplier: 1.1,
      touchMultiplier: 1.2,
    })

    function raf(time: number) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }

    requestAnimationFrame(raf)

    return () => lenis.destroy()
  }, [])

  return <>{children}</>
}
