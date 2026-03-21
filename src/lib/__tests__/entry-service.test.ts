import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db';

import { findManyEntries } from '../entry-service'

describe('findManyEntries (Dedup / 全記事一覧モード)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('limit以上のエントリーがある場合、ページネーションされる', async () => {
    // Arrange
    const feed1 = await prisma.feed.create({ data: { id: 'feed-1', url: 'http://example.com/feed1', title: 'Feed 1' } })
    const entriesData = Array.from({ length: 3 }, (_, i) => ({
      id: `entry-${i + 1}`,
      guid: `guid-${i + 1}`,
      feedId: feed1.id,
      title: `Entry ${i + 1}`,
      link: `http://example.com/${i + 1}`,
      publishedAt: new Date(Date.now() - i * 1000), // 新しい順になるように
      effectedDate: new Date(Date.now() - i * 1000), // 新しい順になるように
    }))
    await prisma.entry.createMany({ data: entriesData })

    const page = 2;
    const limit = 1;

    // Act
    const result = await findManyEntries({ page, limit })

    // Assert
    expect(result.entries).toHaveLength(limit)
    expect(result.entries[0].id).toBe('entry-2') // 2番目のエントリーが取得されることを確認
    expect(result.pagination.page).toBe(page)
    expect(result.pagination.limit).toBe(limit)
    expect(result.pagination.total).toBe(3)
    expect(result.pagination.hasNext).toBe(true)
    expect(result.pagination.hasPrev).toBe(true)
  })

  it('feedId 未指定時は重複が排除される', async () => {
    // Arrange
    const feed1 = await prisma.feed.create({ data: { id: 'feed-1', url: 'http://example.com/feed1', title: 'Feed 1' } });
    const feed2 = await prisma.feed.create({ data: { id: 'feed-2', url: 'http://example.com/feed2', title: 'Feed 2' } });
    const sameEntryLink = 'http://example.com/same-link';
    await prisma.entry.createMany({
      data: [
        { id: 'entry-1', guid: 'guid-1', feedId: feed1.id, title: 'Entry 1', link: sameEntryLink, publishedAt: new Date(), effectedDate: new Date() },
        { id: 'entry-2', guid: 'guid-2', feedId: feed2.id, title: 'Entry 2', link: sameEntryLink, publishedAt: new Date(), effectedDate: new Date() },
      ],
    })

    const page = 1;

    // Act
    const result = await findManyEntries({ page });

    // Assert
    expect(result.entries.length).toEqual(1);
    expect(result.entries[0].id).toEqual('entry-1'); // 重複が削除されていることを確認する
  })

  it('検索フィルター（search）指定時、マッチしたエントリが取得される', async () => {
    // Arrange
    const feed1 = await prisma.feed.create({ data: { id: 'feed-1', url: 'http://example.com/feed1', title: 'Feed 1' } })
    await prisma.entry.createMany({
      data: [
        { id: 'entry-1', guid: 'guid-1', feedId: feed1.id, title: 'hello world', link: 'http://example.com/1', publishedAt: new Date(), effectedDate: new Date() },
        { id: 'entry-2', guid: 'guid-2', feedId: feed1.id, title: 'bye world', link: 'http://example.com/2', publishedAt: new Date(), effectedDate: new Date() },
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
        { id: 'entry-1', guid: 'guid-1', feedId: feed1.id, title: 'Entry 1', link: 'http://example.com/1', publishedAt: new Date(), effectedDate: new Date() },
        { id: 'entry-2', guid: 'guid-2', feedId: feed1.id, title: 'Entry 2', link: 'http://example.com/2', publishedAt: new Date(), effectedDate: new Date() },
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
        { id: 'entry-1', guid: 'guid-1', feedId: feed1.id, title: 'Entry 1', link: 'http://example.com/1', publishedAt: new Date(), effectedDate: new Date() },
        { id: 'entry-2', guid: 'guid-2', feedId: feed1.id, title: 'Entry 2', link: 'http://example.com/2', publishedAt: new Date(), effectedDate: new Date() },
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

  it('あとで読むフィルター指定時、該当エントリが取得される', async () => {
    // Arrange
    const feed1 = await prisma.feed.create({ data: { id: 'feed-1', url: 'http://example.com/feed1', title: 'Feed 1' } })
    await prisma.entry.createMany({
      data: [
        { id: 'entry-1', guid: 'guid-1', feedId: feed1.id, title: 'Entry 1', link: 'http://example.com/1', publishedAt: new Date(), effectedDate: new Date() },
        { id: 'entry-2', guid: 'guid-2', feedId: feed1.id, title: 'Entry 2', link: 'http://example.com/2', publishedAt: new Date(), effectedDate: new Date() },
      ],
    })
    await prisma.entryMeta.create({ data: { entryId: 'entry-1', isRead: true, isReadLater: true } })
    await prisma.entryMeta.create({ data: { entryId: 'entry-2', isRead: true, isReadLater: false } })

    const page = 1;

    // Act
    const result = await findManyEntries({ isReadLater: true, page })

    // Assert
    expect(result.entries.length).toEqual(1)
    expect(result.entries[0].id).toEqual('entry-1')
  })

  it('取得したエントリは publishedAt または createdAt でソートされる', async () => {
    // Arrange
    const feed1 = await prisma.feed.create({ data: { id: 'feed-1', url: 'http://example.com/feed1', title: 'Feed 1' } });
    const now = new Date();
    await prisma.entry.createMany({
      data: [
        { id: 'entry-1', guid: 'guid-1', feedId: feed1.id, title: 'Entry 1', link: 'http://example.com/1', publishedAt: new Date(now.getTime() - 1000), effectedDate: new Date(now.getTime() - 1000) },
        { id: 'entry-2', guid: 'guid-2', feedId: feed1.id, title: 'Entry 2', link: 'http://example.com/2', createdAt: new Date(now.getTime() - 500), effectedDate: new Date(now.getTime() - 500) },
        { id: 'entry-3', guid: 'guid-3', feedId: feed1.id, title: 'Entry 3', link: 'http://example.com/3', publishedAt: now, effectedDate: now },
      ],
    });

    const page = 1;

    // Act
    const result = await findManyEntries({ page })

    // Assert
    expect(result.entries).toHaveLength(3)
    // 結果の順序が publishedAt の順序（新しい順）と一致することを確認
    expect(result.entries[0].id).toBe('entry-3')
    expect(result.entries[1].id).toBe('entry-2')
    expect(result.entries[2].id).toBe('entry-1')
  })
})
