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
 * - `/api/entries?...`  → loadNavMore のページネーションリクエスト（pages 配列を順に返す）
 * - `/api/entries/:id`  → 隣接エントリのプリフェッチリクエスト（常に成功を返す）
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
    // ページネーション取得（loadNavMore）
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

beforeEach(() => {
  // jsdom では IntersectionObserver が未実装なのでスタブ化
  // アロー関数は new で呼べないため class を使う
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
    },
  )
  // pushState を spy して URL 実更新によるエラーを防ぐ
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
    // Arrange
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

    // Act: 唯一の記事をクリックしてモーダルを開く
    fireEvent.click(screen.getByText('Article entry-1'))

    // Assert: モーダルが開き「次の記事」ボタンは無効のまま
    await waitFor(() => {
      expect(screen.getByTestId('article-modal')).toBeTruthy()
    })
    expect(screen.getByRole('button', { name: '次の記事' })).toBeDisabled()
    // 後続ページの fetch が一切呼ばれていないことも確認
    const paginationCalls = fetchSpy.mock.calls.filter(
      (args: unknown[]) =>
        typeof args[0] === 'string' && (args[0] as string).includes('/api/entries?'),
    )
    expect(paginationCalls).toHaveLength(0)
  })

  it('【2ページ】1ページ目の最後の記事をモーダル表示すると、次のページが自動読み込みされ「次の記事」ボタンが押せる', async () => {
    // Arrange
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

    // Act: 1ページ目唯一の記事（= ページ内最後）をクリックしてモーダルを開く
    fireEvent.click(screen.getByText('Article entry-1'))

    // Assert: 2ページ目が自動読み込みされ、「次の記事」ボタンが有効になる
    await waitFor(() => {
      expect(screen.getByTestId('article-modal')).toBeTruthy()
      expect(screen.getByRole('button', { name: '次の記事' })).not.toBeDisabled()
    })
  })

  it('【3ページ】2ページ目の最後の記事をモーダル表示すると「次の記事」ボタンが押せ、押すと次の記事に遷移できる', async () => {
    // Arrange
    const entry1 = makeEntry('entry-1')
    const entry2 = makeEntry('entry-2')
    const entry3 = makeEntry('entry-3')
    vi.stubGlobal(
      'fetch',
      stubFetch([
        { entries: [entry2], hasNext: true },  // loadNavMore — page 2
        { entries: [entry3], hasNext: false }, // loadNavMore — page 3
      ]),
    )

    render(
      <EntryCardGrid
        initialEntries={[entry1]}
        initialPagination={makePagination(1, 3)}
        allTags={allTags}
      />,
    )

    // Act 1: entry-1 を開く → page 2 が自動読み込みされるまで待つ
    fireEvent.click(screen.getByText('Article entry-1'))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '次の記事' })).not.toBeDisabled()
    })

    // Act 2: 「次の記事」で entry-2（2ページ目）に進む
    fireEvent.click(screen.getByRole('button', { name: '次の記事' }))

    // Assert 1: entry-2 を表示中、3ページ目が自動読み込みされ「次の記事」ボタンが有効
    //   entry-2 はそのときの navEntries 末尾なので loadNavMore が発火する
    await waitFor(() => {
      expect(screen.getByTestId('article-modal').dataset.entryId).toBe('entry-2')
      expect(screen.getByRole('button', { name: '次の記事' })).not.toBeDisabled()
    })

    // Act 3: さらに「次の記事」を押して entry-3 へ遷移する
    fireEvent.click(screen.getByRole('button', { name: '次の記事' }))

    // Assert 2: entry-3 への遷移が成功した（「次の記事」ボタンが押せた）
    await waitFor(() => {
      expect(screen.getByTestId('article-modal').dataset.entryId).toBe('entry-3')
    })
  })
})
