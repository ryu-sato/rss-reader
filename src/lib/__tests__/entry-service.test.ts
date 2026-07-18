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
    const now = Date.now();
    await prisma.entry.createMany({
      data: [
        // entry-1 の方を新しくして、重複排除後に残る側を一意に決める
        { id: 'entry-1', guid: 'guid-1', feedId: feed1.id, title: 'Entry 1', link: sameEntryLink, publishedAt: new Date(now), effectedDate: new Date(now) },
        { id: 'entry-2', guid: 'guid-2', feedId: feed2.id, title: 'Entry 2', link: sameEntryLink, publishedAt: new Date(now - 1000), effectedDate: new Date(now - 1000) },
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

  it('未読フィルタ＋カーソル(afterId)ページングでは、既読化で対象集合が縮んでも未読エントリを取りこぼさない', async () => {
    // Arrange: 未読エントリ5件（limit=2なら3ページに分かれる想定）。
    // effectedDate をずらして「新しい順」の並びを固定する。
    const feed1 = await prisma.feed.create({ data: { id: 'feed-1', url: 'http://example.com/feed1', title: 'Feed 1' } })
    const now = Date.now()
    const entriesData = Array.from({ length: 5 }, (_, i) => ({
      id: `entry-${i + 1}`,
      guid: `guid-${i + 1}`,
      feedId: feed1.id,
      title: `Entry ${i + 1}`,
      link: `http://example.com/${i + 1}`,
      publishedAt: new Date(now - i * 1000),
      effectedDate: new Date(now - i * 1000),
    }))
    await prisma.entry.createMany({ data: entriesData })
    for (const e of entriesData) {
      await prisma.entryMeta.create({ data: { entryId: e.id, isRead: false, isReadLater: false } })
    }

    const limit = 2
    const seen: string[] = []

    // 実際のモーダルの「開くと自動で既読になる」挙動を模倣するヘルパー
    const markRead = async (ids: string[]) => {
      for (const id of ids) {
        await prisma.entryMeta.update({ where: { entryId: id }, data: { isRead: true } })
      }
    }

    // Act: page1 → 既読化 → page2(afterIdカーソル) → 既読化 → page3(afterIdカーソル)
    let result = await findManyEntries({ isUnread: true, page: 1, limit })
    expect(result.entries).toHaveLength(2)
    seen.push(...result.entries.map((e) => e.id))
    await markRead(result.entries.map((e) => e.id))

    let afterId = result.entries[result.entries.length - 1].id
    result = await findManyEntries({ isUnread: true, page: 1, limit, afterId })
    expect(result.entries).toHaveLength(2)
    seen.push(...result.entries.map((e) => e.id))
    await markRead(result.entries.map((e) => e.id))

    afterId = result.entries[result.entries.length - 1].id
    result = await findManyEntries({ isUnread: true, page: 1, limit, afterId })
    expect(result.entries).toHaveLength(1)
    seen.push(...result.entries.map((e) => e.id))

    // Assert: hasNext は本当に読み切ったときだけ false になり、5件全てに一度ずつ到達している
    expect(result.pagination.hasNext).toBe(false)
    expect(seen.sort()).toEqual(['entry-1', 'entry-2', 'entry-3', 'entry-4', 'entry-5'])
  })

  it('feedId 未指定＋カーソル(afterId)ページングでも、ページ内の重複リンクは排除される', async () => {
    // Arrange: 同じ link を持つエントリ2件を含む3件。カーソルで取得したページの中でも
    // 重複排除(distinct)が効いていることを確認する(重複がページ境界をまたぐ場合の
    // 「代表エントリがページごとに変わり得る」という別の既知の制約は本テストの対象外)。
    const feed1 = await prisma.feed.create({ data: { id: 'feed-1', url: 'http://example.com/feed1', title: 'Feed 1' } })
    const feed2 = await prisma.feed.create({ data: { id: 'feed-2', url: 'http://example.com/feed2', title: 'Feed 2' } })
    const now = Date.now()
    await prisma.entry.createMany({
      data: [
        { id: 'entry-1', guid: 'guid-1', feedId: feed1.id, title: 'Entry 1', link: 'http://example.com/1', publishedAt: new Date(now), effectedDate: new Date(now) },
        { id: 'entry-2', guid: 'guid-2', feedId: feed1.id, title: 'Entry 2', link: 'http://example.com/dup', publishedAt: new Date(now - 1000), effectedDate: new Date(now - 1000) },
        { id: 'entry-3', guid: 'guid-3', feedId: feed2.id, title: 'Entry 3 (dup of 2)', link: 'http://example.com/dup', publishedAt: new Date(now - 1000), effectedDate: new Date(now - 1000) },
      ],
    })

    // Act: afterId=entry-1 でカーソル取得。entry-2/entry-3 は同一 link なので1件に集約される
    const page2 = await findManyEntries({ page: 1, limit: 10, afterId: 'entry-1' })

    // Assert
    expect(page2.entries).toHaveLength(1)
    expect(['entry-2', 'entry-3']).toContain(page2.entries[0].id)
    expect(page2.pagination.hasNext).toBe(false)
  })

  it('userPreferenceIdフィルタが指定されると、一定以上のscoreを持つエントリが取得される', async () => {
    // Arrange
    const feed1 = await prisma.feed.create({ data: { id: 'feed-1', url: 'http://example.com/feed1', title: 'Feed 1' } });
    await prisma.entry.createMany({
      data: [
        { id: 'entry-1', guid: 'guid-1', feedId: feed1.id, title: 'Entry 1', link: 'http://example.com/1', publishedAt: new Date(), effectedDate: new Date() },
        { id: 'entry-2', guid: 'guid-2', feedId: feed1.id, title: 'Entry 2', link: 'http://example.com/2', publishedAt: new Date(), effectedDate: new Date() },
      ],
    });
    const userPreference = await prisma.userPreference.create({ data: { id: 'user-1', text: 'Preference 1' } });
    await prisma.entryPreferenceScore.createMany({
      data: [
        { entryId: 'entry-1', preferenceId: userPreference.id, score: 0.8 },
        { entryId: 'entry-2', preferenceId: userPreference.id, score: 0.3 },
      ]});

    const page = 1;

    // Act
    const result = await findManyEntries({ userPreferenceId: userPreference.id, page });

    // Assert
    expect(result.entries.length).toEqual(1);
    expect(result.entries[0].id).toEqual('entry-1');
  })
})
