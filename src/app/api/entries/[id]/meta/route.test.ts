import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/entry-service', () => ({
  getEntryById: vi.fn(),
  updateEntryMeta: vi.fn(),
}))

import { getEntryById, updateEntryMeta } from '@/lib/entry-service'
import { PUT } from './route'

const mockGetEntryById = vi.mocked(getEntryById)
const mockUpdateEntryMeta = vi.mocked(updateEntryMeta)

const sampleEntry = { id: 'entry-1', feedId: 'feed-1' }
const sampleMeta = {
  id: 'meta-1',
  entryId: 'entry-1',
  isRead: true,
  isReadLater: false,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const params = { params: Promise.resolve({ id: 'entry-1' }) }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PUT /api/entries/[id]/meta', () => {
  it('returns 200 with updated meta when entry exists', async () => {
    mockGetEntryById.mockResolvedValue(sampleEntry as never)
    mockUpdateEntryMeta.mockResolvedValue(sampleMeta as never)

    const req = new NextRequest('http://localhost/api/entries/entry-1/meta', {
      method: 'PUT',
      body: JSON.stringify({ isRead: true }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PUT(req, params)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.isRead).toBe(true)
  })

  it('passes isRead and isReadLater to updateEntryMeta', async () => {
    mockGetEntryById.mockResolvedValue(sampleEntry as never)
    mockUpdateEntryMeta.mockResolvedValue(sampleMeta as never)

    const req = new NextRequest('http://localhost/api/entries/entry-1/meta', {
      method: 'PUT',
      body: JSON.stringify({ isRead: true, isReadLater: false }),
      headers: { 'Content-Type': 'application/json' },
    })
    await PUT(req, params)

    expect(mockUpdateEntryMeta).toHaveBeenCalledWith('entry-1', { isRead: true, isReadLater: false })
  })

  it('returns 404 when entry not found', async () => {
    mockGetEntryById.mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/entries/non-existent/meta', {
      method: 'PUT',
      body: JSON.stringify({ isRead: true }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PUT(req, { params: Promise.resolve({ id: 'non-existent' }) })
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('ENTRY_NOT_FOUND')
  })

  it('returns 500 on unexpected error', async () => {
    mockGetEntryById.mockResolvedValue(sampleEntry as never)
    mockUpdateEntryMeta.mockRejectedValue(new Error('DB error'))

    const req = new NextRequest('http://localhost/api/entries/entry-1/meta', {
      method: 'PUT',
      body: JSON.stringify({ isRead: true }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PUT(req, params)
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error.code).toBe('INTERNAL_SERVER_ERROR')
  })
})
