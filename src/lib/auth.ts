import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { genericOAuth } from "better-auth/plugins"
import { prisma } from "@/lib/db"

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [process.env.BETTER_AUTH_URL!],
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: "oidc",
          clientId: process.env.OIDC_CLIENT_ID!,
          clientSecret: process.env.OIDC_CLIENT_SECRET!,
          discoveryUrl: process.env.OIDC_DISCOVERY_URL!,
          scopes: ["openid", "email", "profile"],
          pkce: true,
        },
      ],
    }),
  ],
})

export type Session = typeof auth.$Infer.Session
