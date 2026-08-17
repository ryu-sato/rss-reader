import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useEntryPagination } from './use-entry-pagination'
import type { EntryListItem, EntryListQuery } from '@/domain/entry/entry'

function makeEntry(id: string): EntryListItem {
  return {
    id,
    title: `Article ${id}`,
    link: `https://example.com/${id}`,
    imageUrl: null,
    publishedAt: new Date('2026-01-01'),
    createdAt: new Date('2026-01-01'),
    feed: { id: 'feed-1', title: 'Test Blog' },
    meta: null,
  }
}

/** afterId ごとに応答を返す fetch スタブ。呼ばれた afterId の履歴も記録する */
function stubFetch(pages: Record<string, { entries: EntryListItem[]; hasNext: boolean }>) {
  const afterIds: (string | null)[] = []
  const fetchSpy = vi.fn(async (url: string) => {
    const searchParams = new URLSearchParams(url.split('?')[1] ?? '')
    const afterId = searchParams.get('afterId')
    afterIds.push(afterId)
    const page = pages[afterId ?? ''] ?? { entries: [], hasNext: false }
    return {
      ok: true,
      json: async () => ({ data: page.entries, pagination: { hasNext: page.hasNext } }),
    }
  })
  vi.stubGlobal('fetch', fetchSpy)
  return { fetchSpy, afterIds }
}

function setup(options: {
  query?: EntryListQuery
  initialCursorId?: string
  initialHasMore?: boolean
  loaded: EntryListItem[]
}) {
  const { query = {}, initialCursorId = 'entry-1', initialHasMore = true, loaded } = options
  return renderHook(() =>
    useEntryPagination({
      query,
      limit: 20,
      initialHasMore,
      initialCursorId,
      getKnownIds: () => new Set(loaded.map((e) => e.id)),
      onLoaded: (newEntries) => loaded.push(...newEntries),
    })
  )
}

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', class {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('useEntryPagination', () => {
  it('絞り込み条件をそのまま API に渡す（古い順が追加読み込みでも維持される）', async () => {
    const { fetchSpy } = stubFetch({})
    const { result } = setup({
      query: { isAnyPreferred: true, isUnread: true, scoreThreshold: 0.5, sortOrder: 'asc' },
      loaded: [makeEntry('entry-1')],
    })

    await act(async () => { await result.current.loadMore() })

    const searchParams = new URLSearchParams((fetchSpy.mock.calls[0][0] as string).split('?')[1])
    expect(searchParams.get('sortOrder')).toBe('asc')
    expect(searchParams.get('isAnyPreferred')).toBe('true')
    expect(searchParams.get('isUnread')).toBe('true')
    expect(searchParams.get('scoreThreshold')).toBe('0.5')
    expect(searchParams.get('afterId')).toBe('entry-1')
  })

  it('取得した記事の末尾までカーソルが進む', async () => {
    const { afterIds } = stubFetch({
      'entry-1': { entries: [makeEntry('entry-2'), makeEntry('entry-3')], hasNext: true },
      'entry-3': { entries: [makeEntry('entry-4')], hasNext: false },
    })
    const loaded = [makeEntry('entry-1')]
    const { result } = setup({ loaded })

    await act(async () => { await result.current.loadMore() })
    await act(async () => { await result.current.loadMore() })

    expect(afterIds).toEqual(['entry-1', 'entry-3'])
    expect(loaded.map((e) => e.id)).toEqual(['entry-1', 'entry-2', 'entry-3', 'entry-4'])
    await waitFor(() => expect(result.current.hasMore).toBe(false))
  })

  it('取得結果が既知の記事だけでも、応答の末尾を引き継いでカーソルが前進する', async () => {
    // 重複排除の代表エントリ入れ替わりなどで既出の記事しか返らないケース。
    // ここでカーソルが止まると同じページを取り続けて追加読み込みが死ぬ。
    const known = makeEntry('entry-2')
    const { afterIds } = stubFetch({
      'entry-1': { entries: [known], hasNext: true },
      'entry-2': { entries: [makeEntry('entry-3')], hasNext: false },
    })
    const loaded = [makeEntry('entry-1'), known]
    const { result } = setup({ loaded })

    await act(async () => { await result.current.loadMore() })
    await act(async () => { await result.current.loadMore() })

    expect(afterIds).toEqual(['entry-1', 'entry-2'])
    expect(loaded.map((e) => e.id)).toEqual(['entry-1', 'entry-2', 'entry-3'])
  })

  it('続きがなければ読み込みに行かない', async () => {
    const { fetchSpy } = stubFetch({})
    const { result } = setup({ initialHasMore: false, loaded: [makeEntry('entry-1')] })

    await act(async () => { await result.current.loadMore() })

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('reset で現在位置を差し替えられる（モーダルのナビ用スナップショット）', async () => {
    const { afterIds } = stubFetch({
      'entry-9': { entries: [makeEntry('entry-10')], hasNext: false },
    })
    const loaded = [makeEntry('entry-1')]
    const { result } = setup({ initialHasMore: false, loaded })

    act(() => { result.current.reset({ cursorId: 'entry-9', hasMore: true }) })
    await act(async () => { await result.current.loadMore() })

    expect(afterIds).toEqual(['entry-9'])
    expect(loaded.map((e) => e.id)).toContain('entry-10')
  })
})
