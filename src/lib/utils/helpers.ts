import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isYCCEEmail(email: string): boolean {
  return email.endsWith('@ycce.in')
}

export function extractInfoFromRollNumber(rollNumber: string): {
  year: number
  department: string
} | null {
  if (rollNumber.length < 8) return null
  
  const yearPrefix = parseInt(rollNumber.substring(0, 2))
  const deptCode = rollNumber.substring(2, 4)
  
  const currentYear = new Date().getFullYear()
  const admissionYear = 2000 + yearPrefix
  const year = currentYear - admissionYear + 1
  
  const deptMap: Record<string, string> = {
    '01': 'CIVIL',
    '02': 'MECH',
    '03': 'EE',
    '04': 'ENTC',
    '05': 'CS',
    '06': 'IT',
    '07': 'AIML',
    '08': 'AIDS',
  }
  
  return {
    year: Math.max(1, Math.min(4, year)),
    department: deptMap[deptCode] || 'UNKNOWN'
  }
}

export function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  
  return date.toLocaleDateString()
}