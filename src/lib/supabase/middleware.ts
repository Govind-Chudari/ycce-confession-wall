import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname;

  // 1. PROTECTED ROUTES (Dashboard, Profile, etc.)
  // Agar user login nahi hai aur in pages par jane ki koshish kare, to Sign In par bhejo.
  if (path.startsWith('/home') || 
      path.startsWith('/profile') ||
      path.startsWith('/feed') ||
      path.startsWith('/doodles') ||
      path.startsWith('/vent')) {
    if (!user) {
      return NextResponse.redirect(new URL('/signin', request.url))
    }
  }

  // 2. AUTH ROUTES (Sign In, Sign Up)
  // Agar user PEHLE SE login hai, to use wapis Home par bhejo.
  // Lekin agar wo stuck hai, to hum is logic ko temporarily comment out kar sakte hain.
  // Filhal main isse enable kar raha hu, kyunki ye standard behavior hai.
  // Agar aap loop me phass jao, to browser ki cookies clear kar lena.
  if (path.startsWith('/signin') || path.startsWith('/signup')) {
    if (user) {
      return NextResponse.redirect(new URL('/home', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}