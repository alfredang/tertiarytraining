import { NextResponse, NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "tt_session";

async function readRole(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return (payload as { role?: string }).role ?? null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const role = await readRole(token);

  // Protect /dashboard and /admin
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) {
    if (!role) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    // Admins can view any dashboard / admin route.
    // Non-admins are restricted to their own dashboard, with a couple
    // of admin routes also opened to TRAINERs (approvals + users list).
    if (role !== "ADMIN") {
      if (pathname.startsWith("/dashboard/learner") && role !== "LEARNER") {
        return NextResponse.redirect(new URL(`/dashboard/${role.toLowerCase()}`, req.url));
      }
      if (pathname.startsWith("/dashboard/trainer") && role !== "TRAINER") {
        return NextResponse.redirect(new URL(`/dashboard/${role.toLowerCase()}`, req.url));
      }
      if (pathname.startsWith("/dashboard/admin")) {
        return NextResponse.redirect(new URL(`/dashboard/${role.toLowerCase()}`, req.url));
      }
      // Trainer carve-outs for the admin backend
      const trainerAllowed =
        role === "TRAINER" &&
        (pathname.startsWith("/admin/signup-approvals") || pathname.startsWith("/admin/users"));
      if (pathname.startsWith("/admin") && !trainerAllowed) {
        return NextResponse.redirect(new URL(`/dashboard/${role.toLowerCase()}`, req.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
