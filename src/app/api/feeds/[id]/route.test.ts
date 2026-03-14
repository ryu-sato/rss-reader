import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/feed-service', () => ({
  getFeedById: vi.fn(),
  updateFeed: vi.fn(),
  deleteFeed: vi.fn(),
}))

import { getFeedById, updateFeed, deleteFeed } from '@/lib/feed-service'
import { GET, PUT, DELETE } from './route'
import { NotFoundError } from '@/lib/errors'

const mockGetFeedById = vi.mocked(getFeedById)
const mockUpdateFeed = vi.mocked(updateFeed)
const mockDeleteFeed = vi.mocked(deleteFeed)

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

const params = { params: Promise.resolve({ id: 'feed-1' }) }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/feeds/[id]', () => {
  it('returns 200 with feed', async () => {
    mockGetFeedById.mockResolvedValue(sampleFeed)
    const req = new NextRequest('http://localhost/api/feeds/feed-1')

    const response = await GET(req, params)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.id).toBe('feed-1')
  })

  it('returns 404 when not found', async () => {
    mockGetFeedById.mockRejectedValue(new NotFoundError('Not found'))
    const req = new NextRequest('http://localhost/api/feeds/bad-id')

    const response = await GET(req, params)
    const json = await response.json()

    expect(response.status).toBe(404)
    expect(json.error.code).toBe('FEED_NOT_FOUND')
  })
})

describe('PUT /api/feeds/[id]', () => {
  function makeRequest(body: unknown) {
    return new NextRequest('http://localhost/api/feeds/feed-1', {
      method: 'PUT',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
  }

  it('returns 200 with updated feed', async () => {
    const updated = { ...sampleFeed, title: 'New Title', memo: 'note' }
    mockUpdateFeed.mockResolvedValue(updated)

    const response = await PUT(makeRequest({ title: 'New Title', memo: 'note' }), params)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.title).toBe('New Title')
  })

  it('returns 400 when title is empty', async () => {
    const response = await PUT(makeRequest({ title: '' }), params)
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error.code).toBe('VALIDATION_ERROR')
  })
})

describe('DELETE /api/feeds/[id]', () => {
  it('returns 200 on success', async () => {
    mockDeleteFeed.mockResolvedValue(undefined)
    const req = new NextRequest('http://localhost/api/feeds/feed-1', { method: 'DELETE' })

    const response = await DELETE(req, params)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
  })

  it('returns 404 when not found', async () => {
    mockDeleteFeed.mockRejectedValue(new NotFoundError('Not found'))
    const req = new NextRequest('http://localhost/api/feeds/bad-id', { method: 'DELETE' })

    const response = await DELETE(req, params)
    const json = await response.json()

    expect(response.status).toBe(404)
    expect(json.error.code).toBe('FEED_NOT_FOUND')
  })
})
