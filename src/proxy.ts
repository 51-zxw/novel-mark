import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-change-me";
const TOKEN_NAME = "admin_token";

// 受保护的后台路径前缀（login 页本身放行）
const PROTECTED_PREFIX = "/admin";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 只拦截 /admin/*，但放行 /admin/login
  if (!pathname.startsWith(PROTECTED_PREFIX)) {
    return NextResponse.next();
  }
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(TOKEN_NAME)?.value;

  // 无 token → 去登录
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // token 无效 → 去登录
  try {
    jwt.verify(token, JWT_SECRET);
  } catch {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
