import { PrismaClient } from '@/generated/prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

function createPrismaClient() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')

  const adapter = new PrismaLibSql({ url })
  const client = new PrismaClient({ adapter })

  // 開発環境：50ms 超のクエリをターミナルに警告出力
  if (process.env.NODE_ENV !== 'production') {
    return client.$extends({
      query: {
        $allOperations({ operation, model, args, query }) {
          const start = performance.now()
          return query(args).then((result) => {
            const ms = (performance.now() - start).toFixed(1)
            if (Number(ms) > 50) {
              console.warn(`[DB slow] ${model ?? '?'}.${operation} ${ms}ms`)
            }
            return result
          })
        },
      },
    })
  }

  return client
}

type PrismaInstance = ReturnType<typeof createPrismaClient>

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaInstance | undefined
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
