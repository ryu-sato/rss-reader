import { prisma } from '@/lib/db'
import { validateUrl } from '@/lib/ssrf-guard'
import { fetchEntries } from '@/lib/entry-fetcher'
import type { FetchedEntryData, GetEntriesQuery, UpdateEntryMetaInput } from '@/types/entry'

const MAX_ENTRIES_PER_FEED = 500

// ========================================
// 保存・重複排除・上限管理（TASK-0005）
// ========================================

export async function saveEntries(feedId: string, entries: FetchedEntryData[]): Promise<void> {
  for (const entry of entries) {
    await prisma.entry.upsert({
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
      },
      update: {
        title: entry.title,
        link: entry.link,
        description: entry.description,
        content: entry.content,
        imageUrl: entry.imageUrl,
        publishedAt: entry.publishedAt,
      },
    })
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

// ========================================
// 一覧取得・フィルター・ページネーション（TASK-0006）
// ========================================

export async function findManyEntries(query: GetEntriesQuery) {
  const { feedId, tagId, page = 1, limit = 20, afterId, beforeId, isReadLater, isUnread } = query

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {}
  if (feedId) where.feedId = feedId
  if (tagId) where.tags = { some: { tagId } }
  if (isReadLater) where.meta = { isReadLater: true }
  if (isUnread) where.OR = [{ meta: null }, { meta: { isRead: false } }]

  // カーソルベースの前後ナビ
  if (afterId) {
    const pivot = await prisma.entry.findUnique({ where: { id: afterId } })
    if (pivot) {
      const pivotDate = pivot.publishedAt ?? pivot.createdAt
      where.OR = [
        { publishedAt: { lt: pivotDate } },
        { publishedAt: null, createdAt: { lt: pivot.createdAt } },
      ]
    }
  }
  if (beforeId) {
    const pivot = await prisma.entry.findUnique({ where: { id: beforeId } })
    if (pivot) {
      const pivotDate = pivot.publishedAt ?? pivot.createdAt
      where.OR = [
        { publishedAt: { gt: pivotDate } },
        { publishedAt: null, createdAt: { gt: pivot.createdAt } },
      ]
    }
  }

  const skip = afterId || beforeId ? 0 : (page - 1) * limit
  // beforeId の場合は昇順で取得し、直近の1件を確実に取る（逆順で最近傍エントリを得るため）
  const orderBy = beforeId
    ? [{ publishedAt: 'asc' as const }, { createdAt: 'asc' as const }]
    : [{ publishedAt: 'desc' as const }, { createdAt: 'desc' as const }]

  const [rawEntries, total] = await Promise.all([
    prisma.entry.findMany({
      where,
      orderBy,
      take: limit,
      skip,
      include: {
        feed: { select: { id: true, title: true } },
        meta: true,
        tags: { include: { tag: true } },
      },
    }),
    prisma.entry.count({ where }),
  ])

  // beforeId で昇順取得した場合、返却時に降順に戻す
  const entries = beforeId ? rawEntries.reverse() : rawEntries

  return {
    entries,
    pagination: {
      page,
      limit,
      total,
      hasNext: total > page * limit,
      hasPrev: page > 1,
    },
  }
}

export async function getEntryById(id: string) {
  return prisma.entry.findUnique({
    where: { id },
    include: {
      feed: { select: { id: true, title: true } },
      meta: true,
      tags: { include: { tag: true } },
    },
  })
}

export async function updateEntryMeta(entryId: string, data: UpdateEntryMetaInput) {
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
