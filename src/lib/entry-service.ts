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

const ENTRY_INCLUDE = {
  feed: { select: { id: true, title: true } },
  meta: true,
  tags: { include: { tag: true } },
} as const

export async function findManyEntries(query: GetEntriesQuery) {
  const { feedId, tagId, search, page = 1, limit = 20, afterId, beforeId, isReadLater, isUnread } = query

  // feedId 未指定 & ページネーション時は URL 重複排除を適用
  if (!feedId && !afterId && !beforeId) {
    return findManyEntriesDedup({ tagId, search, page, limit, isReadLater, isUnread })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {}
  if (feedId) where.feedId = feedId
  if (tagId) where.tags = { some: { tagId } }
  if (search) where.title = { contains: search }
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
      include: ENTRY_INCLUDE,
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

// link URL で重複排除した記事一覧を取得（feedId 未指定の全記事ビュー用）
async function findManyEntriesDedup(query: {
  tagId?: string
  search?: string
  page: number
  limit: number
  isReadLater?: boolean
  isUnread?: boolean
}) {
  const { tagId, search, page, limit, isReadLater, isUnread } = query
  const skip = (page - 1) * limit

  // 動的 WHERE 句を構築
  const conditions: string[] = []
  const params: unknown[] = []

  if (search) {
    conditions.push(`title LIKE '%' || ? || '%'`)
    params.push(search)
  }
  if (tagId) {
    conditions.push(`EXISTS (SELECT 1 FROM entry_tags WHERE entryId = entries.id AND tagId = ?)`)
    params.push(tagId)
  }
  if (isReadLater) {
    conditions.push(`EXISTS (SELECT 1 FROM entry_metas WHERE entryId = entries.id AND isReadLater = 1)`)
  }
  if (isUnread) {
    conditions.push(
      `(NOT EXISTS (SELECT 1 FROM entry_metas WHERE entryId = entries.id) OR EXISTS (SELECT 1 FROM entry_metas WHERE entryId = entries.id AND isRead = 0))`
    )
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // link ごとに最新エントリを1件だけ選択し、ページネーション
  const rawRows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `WITH ranked AS (
       SELECT id,
              COALESCE(publishedAt, createdAt) AS effectiveDate,
              ROW_NUMBER() OVER (PARTITION BY link ORDER BY COALESCE(publishedAt, createdAt) DESC) AS rn
       FROM entries
       ${whereClause}
     )
     SELECT id FROM ranked
     WHERE rn = 1
     ORDER BY effectiveDate DESC
     LIMIT ? OFFSET ?`,
    ...params,
    limit,
    skip
  )

  const countResult = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(DISTINCT link) AS count FROM entries ${whereClause}`,
    ...params
  )

  const total = Number(countResult[0]?.count ?? 0)
  const ids = rawRows.map((r) => r.id)

  if (ids.length === 0) {
    return {
      entries: [],
      pagination: { page, limit, total, hasNext: total > page * limit, hasPrev: page > 1 },
    }
  }

  // ID で本データ取得（includes 付き）し、raw SQL の順序を復元
  const entriesUnordered = await prisma.entry.findMany({
    where: { id: { in: ids } },
    include: ENTRY_INCLUDE,
  })
  const entryById = new Map(entriesUnordered.map((e) => [e.id, e]))
  const entries = ids.map((id) => entryById.get(id)).filter((e): e is NonNullable<typeof e> => e != null)

  return {
    entries,
    pagination: { page, limit, total, hasNext: total > page * limit, hasPrev: page > 1 },
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
