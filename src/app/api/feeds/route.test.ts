import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/feed-service', () => ({
  getAllFeeds: vi.fn(),
  createFeed: vi.fn(),
}))

import { getAllFeeds, createFeed } from '@/lib/feed-service'
import { GET, POST } from './route'
import { ConflictError, FeedFetchError } from '@/lib/errors'

const mockGetAllFeeds = vi.mocked(getAllFeeds)
const mockCreateFeed = vi.mocked(createFeed)

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

describe('GET /api/feeds', () => {
  it('returns 200 with feed list', async () => {
    const feeds = [{ id: '1', title: 'Feed', url: 'https://a.com', faviconUrl: null, createdAt: new Date(), updatedAt: new Date() }]
    mockGetAllFeeds.mockResolvedValue(feeds)

    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toHaveLength(1)
    expect(json.data[0].id).toBe('1')
  })
})

describe('POST /api/feeds', () => {
  function makeRequest(body: unknown) {
    return new NextRequest('http://localhost/api/feeds', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
  }

  it('returns 201 with created feed', async () => {
    mockCreateFeed.mockResolvedValue(sampleFeed)

    const response = await POST(makeRequest({ url: 'https://example.com/feed.xml' }))
    const json = await response.json()

    expect(response.status).toBe(201)
    expect(json.success).toBe(true)
    expect(json.data.id).toBe(sampleFeed.id)
    expect(json.data.url).toBe(sampleFeed.url)
  })

  it('returns 400 when URL is missing', async () => {
    const response = await POST(makeRequest({}))
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.success).toBe(false)
    expect(json.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 409 when URL is duplicate', async () => {
    mockCreateFeed.mockRejectedValue(new ConflictError('Already exists'))

    const response = await POST(makeRequest({ url: 'https://example.com/feed.xml' }))
    const json = await response.json()

    expect(response.status).toBe(409)
    expect(json.error.code).toBe('FEED_ALREADY_EXISTS')
  })

  it('returns 422 when feed fetch fails', async () => {
    mockCreateFeed.mockRejectedValue(new FeedFetchError('Fetch failed'))

    const response = await POST(makeRequest({ url: 'https://example.com/feed.xml' }))
    const json = await response.json()

    expect(response.status).toBe(422)
    expect(json.error.code).toBe('FEED_FETCH_FAILED')
  })
})
