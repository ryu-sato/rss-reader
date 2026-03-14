import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/tag-service', () => ({
  removeTagFromEntry: vi.fn(),
}))

import { removeTagFromEntry } from '@/lib/tag-service'
import { DELETE } from './route'

const mockRemoveTagFromEntry = vi.mocked(removeTagFromEntry)

const params = { params: Promise.resolve({ tagId: 'tag-1', entryId: 'entry-1' }) }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('DELETE /api/tags/[tagId]/entries/[entryId]', () => {
  it('returns 200 on successful removal', async () => {
    mockRemoveTagFromEntry.mockResolvedValue(undefined)

    const req = new NextRequest('http://localhost/api/tags/tag-1/entries/entry-1', { method: 'DELETE' })
    const res = await DELETE(req, params)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(mockRemoveTagFromEntry).toHaveBeenCalledWith('tag-1', 'entry-1')
  })

  it('returns 404 when tag-entry relation does not exist', async () => {
    mockRemoveTagFromEntry.mockRejectedValue(new Error('Record not found'))

    const req = new NextRequest('http://localhost/api/tags/tag-1/entries/entry-1', { method: 'DELETE' })
    const res = await DELETE(req, params)
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error.code).toBe('TAG_NOT_FOUND')
  })
})
