'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Rss, Tags, Trash2 } from 'lucide-react'
import Link from 'next/link'
import type { EntryDetail, EntryListItem, EntryListQuery, EntryMeta, UpdateEntryMetaInput } from '@/domain/entry/entry'
import { useEntryPagination } from '@/features/entry-viewing/lib/use-entry-pagination'
import dynamic from 'next/dynamic'
import { EntryCard } from '@/features/entry-viewing/components/entry-card'
import { BulkTagBar } from '@/features/tag-management/components/bulk-tag-bar'
import { Button } from '@/components/ui/button'

const ArticleModal = dynamic(
  () => import('@/features/entry-viewing/components/article-modal').then((m) => m.ArticleModal),
  { ssr: false }
)

// meta が未作成（null）のエントリーにもパッチを反映できるよう、必要なフィールドを補って生成する。
// meta が null = 未読/あとで読む未登録 という意味なので、isRead/isReadLater 以外はダミー値でよい。
function applyMetaPatch(entry: EntryListItem, patch: UpdateEntryMetaInput): EntryListItem {
  const meta: EntryMeta = entry.meta
    ? { ...entry.meta, ...patch }
    : {
        id: '',
        entryId: entry.id,
        isRead: false,
        isReadLater: false,
        createdAt: entry.createdAt,
        updatedAt: entry.createdAt,
        ...patch,
      }
  return { ...entry, meta }
}

interface Pagination {
  page: number
  limit: number
  total: number
  hasNext: boolean
  hasPrev: boolean
}

interface EntryCardGridProps {
  initialEntries: EntryListItem[]
  initialPagination: Pagination
  /**
   * 初回取得（サーバ側）に使ったのとまったく同じ絞り込み条件。
   * 追加読み込みはこの記述子をそのまま API に送るため、条件をここに集約しておかないと
   * 「初回は古い順・追加分は新しい順」のような食い違いが起きる。
   */
  query: EntryListQuery
  basePath?: string
  allTags: Array<{ id: string; name: string; createdAt: Date; entryCount: number }>
}

