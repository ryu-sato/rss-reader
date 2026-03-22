import { NextRequest, NextResponse } from "next/server"

const PUBLIC_PATHS = ["/login", "/api/auth"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // パブリックパスはそのまま通す
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Edge RuntimeではPrismaが使えないため、APIコールでセッションを確認する
  const sessionRes = await fetch(
    new URL("/api/auth/get-session", request.url),
    {
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
    }
  )

  const session = sessionRes.ok ? await sessionRes.json() : null

  if (!session?.user) {
    // APIルートは401を返す
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    // ページはログイン画面にリダイレクト
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 許可メールアドレスの確認
  const allowedEmails = (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)

  if (allowedEmails.length > 0 && !allowedEmails.includes(session.user.email)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("error", "AccessDenied")
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icons|favicon.ico|sw.js|manifest.json).*)"],
}
