# ---- Base (for build stages, needs shell + pnpm) ----
FROM node:24 AS base
RUN corepack enable && corepack prepare pnpm@10.31.0 --activate

# ---- Dependencies ----
FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---- Builder ----
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV DATABASE_URL="file:./prisma/dev.db"

RUN pnpm build

# ---- Prisma CLI (pnpmの仮想ストア問題を回避するためnpmでフラットインストール) ----
FROM node:24 AS prisma-cli
WORKDIR /prisma-cli
RUN npm install prisma @prisma/engines
# dotenv不要のprisma設定ファイルをprisma-cli/に配置 (prisma/configはここのnode_modulesから解決)
COPY docker/prisma.config.mjs ./prisma.config.mjs

# ---- Runner ----
FROM node:24-slim AS runner
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL="file:/app/data/db.sqlite"

COPY --chown=node:node --from=builder /app/public ./public
COPY --chown=node:node --from=builder /app/.next/standalone ./
COPY --chown=node:node --from=builder /app/.next/static ./.next/static
COPY --chown=node:node --from=builder /app/prisma ./prisma
COPY --chown=node:node --from=builder /app/src/generated ./src/generated
COPY --chown=node:node --from=builder /app/entrypoint.js ./entrypoint.js
COPY --chown=node:node --from=prisma-cli /prisma-cli/node_modules/ ./prisma-cli/node_modules/
COPY --chown=node:node --from=prisma-cli /prisma-cli/prisma.config.mjs ./prisma-cli/prisma.config.mjs
RUN mkdir -p /app/data && chown node:node /app/data

USER node

EXPOSE 3000

CMD ["node", "entrypoint.js"]
