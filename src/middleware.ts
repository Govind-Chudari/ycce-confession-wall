// import { NextResponse } from "next/server";
// import type { NextRequest } from "next/server";
// import { createServerClient } from "@supabase/ssr";

// export async function middleware(req: NextRequest) {
//   let res = NextResponse.next();

//   const supabase = createServerClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     {
//       cookies: {
//         get(name) {
//           return req.cookies.get(name)?.value;
//         },
//         set(name, value, options) {
//           res.cookies.set({ name, value, ...options });
//         },
//         remove(name, options) {
//           res.cookies.set({ name, value: "", ...options });
//         },
//       },
//     }
//   );

//   const {
//     data: { user },
//   } = await supabase.auth.getUser();

//   const protectedPaths = ["/feed", "/doodles", "/profile"];
//   const isProtectedPath = protectedPaths.some((path) =>
//     req.nextUrl.pathname.startsWith(path)
//   );

//   if (isProtectedPath && !user) {
//     const redirectUrl = new URL("/signin", req.url);
//     redirectUrl.searchParams.set("redirectTo", req.nextUrl.pathname);
//     return NextResponse.redirect(redirectUrl);
//   }

//   if (isProtectedPath && user) {
//     const { data: profile } = await supabase
//       .from("profiles")
//       .select("profile_completed")
//       .eq("id", user.id)
//       .single();

//     if (profile && !profile.profile_completed && req.nextUrl.pathname !== "/profile-setup") {
//       return NextResponse.redirect(new URL("/profile-setup", req.url));
//     }
//   }

//   return res;
// }

// export const config = {
//   matcher: ["/feed/:path*", "/doodles/:path*", "/profile/:path*"],
// };



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

  // Protected routes pattern
  if (request.nextUrl.pathname.startsWith('/home') || 
      request.nextUrl.pathname.startsWith('/profile') ||
      request.nextUrl.pathname.startsWith('/feed')) {
    if (!user) {
      return NextResponse.redirect(new URL('/signin', request.url))
    }
  }

  // Auth routes pattern (redirect to home if already logged in)
  if (request.nextUrl.pathname.startsWith('/signin') || 
      request.nextUrl.pathname.startsWith('/signup')) {
    if (user) {
      return NextResponse.redirect(new URL('/home', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}