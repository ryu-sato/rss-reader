import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EntryCardGrid } from './entry-card-grid'
import type { EntryListItem } from '@/types/entry'

// ------------------------------------------------------------
// モック設定
// ------------------------------------------------------------

// ArticleModal のテスト代替 — hasNext/hasPrev の状態と現在の entryId を DOM に公開する
vi.mock('@/components/article-modal', () => ({
  ArticleModal: ({
    entryId,
    hasNext,
    hasPrev,
    onNext,
    onPrev,
    onClose,
  }: {
    entryId: string
    hasNext: boolean
    hasPrev: boolean
    onNext: () => void
    onPrev: () => void
    onClose: () => void
    allTags: unknown[]
    prefetchedEntry: unknown
  }) => (
    <div data-testid="article-modal" data-entry-id={entryId}>
      <button onClick={onPrev} disabled={!hasPrev} aria-label="前の記事" />
      <button onClick={onNext} disabled={!hasNext} aria-label="次の記事" />
      <button onClick={onClose} aria-label="閉じる" />
    </div>
  ),
}))

// next/dynamic:
//   entry-card-grid.tsx では `() => import('...').then(m => m.ArticleModal)` という形式で
//   dynamic() が呼ばれる。ローダーはコンポーネント関数を直接 resolve するため、
//   `typeof mod === 'function'` で判定して正しく React.lazy に渡す。
vi.mock('next/dynamic', () => ({
  default: (load: () => Promise<unknown>) => {
    const LazyComp = React.lazy(async () => {
      const mod = await load()
      const Comp =
        typeof mod === 'function'
          ? mod
          : ((mod as Record<string, unknown>).default ??
            Object.values(mod as Record<string, unknown>)[0])
      return { default: Comp as React.ComponentType<Record<string, unknown>> }
    })
    return function Dynamic(props: Record<string, unknown>) {
      return (
        <React.Suspense fallback={null}>
          <LazyComp {...props} />
        </React.Suspense>
      )
    }
  },
}))

// EntryCard のテスト代替 — next/image や Base UI Tooltip の jsdom 非互換を回避する
vi.mock('@/components/entry-card', () => ({
  EntryCard: ({
    entry,
    onClick,
  }: {
    entry: EntryListItem
    onClick: (id: string) => void
    isSelected?: boolean
    onToggleRead?: (id: string, isRead: boolean) => void
  }) => (
    <article role="button" onClick={() => onClick(entry.id)}>
      {entry.title}
    </article>
  ),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

// ------------------------------------------------------------
// ヘルパー
// ------------------------------------------------------------

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

function makePagination(page: number, total: number, limit = 1) {
  return {
    page,
    limit,
    total,
    hasNext: page * limit < total,
    hasPrev: page > 1,
  }
}

/**
 * fetch スタブ。
 * - `/api/entries?...`  → ページネーションリクエスト（loadMore / loadNavMore）を順に返す
 * - `/api/entries/:id`  → 隣接エントリのプリフェッチリクエスト（常に成功を返す）
 *
 * 実ブラウザでは loadMore（IntersectionObserver）と loadNavMore（モーダルナビ）の
 * 両方がページネーション API を呼ぶため、呼び出し順に pages 配列を消費する。
 */
function stubFetch(pages: { entries: EntryListItem[]; hasNext: boolean }[]) {
  let callIndex = 0
  return vi.fn().mockImplementation((url: string) => {
    if (!/\?/.test(url as string)) {
      // プリフェッチ（個別エントリ取得）
      const id = (url as string).split('/').pop()!
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              id,
              title: `Article ${id}`,
              feed: { id: 'feed-1', title: 'Test Blog' },
              tags: [],
              meta: null,
            },
          }),
      })
    }
    // ページネーション取得（loadMore または loadNavMore）
    const page = pages[callIndex] ?? pages[pages.length - 1]
    callIndex++
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          data: page.entries,
          pagination: {
            page: callIndex,
            limit: 1,
            total: pages.length + 1,
            hasNext: page.hasNext,
            hasPrev: callIndex > 1,
          },
        }),
    })
  })
}

const allTags: Array<{ id: string; name: string; createdAt: Date }> = []

/**
 * 実ブラウザに近い IntersectionObserver スタブ。
 *
 * observe() が呼ばれると非同期（マイクロタスク）でコールバックを発火する。
 * これにより、センチネルが常にビューポート内にある短いリスト（テストデータ）での
 * 挙動を再現する。実ブラウザでも要素が表示された直後に IO コールバックが発火するため、
 * モックなしに近い動作となる。
 *
 * disconnect() を呼ぶと pending のコールバックはキャンセルされる。
 */
