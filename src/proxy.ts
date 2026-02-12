import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
  const token = await getToken({ req });
  const { pathname } = req.nextUrl;

  if (!token && pathname.startsWith("/app")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (token) {
    const mustChange = (token as any).mustChangePassword;
    if (mustChange && pathname.startsWith("/app") && !pathname.startsWith("/app/change-password")) {
      return NextResponse.redirect(new URL("/app/change-password", req.url));
    }
  }

  return NextResponse.next();
}

export const config = { matcher: ["/app/:path*"] };
