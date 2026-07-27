import { prisma } from '@/lib/db'
import { validateUrl } from '@/lib/ssrf-guard'
import { fetchEntries } from '@/features/feed-management/lib/entry-fetcher'
import type { FetchedEntryData } from '@/features/entry-viewing/types/entry'

const MAX_ENTRIES_PER_FEED = 500

export async function saveEntries(feedId: string, entries: FetchedEntryData[]): Promise<void> {
  const saved: { id: string; link: string }[] = []
  for (const entry of entries) {
    const result = await prisma.entry.upsert({
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
    if (entry.link) saved.push({ id: result.id, link: entry.link })
  }

  await inheritReadStatusByLink(saved)
}

// メタがまだないエントリのうち、同一 link で既読のエントリが他にある場合は既読に連動させる。
// エントリ件数ぶんの findUnique/findFirst/create を都度発行すると sqlite への往復が
// entries.length に比例して膨らむため、まとめて1〜2クエリで判定・書き込みする。
async function inheritReadStatusByLink(saved: { id: string; link: string }[]): Promise<void> {
  if (saved.length === 0) return

  const existingMetas = await prisma.entryMeta.findMany({
    where: { entryId: { in: saved.map((e) => e.id) } },
    select: { entryId: true },
  })
  const idsWithMeta = new Set(existingMetas.map((m) => m.entryId))
  const candidates = saved.filter((e) => !idsWithMeta.has(e.id))
  if (candidates.length === 0) return

  const readMetas = await prisma.entryMeta.findMany({
    where: { isRead: true, entry: { link: { in: [...new Set(candidates.map((e) => e.link))] } } },
    select: { entry: { select: { link: true } } },
  })
  const readLinks = new Set(readMetas.map((m) => m.entry.link))
  const toCreate = candidates.filter((e) => readLinks.has(e.link))
  if (toCreate.length === 0) return

  await prisma.entryMeta.createMany({
    data: toCreate.map((e) => ({ entryId: e.id, isRead: true, isReadLater: false })),
  })
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
