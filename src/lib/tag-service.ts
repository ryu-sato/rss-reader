import { prisma } from '@/lib/db'
import type { Tag } from '@/types/entry'

export async function upsertTagAndAssign(name: string, entryId: string): Promise<Tag> {
  const normalizedName = name.toLowerCase().trim()

  const tag = await prisma.tag.upsert({
    where: { name: normalizedName },
    create: { name: normalizedName },
    update: {},
  })

  await prisma.entryTag.upsert({
    where: { entryId_tagId: { entryId, tagId: tag.id } },
    create: { entryId, tagId: tag.id },
    update: {},
  })

  return tag
}

export async function removeTagFromEntry(tagId: string, entryId: string): Promise<void> {
  await prisma.entryTag.delete({
    where: { entryId_tagId: { entryId, tagId } },
  })
}

export async function getAllTags(): Promise<Tag[]> {
  return prisma.tag.findMany({ orderBy: { name: 'asc' } })
}
