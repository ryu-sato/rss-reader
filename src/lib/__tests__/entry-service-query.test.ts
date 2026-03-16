import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  prisma: {
    entry: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    entryMeta: {
      upsert: vi.fn(),
    },
    $queryRawUnsafe: vi.fn(),
  },
}))

import { prisma } from '@/lib/db'
import { findManyEntries, getEntryById, updateEntryMeta } from '../entry-service'

const mockEntry = vi.mocked(prisma.entry)
const mockEntryMeta = vi.mocked(prisma.entryMeta)
const mockQueryRawUnsafe = vi.mocked(prisma.$queryRawUnsafe)

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
  // feedId 未指定 → 重複排除パス ($queryRawUnsafe を使用)
  it('returns entries with pagination (default page=1, limit=20)', async () => {
    mockQueryRawUnsafe
      .mockResolvedValueOnce([{ id: 'entry-1' }] as never) // IDs query
      .mockResolvedValueOnce([{ count: BigInt(1) }] as never) // count query
    mockEntry.findMany.mockResolvedValue([sampleEntry] as never)

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
    mockQueryRawUnsafe
      .mockResolvedValueOnce([] as never) // IDs query
      .mockResolvedValueOnce([{ count: BigInt(0) }] as never) // count query

    await findManyEntries({ tagId: 'tag-1' })

    // tagId は raw SQL の EXISTS 句で適用される
    expect(mockQueryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('entry_tags'),
      'tag-1',
      expect.any(Number),
      expect.any(Number)
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
    mockQueryRawUnsafe
      .mockResolvedValueOnce(Array(20).fill({ id: 'entry-1' }) as never)
      .mockResolvedValueOnce([{ count: BigInt(25) }] as never)
    mockEntry.findMany.mockResolvedValue(Array(20).fill(sampleEntry) as never)

    const result = await findManyEntries({ page: 1, limit: 20 })

    expect(result.pagination.hasNext).toBe(true)
    expect(result.pagination.hasPrev).toBe(false)
  })

  it('sets hasPrev=true on page 2+', async () => {
    mockQueryRawUnsafe
      .mockResolvedValueOnce([{ id: 'entry-1' }] as never)
      .mockResolvedValueOnce([{ count: BigInt(25) }] as never)
    mockEntry.findMany.mockResolvedValue([sampleEntry] as never)

    const result = await findManyEntries({ page: 2, limit: 20 })

    expect(result.pagination.hasPrev).toBe(true)
    expect(result.pagination.page).toBe(2)
  })

  it('includes feed, meta, tags in response', async () => {
    mockQueryRawUnsafe
      .mockResolvedValueOnce([{ id: 'entry-1' }] as never)
      .mockResolvedValueOnce([{ count: BigInt(1) }] as never)
    mockEntry.findMany.mockResolvedValue([sampleEntry] as never)

    await findManyEntries({})

    expect(mockEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          feed: expect.any(Object),
          meta: true,
          tags: expect.any(Object),
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
  it('upserts EntryMeta when it does not exist (creates new)', async () => {
    const meta = {
      id: 'meta-1',
      entryId: 'entry-1',
      isRead: true,
      isReadLater: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    mockEntryMeta.upsert.mockResolvedValue(meta as never)

    const result = await updateEntryMeta('entry-1', { isRead: true })

    expect(result).toEqual(meta)
    expect(mockEntryMeta.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { entryId: 'entry-1' },
        create: expect.objectContaining({ entryId: 'entry-1', isRead: true }),
        update: { isRead: true },
      })
    )
  })

  it('updates existing EntryMeta', async () => {
    const meta = {
      id: 'meta-1',
      entryId: 'entry-1',
      isRead: false,
      isReadLater: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    mockEntryMeta.upsert.mockResolvedValue(meta as never)

    await updateEntryMeta('entry-1', { isReadLater: true })

    expect(mockEntryMeta.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { isReadLater: true },
      })
    )
  })
})
