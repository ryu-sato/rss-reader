import { defineConfig } from "prisma/config";

// 本番コンテナ用設定。dotenv不要 (DATABASE_URLはDockerのENVで設定済み)
export default defineConfig({
  schema: "/app/prisma/schema.prisma",
  migrations: { path: "/app/prisma/migrations" },
  datasource: { url: process.env.DATABASE_URL },
});
