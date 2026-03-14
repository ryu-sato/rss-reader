import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/entry-service', () => ({
  findManyEntries: vi.fn(),
}))

import { findManyEntries } from '@/lib/entry-service'
import { GET } from './route'

const mockFindManyEntries = vi.mocked(findManyEntries)

const sampleEntries = [
  {
    id: 'entry-1',
    feedId: 'feed-1',
    guid: 'guid-1',
    title: 'Article 1',
    link: 'https://example.com/1',
    description: null,
    content: null,
    publishedAt: new Date('2026-03-14'),
    createdAt: new Date('2026-03-14'),
    updatedAt: new Date('2026-03-14'),
    feed: { id: 'feed-1', title: 'Blog' },
    meta: null,
    tags: [],
  },
]

const samplePagination = {
  page: 1,
  limit: 20,
  total: 1,
  hasNext: false,
  hasPrev: false,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/entries', () => {
  it('returns 200 with entries and pagination', async () => {
    mockFindManyEntries.mockResolvedValue({ entries: sampleEntries, pagination: samplePagination })

    const req = new NextRequest('http://localhost/api/entries')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.pagination).toEqual(samplePagination)
  })

  it('passes feedId and tagId query params to findManyEntries', async () => {
    mockFindManyEntries.mockResolvedValue({ entries: [], pagination: { ...samplePagination, total: 0 } })

    const req = new NextRequest('http://localhost/api/entries?feedId=feed-1&tagId=tag-1')
    await GET(req)

    expect(mockFindManyEntries).toHaveBeenCalledWith(
      expect.objectContaining({ feedId: 'feed-1', tagId: 'tag-1' })
    )
  })

  it('passes page and limit params correctly', async () => {
    mockFindManyEntries.mockResolvedValue({ entries: [], pagination: { ...samplePagination, page: 2 } })

    const req = new NextRequest('http://localhost/api/entries?page=2&limit=10')
    await GET(req)

    expect(mockFindManyEntries).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, limit: 10 })
    )
  })

  it('returns 400 for invalid page parameter (page < 1)', async () => {
    const req = new NextRequest('http://localhost/api/entries?page=-1')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 500 on unexpected error', async () => {
    mockFindManyEntries.mockRejectedValue(new Error('DB error'))

    const req = new NextRequest('http://localhost/api/entries')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('INTERNAL_SERVER_ERROR')
  })
})
