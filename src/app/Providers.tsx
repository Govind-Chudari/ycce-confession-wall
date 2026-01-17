'use client'

import LenisProvider from "@/components/LenisProvider"

export default function Providers({
  children,
}: {
  children: React.ReactNode
}) {
  return <LenisProvider>{children}</LenisProvider>
}
