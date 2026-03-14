import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/entry-service', () => ({
  getEntryById: vi.fn(),
}))

import { getEntryById } from '@/lib/entry-service'
import { GET } from './route'

const mockGetEntryById = vi.mocked(getEntryById)

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

const params = { params: Promise.resolve({ id: 'entry-1' }) }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/entries/[id]', () => {
  it('returns 200 with entry data when found', async () => {
    mockGetEntryById.mockResolvedValue(sampleEntry as never)

    const req = new NextRequest('http://localhost/api/entries/entry-1')
    const res = await GET(req, params)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.id).toBe('entry-1')
  })

  it('returns 404 when entry not found', async () => {
    mockGetEntryById.mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/entries/non-existent')
    const res = await GET(req, { params: Promise.resolve({ id: 'non-existent' }) })
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('ENTRY_NOT_FOUND')
  })

  it('returns 500 on unexpected error', async () => {
    mockGetEntryById.mockRejectedValue(new Error('DB error'))

    const req = new NextRequest('http://localhost/api/entries/entry-1')
    const res = await GET(req, params)
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('INTERNAL_SERVER_ERROR')
  })
})
