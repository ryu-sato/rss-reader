"use client"

import { authClient } from "@/lib/auth-client"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function LoginContent() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") ?? "/"

  const handleSignIn = async () => {
    await authClient.signIn.oauth2({
      providerId: "oidc",
      callbackURL: callbackUrl,
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6 rounded-lg border bg-card p-10 shadow-sm">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">RSS Reader</h1>
          <p className="text-sm text-muted-foreground">
            続けるにはサインインしてください
          </p>
        </div>
        <button
          onClick={handleSignIn}
          className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          OIDCでサインイン
        </button>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
