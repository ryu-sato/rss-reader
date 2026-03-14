/**
 * TASK-0018: Integration tests for scheduled fetch, error handling, dedup, and entry limits.
 * Tests fetchAllFeedsEntries, saveEntries, enforceEntryLimit with mocked dependencies.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
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
  },
}))

vi.mock('@/lib/ssrf-guard', () => ({
  validateUrl: vi.fn(),
}))

vi.mock('@/lib/entry-fetcher', () => ({
  fetchEntries: vi.fn(),
}))

import { prisma } from '@/lib/db'
import { validateUrl } from '@/lib/ssrf-guard'
import { fetchEntries } from '@/lib/entry-fetcher'
import { fetchAllFeedsEntries, saveEntries, enforceEntryLimit } from '@/lib/entry-service'
import type { FetchedEntryData } from '@/types/entry'

const mockFeed = vi.mocked(prisma.feed)
const mockEntry = vi.mocked(prisma.entry)
const mockValidateUrl = vi.mocked(validateUrl)
const mockFetchEntries = vi.mocked(fetchEntries)

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

const sampleEntryData: FetchedEntryData[] = [
  {
    guid: 'guid-1',
    title: 'Article 1',
    link: 'https://example.com/1',
    description: 'Summary',
    content: 'Content',
    imageUrl: null,
    publishedAt: new Date('2026-03-14'),
  },
]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('fetchAllFeedsEntries - normal flow (REQ-211)', () => {
  it('fetches entries for all feeds and saves them', async () => {
    mockFeed.findMany.mockResolvedValue([sampleFeed] as never)
    mockValidateUrl.mockResolvedValue(undefined)
    mockFetchEntries.mockResolvedValue(sampleEntryData)
    mockEntry.upsert.mockResolvedValue({} as never)
    mockEntry.count.mockResolvedValue(1)
    mockFeed.update.mockResolvedValue({} as never)

    await fetchAllFeedsEntries()

    expect(mockFetchEntries).toHaveBeenCalledWith(sampleFeed.url)
    expect(mockEntry.upsert).toHaveBeenCalledTimes(1)
    expect(mockFeed.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'feed-1' },
        data: expect.objectContaining({ lastFetchedAt: expect.any(Date) }),
      })
    )
  })

  it('updates lastFetchedAt for each successfully fetched feed', async () => {
    const feed2 = { ...sampleFeed, id: 'feed-2', url: 'https://example2.com/feed.xml' }
    mockFeed.findMany.mockResolvedValue([sampleFeed, feed2] as never)
    mockValidateUrl.mockResolvedValue(undefined)
    mockFetchEntries.mockResolvedValue(sampleEntryData)
    mockEntry.upsert.mockResolvedValue({} as never)
    mockEntry.count.mockResolvedValue(1)
    mockFeed.update.mockResolvedValue({} as never)

    await fetchAllFeedsEntries()

    expect(mockFeed.update).toHaveBeenCalledTimes(2)
  })
})

describe('fetchAllFeedsEntries - error handling (REQ-104, EDGE-004)', () => {
  it('continues processing other feeds when one fails', async () => {
    const feed2 = { ...sampleFeed, id: 'feed-2', url: 'https://example2.com/feed.xml' }
    mockFeed.findMany.mockResolvedValue([sampleFeed, feed2] as never)
    mockValidateUrl.mockResolvedValue(undefined)
    mockFetchEntries
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(sampleEntryData)
    mockEntry.upsert.mockResolvedValue({} as never)
    mockEntry.count.mockResolvedValue(1)
    mockFeed.update.mockResolvedValue({} as never)

    await fetchAllFeedsEntries()

    expect(mockFetchEntries).toHaveBeenCalledTimes(2)
    expect(mockEntry.upsert).toHaveBeenCalledTimes(1)
    expect(mockFeed.update).toHaveBeenCalledTimes(1)
  })

  it('skips feeds that fail SSRF validation (NFR-102)', async () => {
    mockFeed.findMany.mockResolvedValue([sampleFeed] as never)
    mockValidateUrl.mockRejectedValue(new Error('SSRF violation: private IP'))

    await fetchAllFeedsEntries()

    expect(mockFetchEntries).not.toHaveBeenCalled()
    expect(mockEntry.upsert).not.toHaveBeenCalled()
  })
})

describe('saveEntries - deduplication (REQ-103)', () => {
  it('does not create duplicate entries for the same guid', async () => {
    mockEntry.upsert.mockResolvedValue({} as never)

    // Save same entry data twice
    await saveEntries('feed-1', sampleEntryData)
    await saveEntries('feed-1', sampleEntryData)

    // upsert is called twice but uses feedId+guid unique key to prevent duplicates
    expect(mockEntry.upsert).toHaveBeenCalledTimes(2)
    expect(mockEntry.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { feedId_guid: { feedId: 'feed-1', guid: 'guid-1' } },
      })
    )
  })
})

describe('enforceEntryLimit - entry limit management (REQ-102, REQ-401)', () => {
  it('deletes oldest entries when count exceeds 500', async () => {
    mockEntry.count.mockResolvedValue(502)
    mockEntry.findMany.mockResolvedValue([
      { id: 'old-entry-1' },
      { id: 'old-entry-2' },
    ] as never)
    mockEntry.deleteMany.mockResolvedValue({ count: 2 })

    await enforceEntryLimit('feed-1')

    expect(mockEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: expect.arrayContaining([{ publishedAt: 'asc' }]),
        take: 2,
      })
    )
    expect(mockEntry.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['old-entry-1', 'old-entry-2'] } },
    })
  })

  it('does not delete entries when count is exactly at limit (500)', async () => {
    mockEntry.count.mockResolvedValue(500)

    await enforceEntryLimit('feed-1')

    expect(mockEntry.deleteMany).not.toHaveBeenCalled()
  })

  it('deletes the correct number of excess entries', async () => {
    mockEntry.count.mockResolvedValue(505)
    mockEntry.findMany.mockResolvedValue(
      Array(5).fill({ id: 'old' }) as never
    )
    mockEntry.deleteMany.mockResolvedValue({ count: 5 })

    await enforceEntryLimit('feed-1')

    expect(mockEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 })
    )
  })
})
