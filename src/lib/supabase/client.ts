// import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// export const createClient = () => createClientComponentClient()

import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
