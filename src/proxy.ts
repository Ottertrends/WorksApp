import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(req: NextRequest) {
  // Public content and crawler endpoints do not need an authentication round trip.
  const publicRoutes = ["/pricing", "/privacy-policy", "/contractor-invoicing-software", "/contractor-job-management-software", "/robots.txt", "/sitemap.xml", "/opengraph-image", "/twitter-image"];
  if (publicRoutes.includes(req.nextUrl.pathname)) return NextResponse.next();
  let response = NextResponse.next({ request: req });

  // Refresh session token on every request — required by @supabase/ssr
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          response = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect /dashboard routes
  if (!user && req.nextUrl.pathname.startsWith("/dashboard")) {
    const url = new URL("/auth/login", req.url);
    url.searchParams.set("redirected", "true");
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