export function EntryCardGrid({
  initialEntries,
  initialPagination,
  query,
  basePath = '/',
  allTags,
}: EntryCardGridProps) {
  const router = useRouter()
  const { isUnread, isReadLater } = query
  const isPreferred = Boolean(query.userPreferenceId || query.isAnyPreferred)

  const [entries, setEntries] = useState<EntryListItem[]>(initialEntries)
  const sentinelRef = useRef<HTMLDivElement>(null)
  // 取得済み id の算出用。entries を直接 useCallback の依存に入れると
  // 記事一覧が更新されるたびに loadMore(延いては IntersectionObserver) が
  // 作り直されてしまうため、ref 経由で最新値だけを参照する。
  const entriesRef = useRef(entries)
  useEffect(() => { entriesRef.current = entries }, [entries])

  const [navEntries, setNavEntries] = useState<EntryListItem[]>([])
  const navEntriesRef = useRef(navEntries)
  useEffect(() => { navEntriesRef.current = navEntries }, [navEntries])
  const [pendingNavigateNext, setPendingNavigateNext] = useState(false)
  const hasNavSnapshotRef = useRef(false)

  // モーダル表示中（開始〜終了、prev/next での遷移も含む）は背後の一覧を更新せず、
  // 発生した変更（既読/あとで読むの切り替え、ページ送りで新たに読み込んだ記事）を
  // ここに溜めておき、モーダルが閉じたタイミングでまとめて反映する。
  const isModalOpenRef = useRef(false)
  const pendingMetaPatchesRef = useRef<Map<string, UpdateEntryMetaInput>>(new Map())
  const pendingAppendEntriesRef = useRef<EntryListItem[]>([])

  const prefetchCacheRef = useRef<Map<string, EntryDetail>>(new Map())
  const prefetchingRef = useRef<Set<string>>(new Set())

  // 一覧の無限スクロール
  const { hasMore, isLoading, loadMore } = useEntryPagination({
    query,
    limit: initialPagination.limit,
    initialHasMore: initialPagination.hasNext,
    initialCursorId: initialEntries[initialEntries.length - 1]?.id,
    // モーダル表示中の追加分（バッファ）も既知として扱わないと、一覧に反映される前の
    // 記事を毎回「新着」と見なしてしまいカーソルが進まない。
    getKnownIds: () =>
      new Set([
        ...entriesRef.current.map((e) => e.id),
        ...pendingAppendEntriesRef.current.map((e) => e.id),
      ]),
    onLoaded: (newEntries) => {
      if (isModalOpenRef.current) {
        pendingAppendEntriesRef.current.push(...newEntries)
        return
      }
      setEntries((prev) => {
        const existingIds = new Set(prev.map((e) => e.id))
        const toAppend = newEntries.filter((e) => !existingIds.has(e.id))
        return toAppend.length > 0 ? [...prev, ...toAppend] : prev
      })
    },
  })

  // モーダルの「次の記事」送り。一覧とは別のスナップショットを進める
  const {
    hasMore: navHasMore,
    isLoading: isNavLoading,
    loadMore: loadNavMore,
    reset: resetNavPagination,
  } = useEntryPagination({
    query,
    limit: initialPagination.limit,
    initialHasMore: false,
    getKnownIds: () => new Set(navEntriesRef.current.map((e) => e.id)),
    onLoaded: (newEntries) => {
      setNavEntries((prev) => {
        const existingIds = new Set(prev.map((e) => e.id))
        return [...prev, ...newEntries.filter((e) => !existingIds.has(e.id))]
      })
      // モーダル表示中は背後の一覧を直接更新せず、閉じた時にまとめて反映できるよう退避する。
      const existingIds = new Set(entriesRef.current.map((e) => e.id))
      pendingAppendEntriesRef.current.push(...newEntries.filter((e) => !existingIds.has(e.id)))
    },
  })

  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)

  useEffect(() => {
    // Reads window.location on mount to restore the modal from the URL; deferring to an
    // effect (vs. lazy init) avoids a hydration mismatch against the server-rendered null.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedEntryId(new URLSearchParams(window.location.search).get('entryId'))
  }, [])

  useEffect(() => {
    const onPopState = () => {
      setSelectedEntryId(new URLSearchParams(window.location.search).get('entryId'))
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navIndex = selectedEntryId ? navEntries.findIndex((e) => e.id === selectedEntryId) : -1

  useEffect(() => {
    if (selectedEntryId && !hasNavSnapshotRef.current) {
      hasNavSnapshotRef.current = true
      isModalOpenRef.current = true
      setNavEntries([...entries])
      resetNavPagination({ cursorId: entries[entries.length - 1]?.id, hasMore })
    } else if (!selectedEntryId && hasNavSnapshotRef.current) {
      hasNavSnapshotRef.current = false
      setNavEntries([])
      resetNavPagination({ hasMore: false })
      setPendingNavigateNext(false)
      prefetchCacheRef.current.clear()
      prefetchingRef.current.clear()

      // モーダル表示中に溜めておいた変更をここでまとめて反映し、
      // 現在のフィルタ（未読のみ／あとで読む）を適用し直す。
      isModalOpenRef.current = false
      // setEntries の更新関数は非同期に実行されるため、ref をそのまま渡すと
      // 直後の clear() が先に効いてしまう。呼び出し時点の内容をコピーして使う。
      const metaPatches = new Map(pendingMetaPatchesRef.current)
      const appended = pendingAppendEntriesRef.current
      pendingMetaPatchesRef.current = new Map()
      pendingAppendEntriesRef.current = []
      setEntries((prev) => {
        let next = prev
        if (appended.length > 0) {
          const existingIds = new Set(next.map((e) => e.id))
          const toAppend = appended.filter((e) => !existingIds.has(e.id))
          if (toAppend.length > 0) next = [...next, ...toAppend]
        }
        if (metaPatches.size > 0) {
          next = next.map((entry) => {
            const patch = metaPatches.get(entry.id)
            return patch ? applyMetaPatch(entry, patch) : entry
          })
        }
        if (isUnread) next = next.filter((entry) => !entry.meta?.isRead)
        if (isReadLater) next = next.filter((entry) => entry.meta?.isReadLater)
        return next
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEntryId, isUnread, isReadLater])

  useEffect(() => {
    const markRead = (e: Event) => {
      const { entryId: readEntryId } = (e as CustomEvent<{ entryId: string; feedId: string }>).detail
      // 事前取得キャッシュに残った古い既読状態を、モーダルで再訪した時に見せてしまわないよう破棄する
      prefetchCacheRef.current.delete(readEntryId)
      if (isModalOpenRef.current) {
        pendingMetaPatchesRef.current.set(readEntryId, {
          ...pendingMetaPatchesRef.current.get(readEntryId),
          isRead: true,
        })
        return
      }
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === readEntryId
            ? { ...entry, meta: entry.meta ? { ...entry.meta, isRead: true } : null }
            : entry
        )
      )
    }
    const markUnread = (e: Event) => {
      const { entryId: readEntryId } = (e as CustomEvent<{ entryId: string; feedId: string }>).detail
      prefetchCacheRef.current.delete(readEntryId)
      if (isModalOpenRef.current) {
        pendingMetaPatchesRef.current.set(readEntryId, {
          ...pendingMetaPatchesRef.current.get(readEntryId),
          isRead: false,
        })
        return
      }
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === readEntryId
            ? { ...entry, meta: entry.meta ? { ...entry.meta, isRead: false } : null }
            : entry
        )
      )
    }
    window.addEventListener('entry:read', markRead)
    window.addEventListener('entry:unread', markUnread)
    return () => {
      window.removeEventListener('entry:read', markRead)
      window.removeEventListener('entry:unread', markUnread)
    }
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const { entryId: updatedId } = (e as CustomEvent<{ entryId: string; tags: unknown[] }>).detail
      prefetchCacheRef.current.delete(updatedId)
    }
    window.addEventListener('entry:tags-updated', handler)
    return () => window.removeEventListener('entry:tags-updated', handler)
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const { entryId: updatedId, isReadLater: newIsReadLater } = (
        e as CustomEvent<{ entryId: string; isReadLater: boolean }>
      ).detail
      prefetchCacheRef.current.delete(updatedId)
      if (isModalOpenRef.current) {
        pendingMetaPatchesRef.current.set(updatedId, {
          ...pendingMetaPatchesRef.current.get(updatedId),
          isReadLater: newIsReadLater,
        })
        return
      }
      if (isReadLater && !newIsReadLater) {
        setEntries((prev) => prev.filter((entry) => entry.id !== updatedId))
      } else {
        setEntries((prev) =>
          prev.map((entry) =>
            entry.id === updatedId && entry.meta
              ? { ...entry, meta: { ...entry.meta, isReadLater: newIsReadLater } }
              : entry
          )
        )
      }
    }
    window.addEventListener('entry:updated', handler)
    return () => window.removeEventListener('entry:updated', handler)
  }, [isReadLater])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (observations) => { if (observations[0].isIntersecting) loadMore() },
      { rootMargin: '200px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  // isLoading / entries.length を依存に含めるのは、読み込みが終わるたびに
  // IntersectionObserver を作り直させるため。observe() 呼び出しは現在の交差状態を即座に
  // 通知するので、これがビューポート内にセンチネルが留まったまま次ページを連続で読み込む
  // 仕組みになる。モーダル表示中は取得分がバッファに入って entries.length が変わらないため、
  // isLoading の立ち下がりが唯一の再観測トリガーになる。
  // entries を丸ごと依存に入れると既読トグル等の更新でも作り直しが走るため length のみ見る。
  }, [loadMore, isLoading, entries.length])

  useEffect(() => {
    if (!selectedEntryId || navEntries.length === 0 || navIndex === -1) return
    const ids: string[] = []
    if (navIndex > 0) ids.push(navEntries[navIndex - 1].id)
    if (navIndex < navEntries.length - 1) ids.push(navEntries[navIndex + 1].id)
    for (const id of ids) {
      if (prefetchCacheRef.current.has(id) || prefetchingRef.current.has(id)) continue
      prefetchingRef.current.add(id)
      fetch(`/api/entries/${id}`)
        .then((r) => r.json())
        .then((json) => { if (json.success) prefetchCacheRef.current.set(id, json.data) })
        .catch(() => {})
        .finally(() => prefetchingRef.current.delete(id))
    }
  }, [navIndex, navEntries, selectedEntryId])

  useEffect(() => {
    if (!selectedEntryId || !navHasMore || isNavLoading || navEntries.length === 0) return
    // Fetches more entries when nav reaches the end of what's loaded; state updates happen
    // inside loadMore's own async continuation, not synchronously here.
    if (navIndex === navEntries.length - 1) loadNavMore()
  }, [navIndex, navEntries.length, navHasMore, isNavLoading, loadNavMore, selectedEntryId])

  useEffect(() => {
    if (!pendingNavigateNext || navEntries.length === 0) return
    const currentIndex = navEntries.findIndex((e) => e.id === selectedEntryId)
    if (currentIndex < navEntries.length - 1) {
      // Waits on navEntries growing after an async loadNavMore() fetch, then performs the
      // deferred navigation (history + selection) — genuinely effect-worthy, not derivable at render time.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPendingNavigateNext(false)
      const nextId = navEntries[currentIndex + 1].id
      const params = new URLSearchParams(window.location.search)
      params.set('entryId', nextId)
      window.history.pushState(null, '', `${basePath}?${params.toString()}`)
      setSelectedEntryId(nextId)
    }
  }, [navEntries, pendingNavigateNext, selectedEntryId, basePath])

  const enterSelectionMode = () => { setIsSelectionMode(true); setSelectedIds(new Set()) }
  const exitSelectionMode = () => { setIsSelectionMode(false); setSelectedIds(new Set()) }

  const toggleSelectEntry = useCallback((entryId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(entryId)) next.delete(entryId)
      else next.add(entryId)
      return next
    })
  }, [])

  const selectAll = useCallback(() => setSelectedIds(new Set(entries.map((e) => e.id))), [entries])
  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const applyBatchTag = useCallback(async (tagName: string) => {
    if (selectedIds.size === 0) return
    const res = await fetch('/api/tags/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: tagName, entryIds: Array.from(selectedIds) }),
    })
    if (res.ok) {
      const { data } = await res.json()
      window.dispatchEvent(new CustomEvent('entry:tags-updated', { detail: { entryId: null, tags: [], batchTagId: data.id } }))
    }
  }, [selectedIds])

  const openEntry = useCallback((entryId: string) => {
    const params = new URLSearchParams(window.location.search)
    params.set('entryId', entryId)
    window.history.pushState(null, '', `${basePath}?${params.toString()}`)
    setSelectedEntryId(entryId)
  }, [basePath])

  const handleToggleRead = useCallback((entryId: string, newIsRead: boolean) => {
    setEntries((prev) =>
      prev.map((e) => e.id === entryId ? { ...e, meta: e.meta ? { ...e.meta, isRead: newIsRead } : null } : e)
    )
  }, [])

  const closeEntry = () => {
    const params = new URLSearchParams(window.location.search)
    params.delete('entryId')
    window.history.pushState(null, '', `${basePath}?${params.toString()}`)
    setSelectedEntryId(null)
  }

  const goToPrev = () => { if (navIndex > 0) openEntry(navEntries[navIndex - 1].id) }
  const goToNext = () => {
    if (navIndex < navEntries.length - 1) {
      openEntry(navEntries[navIndex + 1].id)
    } else if (navHasMore) {
      setPendingNavigateNext(true)
      loadNavMore()
    }
  }

  if (entries.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Rss className="h-10 w-10 text-muted-foreground/20 mb-4" />
        <p className="text-sm text-muted-foreground mb-3">
          {isReadLater
            ? '「あとで読む」に追加した記事はありません'
            : isPreferred
              ? 'お好みの記事はありません'
              : isUnread
                ? '未読の記事はありません'
                : '記事がありません'}
        </p>
        {!isReadLater && !isPreferred && !query.tagId && (
          <Link href="/feeds/new" className="text-xs text-primary hover:underline">
            フィードを追加する
          </Link>
        )}
        {query.tagId && (
          <button
            onClick={async () => {
              const res = await fetch(`/api/tags/${query.tagId}`, { method: 'DELETE' })
              if (res.ok) {
                window.dispatchEvent(new Event('tag:deleted'))
                router.push('/')
              }
            }}
            className="flex items-center gap-1.5 text-xs text-destructive hover:underline mt-1"
          >
            <Trash2 className="h-3 w-3" />
            このタグを削除する
          </button>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Selection mode toggle */}
      <div className="flex justify-end px-4 pt-2 pb-0">
        {isSelectionMode ? (
          <span className="text-xs text-muted-foreground py-1">クリックして記事を選択</span>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={enterSelectionMode}
            className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5"
          >
            <Tags className="h-3.5 w-3.5" />
            一括タグ付け
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-3 sm:gap-4 sm:p-4">
        {entries.map((entry) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            isSelected={!isSelectionMode && selectedEntryId === entry.id}
            onClick={openEntry}
            onToggleRead={handleToggleRead}
            isSelectionMode={isSelectionMode}
            isChecked={selectedIds.has(entry.id)}
            onToggleSelect={toggleSelectEntry}
          />
        ))}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-4" />

      {isLoading && (
        <div className="flex justify-center py-6">
          <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      )}

      {/* Article modal */}
      {selectedEntryId && !isSelectionMode && (
        <ArticleModal
          entryId={selectedEntryId}
          // Prefetch cache is a ref by design so background prefetch fills don't re-render the
          // whole grid; a miss just falls back to ArticleModal's own fetch, so a stale read is harmless.
          // eslint-disable-next-line react-hooks/refs
          prefetchedEntry={prefetchCacheRef.current.get(selectedEntryId) ?? null}
          allTags={allTags}
          hasPrev={navIndex > 0}
          hasNext={navIndex < navEntries.length - 1 || navHasMore}
          onClose={closeEntry}
          onPrev={goToPrev}
          onNext={goToNext}
        />
      )}

      {/* Bulk tag bar (shown in selection mode) */}
      {isSelectionMode && (
        <BulkTagBar
          selectedCount={selectedIds.size}
          totalCount={entries.length}
          allTags={allTags}
          onApplyTag={applyBatchTag}
          onSelectAll={selectAll}
          onClearSelection={clearSelection}
          onExitSelectionMode={exitSelectionMode}
        />
      )}
    </>
  )
}
