import { prisma } from '@/lib/db'
import { validateUrl } from '@/lib/ssrf-guard'
import { fetchEntries } from '@/features/feed-management/lib/entry-fetcher'
import type { FetchedEntryData } from '@/features/entry-viewing/types/entry'

const MAX_ENTRIES_PER_FEED = 500

export async function saveEntries(feedId: string, entries: FetchedEntryData[]): Promise<void> {
  for (const entry of entries) {
    const saved = await prisma.entry.upsert({
      where: { feedId_guid: { feedId, guid: entry.guid } },
      create: {
        feedId,
        guid: entry.guid,
        title: entry.title,
        link: entry.link,
        description: entry.description,
        content: entry.content,
        imageUrl: entry.imageUrl,
        publishedAt: entry.publishedAt,
        ...(entry.publishedAt ? { effectedDate: entry.publishedAt } : {}),
      },
      update: {
        title: entry.title,
        link: entry.link,
        description: entry.description,
        content: entry.content,
        imageUrl: entry.imageUrl,
        publishedAt: entry.publishedAt,
        ...(entry.publishedAt ? { effectedDate: entry.publishedAt } : {}),
      },
    })

    // メタがまだない（新規エントリ）かつ同一 link で既読エントリがある場合、既読に連動させる
    if (entry.link) {
      const existingMeta = await prisma.entryMeta.findUnique({ where: { entryId: saved.id } })
      if (!existingMeta) {
        const readSibling = await prisma.entryMeta.findFirst({
          where: {
            isRead: true,
            entry: { link: entry.link, NOT: { id: saved.id } },
          },
        })
        if (readSibling) {
          await prisma.entryMeta.create({
            data: { entryId: saved.id, isRead: true, isReadLater: false },
          })
        }
      }
    }
  }
}

export async function enforceEntryLimit(feedId: string): Promise<void> {
  const count = await prisma.entry.count({ where: { feedId } })
  if (count <= MAX_ENTRIES_PER_FEED) return

  const excess = count - MAX_ENTRIES_PER_FEED
  const oldestEntries = await prisma.entry.findMany({
    where: { feedId },
    orderBy: [{ publishedAt: 'asc' }, { createdAt: 'asc' }],
    take: excess,
    select: { id: true },
  })

  await prisma.entry.deleteMany({
    where: { id: { in: oldestEntries.map((e) => e.id) } },
  })
}

export async function fetchAllFeedsEntries(): Promise<void> {
  const feeds = await prisma.feed.findMany()

  for (const feed of feeds) {
    try {
      await validateUrl(feed.url)
      const entries = await fetchEntries(feed.url)
      await saveEntries(feed.id, entries)
      await enforceEntryLimit(feed.id)
      await prisma.feed.update({
        where: { id: feed.id },
        data: { lastFetchedAt: new Date() },
      })
    } catch (error) {
      console.error(`[EntryService] Failed to fetch entries for feed ${feed.id} (${feed.url}):`, error)
    }
  }
}
