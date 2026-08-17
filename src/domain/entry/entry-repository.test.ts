import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'

vi.mock('@/domain/shared/db', () => ({
  prisma: {
    entry: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
  },
}))

import { prisma } from '@/domain/shared/db'
import { findManyEntries, getEntryById } from './entry-repository'

const mockEntry = prisma.entry as unknown as Record<'aggregate' | 'count' | 'findMany' | 'findUnique', Mock>

const sampleEntry = {
  id: 'entry-1',
  feedId: 'feed-1',
  guid: 'guid-1',
  title: 'Article 1',
  link: 'https://example.com/1',
  description: 'Summary',
  content: 'Content',
  publishedAt: new Date('2026-03-14'),
  createdAt: new Date('2026-03-14'),
  updatedAt: new Date('2026-03-14'),
  feed: { id: 'feed-1', title: 'Example Blog' },
  meta: null,
  tags: [],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('findManyEntries', () => {
  // feedId 未指定 → 重複排除パス (prisma.entry.findMany distinct: ['link'] を使用)
  it('returns entries with pagination (default page=1, limit=20)', async () => {
    mockEntry.findMany.mockResolvedValue([sampleEntry] as never) // limit(20)+1 未満 → hasNext=false
    mockEntry.aggregate.mockResolvedValue({ _count: { link: 1 } } as never)

    const result = await findManyEntries({})

    expect(result.entries).toHaveLength(1)
    expect(result.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      hasNext: false,
      hasPrev: false,
    })
  })

  it('filters by feedId when provided', async () => {
    mockEntry.findMany.mockResolvedValue([] as never)
    mockEntry.count.mockResolvedValue(0)

    await findManyEntries({ feedId: 'feed-1' })

    expect(mockEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ feedId: 'feed-1' }),
      })
    )
  })

  it('filters by tagId when provided', async () => {
    mockEntry.findMany.mockResolvedValue([] as never)
    mockEntry.aggregate.mockResolvedValue({ _count: { link: 0 } } as never)

    await findManyEntries({ tagId: 'tag-1' })

    // feedId 未指定時は distinct(重複排除)しつつ tags リレーションで絞り込む
    expect(mockEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tags: { some: { tagId: 'tag-1' } } }),
        distinct: ['link'],
      })
    )
  })

  it('applies AND condition when both feedId and tagId are provided', async () => {
    mockEntry.findMany.mockResolvedValue([] as never)
    mockEntry.count.mockResolvedValue(0)

    await findManyEntries({ feedId: 'feed-1', tagId: 'tag-1' })

    // feedId あり → Prisma パスを使用
    expect(mockEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          feedId: 'feed-1',
          tags: { some: { tagId: 'tag-1' } },
        }),
      })
    )
  })

  it('sets hasNext=true when total exceeds page*limit', async () => {
    // limit+1 件取得して次があるかを判定するため、limit(20)+1=21件を返す
    mockEntry.findMany.mockResolvedValue(Array(21).fill(sampleEntry) as never)
    mockEntry.aggregate.mockResolvedValue({ _count: { link: 25 } } as never)

    const result = await findManyEntries({ page: 1, limit: 20 })

    expect(result.entries).toHaveLength(20)
    expect(result.pagination.hasNext).toBe(true)
    expect(result.pagination.hasPrev).toBe(false)
  })

  it('sets hasPrev=true on page 2+', async () => {
    mockEntry.findMany.mockResolvedValue([sampleEntry] as never)
    mockEntry.aggregate.mockResolvedValue({ _count: { link: 25 } } as never)

    const result = await findManyEntries({ page: 2, limit: 20 })

    expect(result.pagination.hasPrev).toBe(true)
    expect(result.pagination.page).toBe(2)
  })

  it('feedId 指定 + sortOrder=asc + afterId 指定時は pivot より新しい記事を昇順で取得する(追加読み込みの回帰防止)', async () => {
    // 並び替えキーと同じ (effectedDate, id) でカーソル条件を組み立てること。
    // 実データでの追加読み込みの網羅性は entry-service.test.ts で担保している。
    const pivot = { id: 'entry-1', effectedDate: new Date('2026-03-10') }
    mockEntry.findUnique.mockResolvedValue(pivot as never)
    mockEntry.findMany.mockResolvedValue([] as never)
    mockEntry.count.mockResolvedValue(0)

    await findManyEntries({ feedId: 'feed-1', afterId: 'entry-1', sortOrder: 'asc' })

    expect(mockEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: [
            expect.objectContaining({ feedId: 'feed-1' }),
            expect.objectContaining({
              OR: [
                { effectedDate: { gt: pivot.effectedDate } },
                { effectedDate: pivot.effectedDate, id: { gt: pivot.id } },
              ],
            }),
          ],
        }),
        orderBy: [{ effectedDate: 'asc' }, { id: 'asc' }],
      })
    )
  })

  it('includes feed, meta in response', async () => {
    mockEntry.findMany.mockResolvedValue([sampleEntry] as never)
    mockEntry.aggregate.mockResolvedValue({ _count: { link: 1 } } as never)

    await findManyEntries({})

    expect(mockEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          feed: expect.any(Object),
          meta: true,
        }),
      })
    )
  })
})

describe('getEntryById', () => {
  it('returns entry with relations when found', async () => {
    mockEntry.findUnique.mockResolvedValue(sampleEntry as never)

    const result = await getEntryById('entry-1')

    expect(result).toEqual(sampleEntry)
    expect(mockEntry.findUnique).toHaveBeenCalledWith({
      where: { id: 'entry-1' },
      include: expect.objectContaining({
        feed: expect.any(Object),
        meta: true,
        tags: expect.any(Object),
      }),
    })
  })

  it('returns null when not found', async () => {
    mockEntry.findUnique.mockResolvedValue(null)

    const result = await getEntryById('non-existent')

    expect(result).toBeNull()
  })
})
