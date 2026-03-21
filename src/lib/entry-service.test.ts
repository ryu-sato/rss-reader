import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db';

import { findManyEntries } from './entry-service'
import { resumeToPipeableStream } from 'react-dom/server';

describe('findManyEntries (Dedup / 全記事一覧モード)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('feedId 未指定時は重複が排除される', async () => {
    // Arrange
    const feed1 = await prisma.feed.create({ data: { id: 'feed-1', url: 'http://example.com/feed1', title: 'Feed 1' } })
    const feed2 = await prisma.feed.create({ data: { id: 'feed-2', url: 'http://example.com/feed2', title: 'Feed 2' } })
    await prisma.entry.createMany({
      data: [
        { id: 'entry-1', guid: 'guid-1', feedId: feed1.id, title: 'Entry 1', link: 'http://example.com/1', publishedAt: new Date() },
        { id: 'entry-2', guid: 'guid-2', feedId: feed2.id, title: 'Entry 2', link: 'http://example.com/1', publishedAt: new Date() },
      ],
    })

    const page = 1

    // Act
    const result = await findManyEntries({ page })

    // Assert
    expect(result.entries.length).toEqual(1)
    expect(result.entries[0].id).toEqual('entry-1') // 重複が削除されていることを確認する
  })

  it('検索フィルター（search）指定時、マッチしたエントリが取得される', async () => {
    // Arrange
    const feed1 = await prisma.feed.create({ data: { id: 'feed-1', url: 'http://example.com/feed1', title: 'Feed 1' } })
    await prisma.entry.createMany({
      data: [
        { id: 'entry-1', guid: 'guid-1', feedId: feed1.id, title: 'hello world', link: 'http://example.com/1', publishedAt: new Date() },
        { id: 'entry-2', guid: 'guid-2', feedId: feed1.id, title: 'bye world', link: 'http://example.com/2', publishedAt: new Date() },
      ],
    })

    const searchKeyword = 'hello'
    const page = 1;

    // Act
    const result = await findManyEntries({ search: searchKeyword, page })

    // Assert
    expect(result.entries.length).toEqual(1)
    expect(result.entries[0].title).toEqual('hello world')
  })

  it('タグフィルター（tagId）指定時、1つでもタグが紐づくエントリが取得される', async () => {
    // Arrange
    const feed1 = await prisma.feed.create({ data: { id: 'feed-1', url: 'http://example.com/feed1', title: 'Feed 1' } })
    await prisma.entry.createMany({
      data: [
        { id: 'entry-1', guid: 'guid-1', feedId: feed1.id, title: 'Entry 1', link: 'http://example.com/1', publishedAt: new Date() },
        { id: 'entry-2', guid: 'guid-2', feedId: feed1.id, title: 'Entry 2', link: 'http://example.com/1', publishedAt: new Date() },
      ],
    })
    const tag1 = await prisma.tag.create({ data: { id: 'tag-123', name: 'Tag 123' } })
    const tag2 = await prisma.tag.create({ data: { id: 'tag-456', name: 'Tag 456' } })
    await prisma.entryTag.create({ data: { entryId: 'entry-1', tagId: tag1.id } })
    await prisma.entryTag.create({ data: { entryId: 'entry-1', tagId: tag2.id } })
    await prisma.entryTag.create({ data: { entryId: 'entry-2', tagId: tag2.id } })

    const targetTagId = 'tag-123'
    const page = 1;

    // Act
    const result = await findManyEntries({ tagId: targetTagId, page })

    // Assert
    expect(result.entries.length).toEqual(1)
    expect(result.entries[0].id).toEqual('entry-1')
  })

  it('未読フィルター指定時、未読エントリが取得される', async () => {
    // Arrange
    const feed1 = await prisma.feed.create({ data: { id: 'feed-1', url: 'http://example.com/feed1', title: 'Feed 1' } })
    await prisma.entry.createMany({
      data: [
        { id: 'entry-1', guid: 'guid-1', feedId: feed1.id, title: 'Entry 1', link: 'http://example.com/1', publishedAt: new Date() },
        { id: 'entry-2', guid: 'guid-2', feedId: feed1.id, title: 'Entry 2', link: 'http://example.com/1', publishedAt: new Date() },
      ],
    })
    await prisma.entryMeta.create({ data: { entryId: 'entry-1', isRead: false, isReadLater: false } })
    await prisma.entryMeta.create({ data: { entryId: 'entry-2', isRead: true, isReadLater: false } })

    const page = 1;

    // Act
    const result = await findManyEntries({ isUnread: true, page })

    // Assert
    expect(result.entries.length).toEqual(1)
    expect(result.entries[0].id).toEqual('entry-1')
  })

  // it('結果が空の場合、詳細取得（findMany）をスキップする', async () => {
  //   // Arrange
  //   mockQueryRawUnsafe.mockResolvedValueOnce([]) // IDが見つからない
  //   mockQueryRawUnsafe.mockResolvedValueOnce([{ count: BigInt(0) }])

  //   // Act
  //   const result = await findManyEntries({ page: 1, limit: 20 })

  //   // Assert
  //   expect(result.entries).toEqual([])
  //   expect(result.pagination.total).toBe(0)
  //   expect(mockEntryFindMany).not.toHaveBeenCalled()
  // })

  // it('取得したエントリは raw SQL の順序（effectiveDate順）でソートされる', async () => {
  //   // Arrange
  //   const rawIds = [{ id: '2' }, { id: '1' }, { id: '3' }]
  //   mockQueryRawUnsafe.mockResolvedValueOnce(rawIds)
  //   mockQueryRawUnsafe.mockResolvedValueOnce([{ count: BigInt(3) }])

  //   // findMany は順不同で返す可能性がある
  //   const fetchedEntries = [
  //     { id: '1', title: 'Entry 1' },
  //     { id: '2', title: 'Entry 2' },
  //     { id: '3', title: 'Entry 3' },
  //   ]
  //   mockEntryFindMany.mockResolvedValue(fetchedEntries as any)

  //   // Act
  //   const result = await findManyEntries({ page: 1, limit: 20 })

  //   // Assert
  //   expect(result.entries).toHaveLength(3)
  //   // 結果の順序が rawIds の順序（2, 1, 3）と一致することを確認
  //   expect(result.entries[0].id).toBe('2')
  //   expect(result.entries[1].id).toBe('1')
  //   expect(result.entries[2].id).toBe('3')
  // })
})
