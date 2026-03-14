import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  prisma: {
    tag: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    entryTag: {
      upsert: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'
import { upsertTagAndAssign, removeTagFromEntry, getAllTags } from '../tag-service'

const mockTag = vi.mocked(prisma.tag)
const mockEntryTag = vi.mocked(prisma.entryTag)

const sampleTag = {
  id: 'tag-1',
  name: 'tech',
  createdAt: new Date('2026-03-14'),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('upsertTagAndAssign', () => {
  it('normalizes tag name to lowercase and trims whitespace', async () => {
    mockTag.upsert.mockResolvedValue(sampleTag as never)
    mockEntryTag.upsert.mockResolvedValue({} as never)

    await upsertTagAndAssign('  Tech  ', 'entry-1')

    expect(mockTag.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { name: 'tech' },
        create: { name: 'tech' },
      })
    )
  })

  it('reuses existing tag when called with different case', async () => {
    mockTag.upsert.mockResolvedValue(sampleTag as never)
    mockEntryTag.upsert.mockResolvedValue({} as never)

    const result = await upsertTagAndAssign('TECH', 'entry-1')

    expect(result).toEqual(sampleTag)
    expect(mockTag.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { name: 'tech' },
        update: {},
      })
    )
  })

  it('assigns tag to entry via EntryTag upsert', async () => {
    mockTag.upsert.mockResolvedValue(sampleTag as never)
    mockEntryTag.upsert.mockResolvedValue({} as never)

    await upsertTagAndAssign('tech', 'entry-1')

    expect(mockEntryTag.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { entryId_tagId: { entryId: 'entry-1', tagId: 'tag-1' } },
        create: { entryId: 'entry-1', tagId: 'tag-1' },
        update: {},
      })
    )
  })

  it('returns the tag object', async () => {
    mockTag.upsert.mockResolvedValue(sampleTag as never)
    mockEntryTag.upsert.mockResolvedValue({} as never)

    const result = await upsertTagAndAssign('tech', 'entry-1')

    expect(result).toEqual(sampleTag)
  })
})

describe('removeTagFromEntry', () => {
  it('deletes EntryTag record only (not the Tag itself)', async () => {
    mockEntryTag.delete.mockResolvedValue({} as never)

    await removeTagFromEntry('tag-1', 'entry-1')

    expect(mockEntryTag.delete).toHaveBeenCalledWith({
      where: { entryId_tagId: { entryId: 'entry-1', tagId: 'tag-1' } },
    })
    expect(mockTag.upsert).not.toHaveBeenCalled()
  })

  it('returns void', async () => {
    mockEntryTag.delete.mockResolvedValue({} as never)

    const result = await removeTagFromEntry('tag-1', 'entry-1')

    expect(result).toBeUndefined()
  })
})

describe('getAllTags', () => {
  it('returns all tags ordered by name asc', async () => {
    const tags = [
      { id: 'tag-1', name: 'apple', createdAt: new Date() },
      { id: 'tag-2', name: 'banana', createdAt: new Date() },
    ]
    mockTag.findMany.mockResolvedValue(tags as never)

    const result = await getAllTags()

    expect(result).toEqual(tags)
    expect(mockTag.findMany).toHaveBeenCalledWith({ orderBy: { name: 'asc' } })
  })

  it('returns empty array when no tags exist', async () => {
    mockTag.findMany.mockResolvedValue([] as never)

    const result = await getAllTags()

    expect(result).toEqual([])
  })
})
