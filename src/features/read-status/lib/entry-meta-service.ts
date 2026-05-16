import { prisma } from '@/lib/db'
import type { UpdateEntryMetaInput } from '@/features/entry-viewing/types/entry'

export async function updateEntryMeta(entryId: string, data: UpdateEntryMetaInput) {
  // isRead が変更される場合、同一 link の全エントリに連動させる
  if (data.isRead !== undefined) {
    const entry = await prisma.entry.findUnique({ where: { id: entryId }, select: { link: true } })
    if (entry) {
      const siblings = await prisma.entry.findMany({
        where: { link: entry.link },
        select: { id: true },
      })
      await Promise.all(
        siblings.map((sibling) =>
          prisma.entryMeta.upsert({
            where: { entryId: sibling.id },
            create: { entryId: sibling.id, isRead: data.isRead!, isReadLater: false },
            update: { isRead: data.isRead! },
          })
        )
      )
      // isReadLater も同時に変更される場合は対象エントリのみに適用
      if (data.isReadLater !== undefined) {
        await prisma.entryMeta.update({
          where: { entryId },
          data: { isReadLater: data.isReadLater },
        })
      }
      return prisma.entryMeta.findUnique({ where: { entryId } })
    }
  }

  return prisma.entryMeta.upsert({
    where: { entryId },
    create: {
      entryId,
      isRead: data.isRead ?? false,
      isReadLater: data.isReadLater ?? false,
    },
    update: data,
  })
}
