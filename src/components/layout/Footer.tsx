'use client'

import Link from 'next/link'
import { Shield, FileText, Mail } from 'lucide-react'

export function Footer() {
  return (
    <footer className="w-full border-t border-border mt-10">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4 text-sm text-muted-foreground">

        {/* Top Row */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="font-semibold text-foreground">
            YCCE Confession Wall
          </div>

          <div className="flex items-center gap-4">
            <Link href="/terms" className="flex items-center gap-1 hover:text-foreground">
              <FileText className="w-4 h-4" />
              Terms & Guidelines
            </Link>

            <span>•</span>

            <Link href="/contact" className="flex items-center gap-1 hover:text-foreground">
              <Mail className="w-4 h-4" />
              Contact
            </Link>
          </div>

          <div>© {new Date().getFullYear()} YCCE Students</div>
        </div>

        {/* Bottom Note */}
        <div className="text-center text-xs text-muted-foreground">
          This platform is for YCCE students only. All content is moderated.
          Your anonymity is protected but not absolute.
        </div>

      </div>
    </footer>
  )
}
