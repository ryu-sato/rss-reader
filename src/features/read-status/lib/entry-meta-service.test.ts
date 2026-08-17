import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'

vi.mock('@/domain/shared/db', () => ({
  prisma: {
    entry: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    entryMeta: {
      upsert: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

import { prisma } from '@/domain/shared/db'
import { updateEntryMeta } from './entry-meta-service'

const mockEntry = prisma.entry as unknown as Record<'findMany' | 'findUnique', Mock>
const mockEntryMeta = prisma.entryMeta as unknown as Record<'findUnique' | 'upsert', Mock>

beforeEach(() => {
  vi.clearAllMocks()
})

describe('updateEntryMeta', () => {
  const meta = {
    id: 'meta-1',
    entryId: 'entry-1',
    isRead: true,
    isReadLater: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  it('同一 link の全エントリに isRead を連動させる', async () => {
    mockEntry.findUnique.mockResolvedValue({ link: 'https://example.com/1' } as never)
    mockEntry.findMany.mockResolvedValue([{ id: 'entry-1' }, { id: 'entry-2' }] as never)
    mockEntryMeta.upsert.mockResolvedValue(meta as never)
    mockEntryMeta.findUnique.mockResolvedValue(meta as never)

    const result = await updateEntryMeta('entry-1', { isRead: true })

    expect(result).toEqual(meta)
    // 両方のエントリに upsert が呼ばれること
    expect(mockEntryMeta.upsert).toHaveBeenCalledTimes(2)
    expect(mockEntryMeta.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { entryId: 'entry-1' },
        create: expect.objectContaining({ isRead: true }),
        update: { isRead: true },
      })
    )
    expect(mockEntryMeta.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { entryId: 'entry-2' },
        create: expect.objectContaining({ isRead: true }),
        update: { isRead: true },
      })
    )
  })

  it('isReadLater のみの変更は同一 link に連動しない', async () => {
    mockEntryMeta.upsert.mockResolvedValue({ ...meta, isReadLater: true } as never)

    await updateEntryMeta('entry-1', { isReadLater: true })

    // entry を検索しない
    expect(mockEntry.findUnique).not.toHaveBeenCalled()
    expect(mockEntryMeta.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { isReadLater: true },
      })
    )
  })
})
