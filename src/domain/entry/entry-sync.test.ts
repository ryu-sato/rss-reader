import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'

vi.mock('@/domain/shared/db', () => ({
  prisma: {
    feed: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    entry: {
      upsert: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    entryMeta: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
  },
}))

vi.mock('@/domain/shared/ssrf-guard', () => ({
  validateUrl: vi.fn(),
}))

vi.mock('@/domain/entry/entry-fetcher', () => ({
  fetchEntries: vi.fn(),
}))

import { prisma } from '@/domain/shared/db'
import { validateUrl } from '@/domain/shared/ssrf-guard'
import { fetchEntries } from '@/domain/entry/entry-fetcher'
import { saveEntries, enforceEntryLimit, fetchAllFeedsEntries } from './entry-sync'
import type { FetchedEntryData } from '@/domain/entry/entry'

const mockEntry = prisma.entry as unknown as Record<'count' | 'deleteMany' | 'findMany' | 'upsert', Mock>
const mockFeed = prisma.feed as unknown as Record<'findMany' | 'update', Mock>
const mockEntryMeta = prisma.entryMeta as unknown as Record<'findMany', Mock>
const mockValidateUrl = vi.mocked(validateUrl)
const mockFetchEntries = vi.mocked(fetchEntries)

const sampleEntryData: FetchedEntryData[] = [
  {
    guid: 'guid-1',
    title: 'Article 1',
    link: 'https://example.com/1',
    description: 'Summary 1',
    content: 'Content 1',
    imageUrl: null,
    publishedAt: new Date('2026-03-14'),
  },
  {
    guid: 'guid-2',
    title: 'Article 2',
    link: 'https://example.com/2',
    description: null,
    content: null,
    imageUrl: null,
    publishedAt: null,
  },
]

const sampleFeed = {
  id: 'feed-1',
  url: 'https://example.com/feed.xml',
  title: 'Example Blog',
  description: null,
  memo: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  lastFetchedAt: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  // 同一 link の既読連動チェック用。デフォルトでは「メタなし・既読な兄弟なし」を返す
  mockEntryMeta.findMany.mockResolvedValue([])
})

describe('saveEntries', () => {
  it('upserts each entry by feedId+guid', async () => {
    mockEntry.upsert.mockResolvedValue({} as never)

    await saveEntries('feed-1', sampleEntryData)

    expect(mockEntry.upsert).toHaveBeenCalledTimes(2)
    expect(mockEntry.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { feedId_guid: { feedId: 'feed-1', guid: 'guid-1' } },
      })
    )
  })

  it('does not throw if entries array is empty', async () => {
    await expect(saveEntries('feed-1', [])).resolves.toBeUndefined()
    expect(mockEntry.upsert).not.toHaveBeenCalled()
  })

  it('includes all entry fields in create data', async () => {
    mockEntry.upsert.mockResolvedValue({} as never)

    await saveEntries('feed-1', [sampleEntryData[0]])

    expect(mockEntry.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          feedId: 'feed-1',
          guid: 'guid-1',
          title: 'Article 1',
          link: 'https://example.com/1',
          description: 'Summary 1',
          content: 'Content 1',
          publishedAt: new Date('2026-03-14'),
        }),
      })
    )
  })
})

describe('enforceEntryLimit', () => {
  it('does nothing when count is within limit (≤500)', async () => {
    mockEntry.count.mockResolvedValue(500)

    await enforceEntryLimit('feed-1')

    expect(mockEntry.findMany).not.toHaveBeenCalled()
    expect(mockEntry.deleteMany).not.toHaveBeenCalled()
  })

  it('deletes oldest entries when count exceeds 500', async () => {
    mockEntry.count.mockResolvedValue(502)
    mockEntry.findMany.mockResolvedValue([
      { id: 'old-1' } as never,
      { id: 'old-2' } as never,
    ])
    mockEntry.deleteMany.mockResolvedValue({ count: 2 })

    await enforceEntryLimit('feed-1')

    expect(mockEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { feedId: 'feed-1' },
        orderBy: expect.arrayContaining([{ publishedAt: 'asc' }]),
        take: 2,
        select: { id: true },
      })
    )
    expect(mockEntry.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['old-1', 'old-2'] } },
    })
  })
})

describe('fetchAllFeedsEntries', () => {
  it('fetches entries for all feeds and saves them', async () => {
    mockFeed.findMany.mockResolvedValue([sampleFeed] as never)
    mockValidateUrl.mockResolvedValue(undefined)
    mockFetchEntries.mockResolvedValue(sampleEntryData)
    mockEntry.upsert.mockResolvedValue({} as never)
    mockEntry.count.mockResolvedValue(2)
    mockFeed.update.mockResolvedValue({} as never)

    await fetchAllFeedsEntries()

    expect(mockFetchEntries).toHaveBeenCalledWith(sampleFeed.url)
    expect(mockEntry.upsert).toHaveBeenCalledTimes(2)
    expect(mockFeed.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'feed-1' },
        data: expect.objectContaining({ lastFetchedAt: expect.any(Date) }),
      })
    )
  })

  it('continues processing other feeds when one fails', async () => {
    const feed2 = { ...sampleFeed, id: 'feed-2', url: 'https://example2.com/feed.xml' }
    mockFeed.findMany.mockResolvedValue([sampleFeed, feed2] as never)
    mockValidateUrl.mockResolvedValue(undefined)
    // feed-1 fails, feed-2 succeeds
    mockFetchEntries
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(sampleEntryData)
    mockEntry.upsert.mockResolvedValue({} as never)
    mockEntry.count.mockResolvedValue(2)
    mockFeed.update.mockResolvedValue({} as never)

    await fetchAllFeedsEntries()

    // Should be called for feed-2 even though feed-1 failed
    expect(mockFetchEntries).toHaveBeenCalledTimes(2)
    expect(mockEntry.upsert).toHaveBeenCalledTimes(2) // only feed-2's entries
  })

  it('skips feed when SSRF validation fails', async () => {
    mockFeed.findMany.mockResolvedValue([sampleFeed] as never)
    mockValidateUrl.mockRejectedValue(new Error('SSRF violation'))

    await fetchAllFeedsEntries()

    expect(mockFetchEntries).not.toHaveBeenCalled()
  })
})
