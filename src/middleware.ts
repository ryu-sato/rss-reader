import { NextRequest, NextResponse } from "next/server"

const PUBLIC_PATHS = ["/login", "/api/auth"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // パブリックパスはそのまま通す
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Edge RuntimeではPrismaが使えないため、APIコールでセッションを確認する
  // 内部通信はlocalhostを使い、ngrok等のHTTPS経由を避ける
  const internalBaseUrl = `http://localhost:${process.env.PORT ?? 3000}`
  const sessionRes = await fetch(
    new URL("/api/auth/get-session", internalBaseUrl),
    {
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
    }
  ).catch((err) => {
    console.error("[middleware] session fetch failed:", err)
    return null
  })

  const session = sessionRes.ok ? await sessionRes.json() : null
  console.log("[middleware]", {
    path: pathname,
    hasCookie: !!request.headers.get("cookie"),
    sessionStatus: sessionRes.status,
    hasUser: !!session?.user,
  })

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
