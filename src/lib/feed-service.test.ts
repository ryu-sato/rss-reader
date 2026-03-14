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
  },
}))

vi.mock('@/lib/ssrf-guard', () => ({
  validateUrl: vi.fn(),
}))

vi.mock('@/lib/rss-fetcher', () => ({
  fetchFeed: vi.fn(),
}))

import { prisma } from '@/lib/db'
import { validateUrl } from '@/lib/ssrf-guard'
import { fetchFeed } from '@/lib/rss-fetcher'
import { createFeed, getAllFeeds, getFeedById, updateFeed, deleteFeed } from './feed-service'
import { ConflictError, NotFoundError, SSRFError } from './errors'

const mockFeed = vi.mocked(prisma.feed)
const mockValidateUrl = vi.mocked(validateUrl)
const mockFetchFeed = vi.mocked(fetchFeed)

const sampleFeed = {
  id: 'feed-1',
  url: 'https://example.com/feed.xml',
  title: 'Example Blog',
  description: 'Blog description',
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
  it('returns feeds ordered by createdAt desc', async () => {
    const feeds = [
      { id: '1', title: 'Feed 1', url: 'https://a.com', createdAt: new Date('2026-01-02'), updatedAt: new Date() },
      { id: '2', title: 'Feed 2', url: 'https://b.com', createdAt: new Date('2026-01-01'), updatedAt: new Date() },
    ]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFeed.findMany.mockResolvedValue(feeds as any)

    const result = await getAllFeeds()
    expect(result).toEqual(feeds)
    expect(mockFeed.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, url: true, createdAt: true, updatedAt: true },
    })
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
