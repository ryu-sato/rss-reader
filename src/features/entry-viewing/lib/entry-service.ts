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
  if (!feedId) {
    return findManyEntriesDedup({ tagId, search, page, limit, afterId, isReadLater, isUnread, userPreferenceId, isAnyPreferred, sortOrder, scoreThreshold: threshold })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baseWhere: Record<string, any> = {}
  if (feedId) baseWhere.feedId = feedId
  if (tagId) baseWhere.tags = { some: { tagId } }
  if (search) baseWhere.title = { contains: search }
  if (isReadLater) baseWhere.meta = { isReadLater: true }
  if (isUnread) baseWhere.OR = [{ meta: null }, { meta: { isRead: false } }]
  if (userPreferenceId) baseWhere.scores = { and: [{ userPreferenceId }, { score: { gte: threshold } }] };
  if (isAnyPreferred) baseWhere.scores = { some: { score: { gte: threshold } } };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let where: Record<string, any> = baseWhere

  // カーソルベースの前後ナビ。isUnread 等のフィルタは既読化のような副作用で
  // マッチする集合が縮むことがあるため、offset(skip) ではなく直前に見たエントリの
  // 日時を基準にした比較で「まだ見ていない次の1件」を確実に取得する。
  if (afterId || beforeId) {
    const pivotId = (afterId ?? beforeId)!
    const pivot = await prisma.entry.findUnique({ where: { id: pivotId } })
    if (pivot) {
      const pivotDate = pivot.publishedAt ?? pivot.createdAt
      const cursorCond = afterId
        ? {
            OR: [
              { publishedAt: { lt: pivotDate } },
              { publishedAt: null, createdAt: { lt: pivot.createdAt } },
            ],
          }
        : {
            OR: [
              { publishedAt: { gt: pivotDate } },
              { publishedAt: null, createdAt: { gt: pivot.createdAt } },
            ],
          }
      where = { AND: [baseWhere, cursorCond] }
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
      take: limit + 1,
      skip,
      include: ENTRY_INCLUDE,
    }),
    prisma.entry.count({ where: baseWhere }),
  ])

  // limit+1 件取得して、実際に次があるかを直接判定する(集合が縮んでも狂わない)
  const hasMore = rawEntries.length > limit
  const sliced = hasMore ? rawEntries.slice(0, limit) : rawEntries
  const entries = beforeId ? sliced.reverse() : sliced

  return {
    entries,
    pagination: {
      page,
      limit,
      total,
      hasNext: hasMore,
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
  afterId?: string
  isReadLater?: boolean
  isUnread?: boolean
  userPreferenceId?: string
  isAnyPreferred?: boolean
  sortOrder?: 'asc' | 'desc'
  scoreThreshold?: number
}) {
  const { tagId, search, page, limit, afterId, isReadLater, isUnread, userPreferenceId, isAnyPreferred, sortOrder = 'desc', scoreThreshold = PREFRRED_SCORE_THRESHOLD } = query;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baseWhere: Record<string, any> = {};
  if (tagId) baseWhere.tags = { some: { tagId } };
  if (search) baseWhere.title = { contains: search };
  if (isReadLater) baseWhere.meta = { isReadLater: true };
  if (isUnread) baseWhere.OR = [{ meta: null }, { meta: { isRead: false } }];
  if (userPreferenceId) baseWhere.scores = { some: { preferenceId: userPreferenceId, score: { gte: scoreThreshold } } };
  if (isAnyPreferred) baseWhere.scores = { some: { score: { gte: scoreThreshold } } };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let where: Record<string, any> = baseWhere
  let skip = (page - 1) * limit

  // カーソルベースの次頁取得。isUnread のように「開くと対象集合から外れる」フィルタでは、
  // offset(skip) は既読化のたびにページ境界がずれて未読記事を永久に読み飛ばしてしまうため、
  // 直前に見たエントリの effectedDate/id を基準に「まだ見ていない次の1件」を確実に取得する。
  // effectedDate は一意でない(同時刻投入があり得る)ため id をタイブレーカーに使う。
  if (afterId) {
    const pivot = await prisma.entry.findUnique({ where: { id: afterId }, select: { effectedDate: true, id: true } })
    if (pivot) {
      const cursorCond = sortOrder === 'asc'
        ? {
            OR: [
              { effectedDate: { gt: pivot.effectedDate } },
              { effectedDate: pivot.effectedDate, id: { gt: pivot.id } },
            ],
          }
        : {
            OR: [
              { effectedDate: { lt: pivot.effectedDate } },
              { effectedDate: pivot.effectedDate, id: { lt: pivot.id } },
            ],
          }
      where = { AND: [baseWhere, cursorCond] }
      skip = 0
    }
  }

  const rawEntries = await prisma.entry.findMany({
    where,
    distinct: ['link'],
    orderBy: [{ effectedDate: sortOrder }, { id: sortOrder }],
    include: ENTRY_INCLUDE,
    skip,
    take: limit + 1,
  });
  const aggregate = await prisma.entry.aggregate({
    where: baseWhere,
    _count: { link: true },
  });
  const total = aggregate._count.link;

  // limit+1 件取得して、実際に次があるかを直接判定する(集合が縮んでも狂わない)
  const hasMore = rawEntries.length > limit
  const entries = hasMore ? rawEntries.slice(0, limit) : rawEntries

  return {
    entries,
    pagination: { page, limit, total, hasNext: hasMore, hasPrev: page > 1 },
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
