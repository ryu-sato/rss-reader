import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/tag-service', () => ({
  getAllTags: vi.fn(),
  upsertTagAndAssign: vi.fn(),
}))

vi.mock('@/lib/entry-service', () => ({
  getEntryById: vi.fn(),
}))

import { getAllTags, upsertTagAndAssign } from '@/lib/tag-service'
import { getEntryById } from '@/lib/entry-service'
import { GET, POST } from './route'

const mockGetAllTags = vi.mocked(getAllTags)
const mockUpsertTagAndAssign = vi.mocked(upsertTagAndAssign)
const mockGetEntryById = vi.mocked(getEntryById)

const sampleTag = { id: 'tag-1', name: 'tech', createdAt: new Date() }
const sampleEntry = { id: 'entry-1', feedId: 'feed-1' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/tags', () => {
  it('returns 200 with all tags', async () => {
    mockGetAllTags.mockResolvedValue([sampleTag] as never)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].name).toBe('tech')
  })

  it('returns 500 on error', async () => {
    mockGetAllTags.mockRejectedValue(new Error('DB error'))

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error.code).toBe('INTERNAL_SERVER_ERROR')
  })
})

describe('POST /api/tags', () => {
  it('returns 201 with created tag', async () => {
    mockGetEntryById.mockResolvedValue(sampleEntry as never)
    mockUpsertTagAndAssign.mockResolvedValue(sampleTag as never)

    const req = new NextRequest('http://localhost/api/tags', {
      method: 'POST',
      body: JSON.stringify({ name: 'Tech', entryId: 'entry-1' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.success).toBe(true)
    expect(body.data.name).toBe('tech')
  })

  it('returns 400 when name or entryId is missing', async () => {
    const req = new NextRequest('http://localhost/api/tags', {
      method: 'POST',
      body: JSON.stringify({ name: 'Tech' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 404 when entryId does not exist', async () => {
    mockGetEntryById.mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/tags', {
      method: 'POST',
      body: JSON.stringify({ name: 'tech', entryId: 'non-existent' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error.code).toBe('ENTRY_NOT_FOUND')
  })
})
