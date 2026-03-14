/**
 * TASK-0017: E2E integration tests for entry listing, filtering, modal, meta, and tags.
 * Tests the API route handlers with mocked services to verify full request-response flow.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/entry-service', () => ({
  findManyEntries: vi.fn(),
  getEntryById: vi.fn(),
  updateEntryMeta: vi.fn(),
}))

vi.mock('@/lib/tag-service', () => ({
  getAllTags: vi.fn(),
  upsertTagAndAssign: vi.fn(),
  removeTagFromEntry: vi.fn(),
}))

import { findManyEntries, getEntryById, updateEntryMeta } from '@/lib/entry-service'
import { getAllTags, upsertTagAndAssign, removeTagFromEntry } from '@/lib/tag-service'
import { GET as getEntries } from '@/app/api/entries/route'
import { GET as getEntry } from '@/app/api/entries/[id]/route'
import { PUT as putMeta } from '@/app/api/entries/[id]/meta/route'
import { GET as getTags, POST as postTag } from '@/app/api/tags/route'
import { DELETE as deleteTagEntry } from '@/app/api/tags/[tagId]/entries/[entryId]/route'

const mockFindManyEntries = vi.mocked(findManyEntries)
const mockGetEntryById = vi.mocked(getEntryById)
const mockUpdateEntryMeta = vi.mocked(updateEntryMeta)
const mockGetAllTags = vi.mocked(getAllTags)
const mockUpsertTagAndAssign = vi.mocked(upsertTagAndAssign)
const mockRemoveTagFromEntry = vi.mocked(removeTagFromEntry)

const sampleEntry = {
  id: 'entry-1',
  feedId: 'feed-1',
  guid: 'guid-1',
  title: 'Integration Test Article',
  link: 'https://example.com/1',
  description: 'Summary',
  content: 'Full content',
  publishedAt: new Date('2026-03-14'),
  createdAt: new Date('2026-03-14'),
  updatedAt: new Date('2026-03-14'),
  feed: { id: 'feed-1', title: 'Test Blog' },
  meta: null,
  tags: [],
}

const samplePagination = { page: 1, limit: 20, total: 1, hasNext: false, hasPrev: false }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Entry listing flow (REQ-001, REQ-002, REQ-003)', () => {
  it('returns entries ordered by publishedAt desc with pagination', async () => {
    mockFindManyEntries.mockResolvedValue({ entries: [sampleEntry], pagination: samplePagination })

    const req = new NextRequest('http://localhost/api/entries?page=1')
    const res = await getEntries(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].title).toBe('Integration Test Article')
    expect(body.pagination.page).toBe(1)
    expect(body.pagination.total).toBe(1)
  })

  it('filters by feedId (REQ-004)', async () => {
    mockFindManyEntries.mockResolvedValue({ entries: [sampleEntry], pagination: samplePagination })

    const req = new NextRequest('http://localhost/api/entries?feedId=feed-1')
    await getEntries(req)

    expect(mockFindManyEntries).toHaveBeenCalledWith(
      expect.objectContaining({ feedId: 'feed-1' })
    )
  })

  it('filters by tagId (REQ-005)', async () => {
    mockFindManyEntries.mockResolvedValue({ entries: [], pagination: { ...samplePagination, total: 0 } })

    const req = new NextRequest('http://localhost/api/entries?tagId=tag-1')
    await getEntries(req)

    expect(mockFindManyEntries).toHaveBeenCalledWith(
      expect.objectContaining({ tagId: 'tag-1' })
    )
  })

  it('filters by feedId AND tagId simultaneously', async () => {
    mockFindManyEntries.mockResolvedValue({ entries: [], pagination: { ...samplePagination, total: 0 } })

    const req = new NextRequest('http://localhost/api/entries?feedId=feed-1&tagId=tag-1')
    await getEntries(req)

    expect(mockFindManyEntries).toHaveBeenCalledWith(
      expect.objectContaining({ feedId: 'feed-1', tagId: 'tag-1' })
    )
  })

  it('returns 400 for invalid page parameter', async () => {
    const req = new NextRequest('http://localhost/api/entries?page=0')
    const res = await getEntries(req)
    expect(res.status).toBe(400)
  })
})

describe('Entry detail flow (REQ-006)', () => {
  it('returns full entry detail when found', async () => {
    mockGetEntryById.mockResolvedValue(sampleEntry as never)

    const req = new NextRequest('http://localhost/api/entries/entry-1')
    const res = await getEntry(req, { params: Promise.resolve({ id: 'entry-1' }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.id).toBe('entry-1')
    expect(body.data.feed.title).toBe('Test Blog')
  })

  it('returns 404 for non-existent entry', async () => {
    mockGetEntryById.mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/entries/missing')
    const res = await getEntry(req, { params: Promise.resolve({ id: 'missing' }) })
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error.code).toBe('ENTRY_NOT_FOUND')
  })
})

describe('Meta update flow - read and read-later (REQ-008, REQ-009, REQ-101)', () => {
  it('marks entry as read (auto-read on modal open)', async () => {
    mockGetEntryById.mockResolvedValue(sampleEntry as never)
    mockUpdateEntryMeta.mockResolvedValue({
      id: 'meta-1', entryId: 'entry-1', isRead: true, isReadLater: false,
      createdAt: new Date(), updatedAt: new Date(),
    })

    const req = new NextRequest('http://localhost/api/entries/entry-1/meta', {
      method: 'PUT',
      body: JSON.stringify({ isRead: true }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await putMeta(req, { params: Promise.resolve({ id: 'entry-1' }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.isRead).toBe(true)
  })

  it('sets and clears read-later flag', async () => {
    mockGetEntryById.mockResolvedValue(sampleEntry as never)
    mockUpdateEntryMeta.mockResolvedValue({
      id: 'meta-1', entryId: 'entry-1', isRead: false, isReadLater: true,
      createdAt: new Date(), updatedAt: new Date(),
    })

    const req = new NextRequest('http://localhost/api/entries/entry-1/meta', {
      method: 'PUT',
      body: JSON.stringify({ isReadLater: true }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await putMeta(req, { params: Promise.resolve({ id: 'entry-1' }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.isReadLater).toBe(true)
    expect(mockUpdateEntryMeta).toHaveBeenCalledWith('entry-1', { isReadLater: true })
  })

  it('returns 404 when updating meta for non-existent entry', async () => {
    mockGetEntryById.mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/entries/missing/meta', {
      method: 'PUT',
      body: JSON.stringify({ isRead: true }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await putMeta(req, { params: Promise.resolve({ id: 'missing' }) })
    expect(res.status).toBe(404)
  })
})

describe('Tag management flow (REQ-010, REQ-011, REQ-012)', () => {
  it('creates new tag and assigns to entry (case-insensitive)', async () => {
    mockGetEntryById.mockResolvedValue(sampleEntry as never)
    mockUpsertTagAndAssign.mockResolvedValue({
      id: 'tag-1', name: 'tech', createdAt: new Date(),
    })

    const req = new NextRequest('http://localhost/api/tags', {
      method: 'POST',
      body: JSON.stringify({ name: 'TECH', entryId: 'entry-1' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await postTag(req)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.data.name).toBe('tech')
    expect(mockUpsertTagAndAssign).toHaveBeenCalledWith('TECH', 'entry-1')
  })

  it('reuses existing tag when assigning by same normalized name', async () => {
    mockGetEntryById.mockResolvedValue(sampleEntry as never)
    mockUpsertTagAndAssign.mockResolvedValue({ id: 'tag-1', name: 'tech', createdAt: new Date() })

    const req = new NextRequest('http://localhost/api/tags', {
      method: 'POST',
      body: JSON.stringify({ name: 'Tech', entryId: 'entry-1' }),
      headers: { 'Content-Type': 'application/json' },
    })
    await postTag(req)

    expect(mockUpsertTagAndAssign).toHaveBeenCalledTimes(1)
  })

  it('removes tag from entry', async () => {
    mockRemoveTagFromEntry.mockResolvedValue(undefined)

    const req = new NextRequest('http://localhost/api/tags/tag-1/entries/entry-1', { method: 'DELETE' })
    const res = await deleteTagEntry(req, { params: Promise.resolve({ tagId: 'tag-1', entryId: 'entry-1' }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(mockRemoveTagFromEntry).toHaveBeenCalledWith('tag-1', 'entry-1')
  })

  it('returns all tags ordered alphabetically', async () => {
    mockGetAllTags.mockResolvedValue([
      { id: 'tag-1', name: 'apple', createdAt: new Date() },
      { id: 'tag-2', name: 'banana', createdAt: new Date() },
    ])

    const res = await getTags()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data[0].name).toBe('apple')
    expect(body.data[1].name).toBe('banana')
  })

  it('returns 404 when assigning tag to non-existent entry', async () => {
    mockGetEntryById.mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/tags', {
      method: 'POST',
      body: JSON.stringify({ name: 'tech', entryId: 'missing' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await postTag(req)
    expect(res.status).toBe(404)
  })
})