class RealisticIntersectionObserver {
  private callback: (entries: IntersectionObserverEntry[]) => void
  private connected = false

  constructor(callback: (entries: IntersectionObserverEntry[]) => void) {
    this.callback = callback
  }

  observe(target: Element) {
    this.connected = true
    const cb = this.callback
    Promise.resolve().then(() => {
      if (this.connected) {
        cb([{ isIntersecting: true, target } as IntersectionObserverEntry])
      }
    })
  }

  unobserve() {
    this.connected = false
  }

  disconnect() {
    this.connected = false
  }

  takeRecords() {
    return []
  }
}

/**
 * センチネルがビューポート外にある状況を再現する IntersectionObserver スタブ。
 * observe() を呼んでもコールバックは発火しない（loadMore は動かない）。
 * スクロール不要で開けるモーダルの loadNavMore 専用パスをテストするために使用する。
 */
class NonIntersectingObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

beforeEach(() => {
  // デフォルト：実ブラウザに近い IO（センチネルが見えているケース）
  vi.stubGlobal('IntersectionObserver', RealisticIntersectionObserver)
  vi.spyOn(window.history, 'pushState').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

// ------------------------------------------------------------
// テスト
// ------------------------------------------------------------

describe('EntryCardGrid — モーダル表示中の追加読み込みと次へナビゲーション', () => {
  it('【1ページ】最後の記事をモーダル表示したとき、続きがないので「次の記事」ボタンが押せない', async () => {
    // Arrange: 追加ページなし（hasNext=false）
    const entry1 = makeEntry('entry-1')
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    render(
      <EntryCardGrid
        initialEntries={[entry1]}
        initialPagination={makePagination(1, 1)}
        allTags={allTags}
      />,
    )

    // IO が発火しても hasMore=false なので loadMore は即リターンする（fetch 呼ばれない）
    // Act: 唯一の記事をクリックしてモーダルを開く
    fireEvent.click(screen.getByText('Article entry-1'))

    // Assert: モーダルが開き「次の記事」ボタンは無効のまま
    await waitFor(() => {
      expect(screen.getByTestId('article-modal')).toBeTruthy()
    })
    expect(screen.getByRole('button', { name: '次の記事' })).toBeDisabled()

    // ページネーション fetch が一切呼ばれていないことも確認
    const paginationCalls = fetchSpy.mock.calls.filter(
      (args: unknown[]) =>
        typeof args[0] === 'string' && (args[0] as string).includes('/api/entries?'),
    )
    expect(paginationCalls).toHaveLength(0)
  })

  it('【2ページ／IO先読み】IO がページ2を先読みした後にモーダルを開くと「次の記事」ボタンが押せる', async () => {
    // Arrange: 2ページ構成。IO が発火 → loadMore がページ2を取得。
    const entry1 = makeEntry('entry-1')
    const entry2 = makeEntry('entry-2')
    vi.stubGlobal('fetch', stubFetch([{ entries: [entry2], hasNext: false }]))

    render(
      <EntryCardGrid
        initialEntries={[entry1]}
        initialPagination={makePagination(1, 2)}
        allTags={allTags}
      />,
    )

    // IO（loadMore）がページ2を取得し entry-2 がカードグリッドに現れるまで待つ。
    // 実ブラウザでも短いリストではセンチネルが即座にビューポートに入り先読みされる。
    await waitFor(() => {
      expect(screen.getByText('Article entry-2')).toBeTruthy()
    })

    // Act: entry-1 をクリックしてモーダルを開く
    fireEvent.click(screen.getByText('Article entry-1'))

    // Assert: スナップショットに entry-2 が含まれているため「次の記事」が有効
    await waitFor(() => {
      expect(screen.getByTestId('article-modal')).toBeTruthy()
      expect(screen.getByRole('button', { name: '次の記事' })).not.toBeDisabled()
    })
  })

  it('【3ページ／IO先読み】IO が全ページを先読みした後にモーダルナビゲーションで最後まで遷移できる', async () => {
    // Arrange: 3ページ構成。IO カスケードで全ページを先読みする。
    const entry1 = makeEntry('entry-1')
    const entry2 = makeEntry('entry-2')
    const entry3 = makeEntry('entry-3')
    vi.stubGlobal(
      'fetch',
      stubFetch([
        { entries: [entry2], hasNext: true },  // loadMore — ページ2
        { entries: [entry3], hasNext: false }, // loadMore — ページ3
      ]),
    )

    render(
      <EntryCardGrid
        initialEntries={[entry1]}
        initialPagination={makePagination(1, 3)}
        allTags={allTags}
      />,
    )

    // IO カスケードで全エントリーが読み込まれるまで待つ
    await waitFor(() => {
      expect(screen.getByText('Article entry-3')).toBeTruthy()
    })

    // Act 1: entry-1 を開く
    fireEvent.click(screen.getByText('Article entry-1'))
    await waitFor(() => {
      expect(screen.getByTestId('article-modal')).toBeTruthy()
      expect(screen.getByRole('button', { name: '次の記事' })).not.toBeDisabled()
    })

    // Act 2: 「次の記事」で entry-2 へ進む
    fireEvent.click(screen.getByRole('button', { name: '次の記事' }))
    await waitFor(() => {
      expect(screen.getByTestId('article-modal').dataset.entryId).toBe('entry-2')
      expect(screen.getByRole('button', { name: '次の記事' })).not.toBeDisabled()
    })

    // Act 3: さらに entry-3 へ遷移する
    fireEvent.click(screen.getByRole('button', { name: '次の記事' }))
    await waitFor(() => {
      expect(screen.getByTestId('article-modal').dataset.entryId).toBe('entry-3')
    })
  })

  it('【2ページ／loadNavMore】センチネルが見えない状況では loadNavMore がモーダル表示時に追加読み込みする', async () => {
    // Arrange: IO を発火しないスタブに切り替える（センチネルがビューポート外のケース）。
    // 実ブラウザでも 20件以上のリストではセンチネルが画面外にあり IO は即座に発火しない。
    vi.stubGlobal('IntersectionObserver', NonIntersectingObserver)

    const entry1 = makeEntry('entry-1')
    const entry2 = makeEntry('entry-2')
    vi.stubGlobal('fetch', stubFetch([{ entries: [entry2], hasNext: false }]))

    render(
      <EntryCardGrid
        initialEntries={[entry1]}
        initialPagination={makePagination(1, 2)}
        allTags={allTags}
      />,
    )

    // IO は発火しないので entry-2 はまだカードグリッドに存在しない状態でモーダルを開く
    fireEvent.click(screen.getByText('Article entry-1'))

    // loadNavMore が自動的に発火してページ2を取得し、「次の記事」が有効になるまで待つ
    await waitFor(() => {
      expect(screen.getByTestId('article-modal')).toBeTruthy()
      expect(screen.getByRole('button', { name: '次の記事' })).not.toBeDisabled()
    })
  })

  it('【3ページ／loadNavMore】センチネルが見えない状況でも loadNavMore が段階的に追加読み込みしてナビゲーションできる', async () => {
    // Arrange: IO 発火なし（センチネルがビューポート外）
    vi.stubGlobal('IntersectionObserver', NonIntersectingObserver)

    const entry1 = makeEntry('entry-1')
    const entry2 = makeEntry('entry-2')
    const entry3 = makeEntry('entry-3')
    vi.stubGlobal(
      'fetch',
      stubFetch([
        { entries: [entry2], hasNext: true },  // loadNavMore — ページ2
        { entries: [entry3], hasNext: false }, // loadNavMore — ページ3
      ]),
    )

    render(
      <EntryCardGrid
        initialEntries={[entry1]}
        initialPagination={makePagination(1, 3)}
        allTags={allTags}
      />,
    )

    // Act 1: entry-1 を開く → loadNavMore が発火してページ2を取得
    fireEvent.click(screen.getByText('Article entry-1'))
    await waitFor(() => {
      expect(screen.getByTestId('article-modal')).toBeTruthy()
      expect(screen.getByRole('button', { name: '次の記事' })).not.toBeDisabled()
    })

    // Act 2: 「次の記事」で entry-2 へ進む → entry-2 がナビ末尾なので loadNavMore が発火してページ3を取得
    fireEvent.click(screen.getByRole('button', { name: '次の記事' }))
    await waitFor(() => {
      expect(screen.getByTestId('article-modal').dataset.entryId).toBe('entry-2')
      expect(screen.getByRole('button', { name: '次の記事' })).not.toBeDisabled()
    })

    // Act 3: さらに entry-3 へ遷移する
    fireEvent.click(screen.getByRole('button', { name: '次の記事' }))
    await waitFor(() => {
      expect(screen.getByTestId('article-modal').dataset.entryId).toBe('entry-3')
    })
  })
})
