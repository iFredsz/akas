// middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const pathname = req.nextUrl.pathname;
  const isLoginPage = pathname === "/login";

  // Ambil user dari session
  const { data: userData } = await supabase.auth.getUser();

  // Belum login → redirect ke login
  if (!userData?.user) {
    if (!isLoginPage) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return res;
  }

  // Ambil role dari table users
  const { data: userRow } = await supabase
    .from("users")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  const userRole = userRow?.role ?? null;

  /**
   * ROLE GROUPING
   */
  const ADMIN_ROLES = ["admin", "super_admin"];

  /**
   * Redirect jika sudah login tapi buka /login
   */
  if (isLoginPage && userRole) {
    if (ADMIN_ROLES.includes(userRole)) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    if (userRole === "karyawan") {
      return NextResponse.redirect(new URL("/karyawan", req.url));
    }

    return NextResponse.redirect(new URL("/login", req.url));
  }

  /**
   * Proteksi halaman admin
   */
  if (pathname.startsWith("/admin")) {
    if (ADMIN_ROLES.includes(userRole)) return res;
    return NextResponse.redirect(new URL("/login", req.url));
  }

  /**
   * Proteksi halaman karyawan
   */
  if (pathname.startsWith("/karyawan")) {
    if (userRole === "karyawan") return res;
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/login", "/admin/:path*", "/karyawan/:path*"],
};
