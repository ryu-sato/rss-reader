import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  prisma: {
    feed: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}))

vi.mock('@/lib/ssrf-guard', () => ({
  validateUrl: vi.fn(),
}))

vi.mock('@/features/feed-management/lib/rss-fetcher', () => ({
  fetchFeed: vi.fn(),
}))

import { prisma } from '@/lib/db'
import { validateUrl } from '@/lib/ssrf-guard'
import { fetchFeed } from '@/features/feed-management/lib/rss-fetcher'
import { createFeed, getAllFeeds, getFeedById, updateFeed, deleteFeed } from './feed-service'
import { ConflictError, NotFoundError, SSRFError } from './errors'

const mockFeed = vi.mocked(prisma.feed)
const mockQueryRaw = vi.mocked(prisma.$queryRaw)
const mockValidateUrl = vi.mocked(validateUrl)
const mockFetchFeed = vi.mocked(fetchFeed)

const sampleFeed = {
  id: 'feed-1',
  url: 'https://example.com/feed.xml',
  title: 'Example Blog',
  description: 'Blog description',
  faviconUrl: null,
  memo: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  lastFetchedAt: new Date('2026-01-01'),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createFeed', () => {
  it('creates feed successfully', async () => {
    mockFeed.findUnique.mockResolvedValue(null)
    mockValidateUrl.mockResolvedValue(undefined)
    mockFetchFeed.mockResolvedValue({
      title: 'Example Blog',
      description: 'Blog description',
      faviconUrl: null,
      lastFetchedAt: new Date(),
    })
    mockFeed.create.mockResolvedValue(sampleFeed)

    const result = await createFeed('https://example.com/feed.xml')
    expect(result).toEqual(sampleFeed)
    expect(mockFeed.create).toHaveBeenCalledOnce()
  })

  it('throws ConflictError for duplicate URL', async () => {
    mockFeed.findUnique.mockResolvedValue(sampleFeed)
    await expect(createFeed('https://example.com/feed.xml')).rejects.toThrow(ConflictError)
  })

  it('propagates SSRFError from validateUrl', async () => {
    mockFeed.findUnique.mockResolvedValue(null)
    mockValidateUrl.mockRejectedValue(new SSRFError('URL not allowed'))
    await expect(createFeed('http://192.168.1.1/feed')).rejects.toThrow(SSRFError)
  })
})

describe('getAllFeeds', () => {
  it('returns feeds with unreadCount, ordered by lastPublishedAt desc', async () => {
    mockFeed.findMany.mockResolvedValue([
      { id: '1', title: 'Feed 1', url: 'https://a.com', faviconUrl: null, createdAt: new Date('2026-01-02'), updatedAt: new Date('2026-01-02'), _count: { entries: 3 } },
      { id: '2', title: 'Feed 2', url: 'https://b.com', faviconUrl: null, createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'), _count: { entries: 0 } },
    ] as never)
    mockQueryRaw.mockResolvedValue([
      { feedId: '1', lastPublishedAt: '2026-01-05T00:00:00.000Z' },
      { feedId: '2', lastPublishedAt: '2026-01-10T00:00:00.000Z' },
    ] as never)

    const result = await getAllFeeds()

    // feed-2 の方が lastPublishedAt が新しいので先頭に来る
    expect(result.map((f) => f.id)).toEqual(['2', '1'])
    expect(result[0].unreadCount).toBe(0)
    expect(result[1].unreadCount).toBe(3)
  })
})

describe('getFeedById', () => {
  it('returns feed when found', async () => {
    mockFeed.findUnique.mockResolvedValue(sampleFeed)
    const result = await getFeedById('feed-1')
    expect(result).toEqual(sampleFeed)
  })

  it('throws NotFoundError when not found', async () => {
    mockFeed.findUnique.mockResolvedValue(null)
    await expect(getFeedById('non-existent')).rejects.toThrow(NotFoundError)
  })
})

describe('updateFeed', () => {
  it('updates feed successfully', async () => {
    const updated = { ...sampleFeed, title: 'New Title', memo: 'note' }
    mockFeed.findUnique.mockResolvedValue(sampleFeed)
    mockFeed.update.mockResolvedValue(updated)

    const result = await updateFeed('feed-1', { title: 'New Title', memo: 'note' })
    expect(result).toEqual(updated)
    expect(mockFeed.update).toHaveBeenCalledOnce()
  })

  it('throws NotFoundError when feed not found', async () => {
    mockFeed.findUnique.mockResolvedValue(null)
    await expect(updateFeed('non-existent', { title: 'New' })).rejects.toThrow(NotFoundError)
  })
})

describe('deleteFeed', () => {
  it('deletes feed successfully', async () => {
    mockFeed.findUnique.mockResolvedValue(sampleFeed)
    mockFeed.delete.mockResolvedValue(sampleFeed)

    await expect(deleteFeed('feed-1')).resolves.toBeUndefined()
    expect(mockFeed.delete).toHaveBeenCalledWith({ where: { id: 'feed-1' } })
  })

  it('throws NotFoundError when feed not found', async () => {
    mockFeed.findUnique.mockResolvedValue(null)
    await expect(deleteFeed('non-existent')).rejects.toThrow(NotFoundError)
  })
})
