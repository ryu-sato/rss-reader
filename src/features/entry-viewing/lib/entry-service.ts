import { prisma } from '@/lib/db'
import type { GetEntriesQuery } from '@/features/entry-viewing/types/entry'

const PREFRRED_SCORE_THRESHOLD = 0.5

// ========================================
// 一覧取得・フィルター・ページネーション
// ========================================

const ENTRY_INCLUDE = {
  feed: { select: { id: true, title: true } },
  meta: true,
} as const

export async function findManyEntries(query: GetEntriesQuery) {
  const { feedId, tagId, search, page = 1, limit = 20, afterId, beforeId, isReadLater, isUnread, userPreferenceId, isAnyPreferred, sortOrder = 'desc', scoreThreshold } = query
  const threshold = scoreThreshold ?? PREFRRED_SCORE_THRESHOLD

  // feedId 未指定 & ページネーション時は URL 重複排除を適用
  if (!feedId && !afterId && !beforeId) {
    return findManyEntriesDedup({ tagId, search, page, limit, isReadLater, isUnread, userPreferenceId, isAnyPreferred, sortOrder, scoreThreshold: threshold })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {}
  if (feedId) where.feedId = feedId
  if (tagId) where.tags = { some: { tagId } }
  if (search) where.title = { contains: search }
  if (isReadLater) where.meta = { isReadLater: true }
  if (isUnread) where.OR = [{ meta: null }, { meta: { isRead: false } }]
  if (userPreferenceId) where.scores = { and: [{ userPreferenceId }, { score: { gte: threshold } }] };
  if (isAnyPreferred) where.scores = { some: { score: { gte: threshold } } };

  // カーソルベースの前後ナビ
  if (afterId || beforeId) {
    const pivotId = (afterId ?? beforeId)!
    const pivot = await prisma.entry.findUnique({ where: { id: pivotId } })
    if (pivot) {
      const pivotDate = pivot.publishedAt ?? pivot.createdAt
      if (afterId) {
        where.OR = [
          { publishedAt: { lt: pivotDate } },
          { publishedAt: null, createdAt: { lt: pivot.createdAt } },
        ]
      } else {
        where.OR = [
          { publishedAt: { gt: pivotDate } },
          { publishedAt: null, createdAt: { gt: pivot.createdAt } },
        ]
      }
    }
  }

  const skip = afterId || beforeId ? 0 : (page - 1) * limit
  const orderBy = beforeId
    ? [{ publishedAt: 'asc' as const }, { createdAt: 'asc' as const }]
    : afterId
      ? [{ publishedAt: 'desc' as const }, { createdAt: 'desc' as const }]
      : [{ publishedAt: sortOrder }, { createdAt: sortOrder }]

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
  userPreferenceId?: string
  isAnyPreferred?: boolean
  sortOrder?: 'asc' | 'desc'
  scoreThreshold?: number
}) {
  const { tagId, search, page, limit, isReadLater, isUnread, userPreferenceId, isAnyPreferred, sortOrder = 'desc', scoreThreshold = PREFRRED_SCORE_THRESHOLD } = query;
  const skip = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};
  if (tagId) where.tags = { some: { tagId } };
  if (search) where.title = { contains: search };
  if (isReadLater) where.meta = { isReadLater: true };
  if (isUnread) where.OR = [{ meta: null }, { meta: { isRead: false } }];
  if (userPreferenceId) where.scores = { some: { preferenceId: userPreferenceId, score: { gte: scoreThreshold } } };
  if (isAnyPreferred) where.scores = { some: { score: { gte: scoreThreshold } } };

  const entries = await prisma.entry.findMany({
    where,
    distinct: ['link'],
    orderBy: { effectedDate: sortOrder },
    include: ENTRY_INCLUDE,
    skip,
    take: limit,
  });
  const aggregate = await prisma.entry.aggregate({
    where,
    _count: { link: true },
  });
  const total = aggregate._count.link;

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
