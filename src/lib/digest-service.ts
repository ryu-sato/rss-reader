import { prisma } from '@/lib/db'
import { AppError } from '@/lib/errors'
import type { Digest, DigestListItem } from '@/types/digest'

export async function createDigest(data: { content: string; title?: string }): Promise<Digest> {
  const digest = await prisma.digest.create({
    data: {
      content: data.content,
      title: data.title ?? null,
    },
  })
  return digest
}

export async function getDigests(
  page: number = 1,
  limit: number = 20
): Promise<{ data: DigestListItem[]; total: number }> {
  const skip = (page - 1) * limit
  const [data, total] = await Promise.all([
    prisma.digest.findMany({
      select: { id: true, title: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.digest.count(),
  ])
  return { data, total }
}

export async function getDigestById(id: string): Promise<Digest> {
  const digest = await prisma.digest.findUnique({ where: { id } })
  if (!digest) throw new AppError('DIGEST_NOT_FOUND', 'Digest not found', 404)
  return digest
}

export async function deleteDigest(id: string): Promise<void> {
  await getDigestById(id)
  await prisma.digest.delete({ where: { id } })
}
