import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

const PUBLIC_PATHS = ["/login", "/api/auth"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // パブリックパスはそのまま通す
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // セッションを検証
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  if (!session) {
    // APIルートは401を返す
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    // ページはログイン画面にリダイレクト
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icons|favicon.ico|sw.js|manifest.json).*)"],
}
