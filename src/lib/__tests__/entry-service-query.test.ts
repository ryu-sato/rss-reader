import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  prisma: {
    entry: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    entryMeta: {
      upsert: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'
import { findManyEntries, getEntryById, updateEntryMeta } from '../entry-service'

const mockEntry = vi.mocked(prisma.entry)
const mockEntryMeta = vi.mocked(prisma.entryMeta)

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

describe('updateEntryMeta', () => {
  const meta = {
    id: 'meta-1',
    entryId: 'entry-1',
    isRead: true,
    isReadLater: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  it('同一 link の全エントリに isRead を連動させる', async () => {
    mockEntry.findUnique.mockResolvedValue({ link: 'https://example.com/1' } as never)
    mockEntry.findMany.mockResolvedValue([{ id: 'entry-1' }, { id: 'entry-2' }] as never)
    mockEntryMeta.upsert.mockResolvedValue(meta as never)
    mockEntryMeta.findUnique.mockResolvedValue(meta as never)

    const result = await updateEntryMeta('entry-1', { isRead: true })

    expect(result).toEqual(meta)
    // 両方のエントリに upsert が呼ばれること
    expect(mockEntryMeta.upsert).toHaveBeenCalledTimes(2)
    expect(mockEntryMeta.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { entryId: 'entry-1' },
        create: expect.objectContaining({ isRead: true }),
        update: { isRead: true },
      })
    )
    expect(mockEntryMeta.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { entryId: 'entry-2' },
        create: expect.objectContaining({ isRead: true }),
        update: { isRead: true },
      })
    )
  })

  it('isReadLater のみの変更は同一 link に連動しない', async () => {
    mockEntryMeta.upsert.mockResolvedValue({ ...meta, isReadLater: true } as never)

    await updateEntryMeta('entry-1', { isReadLater: true })

    // entry を検索しない
    expect(mockEntry.findUnique).not.toHaveBeenCalled()
    expect(mockEntryMeta.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { isReadLater: true },
      })
    )
  })
})
