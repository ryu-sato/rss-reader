'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Rss, Tags, Trash2 } from 'lucide-react'
import Link from 'next/link'
import type { Entry, EntryDetail, EntryListItem } from '@/types/entry'
import dynamic from 'next/dynamic'
import { EntryCard } from '@/components/entry-card'
import { BulkTagBar } from '@/components/bulk-tag-bar'
import { Button } from '@/components/ui/button'

const ArticleModal = dynamic(
  () => import('@/components/article-modal').then((m) => m.ArticleModal),
  { ssr: false }
)

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
  feedId?: string
  tagId?: string
  search?: string
  isReadLater?: boolean
  isUnread?: boolean
  isPreferred?: boolean
  userPreferenceId?: string
  isAnyPreferred?: boolean
  sortOrder?: 'asc' | 'desc'
  scoreThreshold?: number
  basePath?: string
  allTags: Array<{ id: string; name: string; createdAt: Date }>
}

export function EntryCardGrid({
  initialEntries,
  initialPagination,
  feedId,
  tagId,
  search,
  isReadLater,
  isUnread,
  isPreferred,
  userPreferenceId,
  isAnyPreferred,
  sortOrder,
  scoreThreshold,
  basePath = '/',
  allTags,
}: EntryCardGridProps) {
  const router = useRouter()

  // Card grid state (updated by events, reset when modal closes)
  const [entries, setEntries] = useState<EntryListItem[]>(initialEntries)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(initialPagination.hasNext)
  const [isLoading, setIsLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Navigation state - snapshot of entries at modal open time, only grows via loadNavMore.
  // Isolated from isRead/isReadLater changes so prev/next navigation stays stable.
  const [navEntries, setNavEntries] = useState<EntryListItem[]>([])
  const [navPage, setNavPage] = useState(1)
  const [navHasMore, setNavHasMore] = useState(false)
  const [isNavLoading, setIsNavLoading] = useState(false)
  const [pendingNavigateNext, setPendingNavigateNext] = useState(false)
  const hasNavSnapshotRef = useRef(false)

  // Prefetch cache for adjacent entry details
  const prefetchCacheRef = useRef<Map<string, EntryDetail>>(new Map())
  const prefetchingRef = useRef<Set<string>>(new Set())

  // Selection mode for batch tagging
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // entryId はローカル state で管理し、history.pushState で URL を更新する。
  // router.push を使うと Next.js ナビゲーションが発火して SSR が再実行されるため。
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)

  // マウント時に URL から entryId を読み込む
  useEffect(() => {
    setSelectedEntryId(new URLSearchParams(window.location.search).get('entryId'))
  }, [])

  // ブラウザの戻る/進む操作に追従する
  useEffect(() => {
    const onPopState = () => {
      setSelectedEntryId(new URLSearchParams(window.location.search).get('entryId'))
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navIndex = selectedEntryId ? navEntries.findIndex((e) => e.id === selectedEntryId) : -1

  // Reset when initial data changes, but only when modal is closed.
  useEffect(() => {
    if (!selectedEntryId) {
      setEntries(initialEntries)
      setPage(1)
      setHasMore(initialPagination.hasNext)
    }
  }, [initialEntries, initialPagination, selectedEntryId])

  // Snapshot entries into nav state when modal opens; clear when modal closes.
  // Nav list is intentionally not updated by entry:read/entry:updated events.
  useEffect(() => {
    if (selectedEntryId && !hasNavSnapshotRef.current) {
      hasNavSnapshotRef.current = true
      setNavEntries([...entries])
      setNavPage(page)
      setNavHasMore(hasMore)
    } else if (!selectedEntryId && hasNavSnapshotRef.current) {
      hasNavSnapshotRef.current = false
      setNavEntries([])
      setNavPage(1)
      setNavHasMore(false)
      setPendingNavigateNext(false)
      prefetchCacheRef.current.clear()
      prefetchingRef.current.clear()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEntryId])

  // Update card grid read state when an article is marked as read or unread
  useEffect(() => {
    const markRead = (e: Event) => {
      const { entryId: readEntryId } = (e as CustomEvent<{ entryId: string; feedId: string }>).detail
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

  // Invalidate prefetch cache when tags are updated so navigating back shows fresh data.
  useEffect(() => {
    const handler = (e: Event) => {
      const { entryId: updatedId } = (e as CustomEvent<{ entryId: string; tags: unknown[] }>).detail
      prefetchCacheRef.current.delete(updatedId)
    }
    window.addEventListener('entry:tags-updated', handler)
    return () => window.removeEventListener('entry:tags-updated', handler)
  }, [])

  // Update card grid isReadLater state and remove from list if on read-later page.
  // navEntries is intentionally not updated here.
  useEffect(() => {
    const handler = (e: Event) => {
      const { entryId: updatedId, isReadLater: newIsReadLater } = (
        e as CustomEvent<{ entryId: string; isReadLater: boolean }>
      ).detail
      // Invalidate prefetch cache so navigating back to this entry shows fresh state
      prefetchCacheRef.current.delete(updatedId)
      if (isReadLater && !newIsReadLater) {
        // Remove from read-later card grid
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

  // Load next page for the card grid (infinite scroll)
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return
    setIsLoading(true)
    try {
      const nextPage = page + 1
      const params = new URLSearchParams()
      params.set('page', String(nextPage))
      params.set('limit', String(initialPagination.limit))
      if (feedId) params.set('feedId', feedId)
      if (tagId) params.set('tagId', tagId)
      if (search) params.set('search', search)
      if (isReadLater) params.set('isReadLater', 'true')
      if (isUnread) params.set('isUnread', 'true')
      if (isPreferred) params.set('isPreferred', 'true')
      if (userPreferenceId) params.set('userPreferenceId', userPreferenceId)
      if (isAnyPreferred) params.set('isAnyPreferred', 'true')
      if (sortOrder) params.set('sortOrder', sortOrder)
      if (scoreThreshold !== undefined) params.set('scoreThreshold', String(scoreThreshold))

      const res = await fetch(`/api/entries?${params.toString()}`)
      if (!res.ok) return
      const json = await res.json() as {data: Entry[], pagination: Pagination};
      setEntries((prev) => [...prev, ...(json.data.map((entry) => ({ ...entry, meta: null, feed: { id: '', title: '' } })))])
      setPage(nextPage)
      setHasMore(json.pagination.hasNext)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, hasMore, page, feedId, tagId, search, isReadLater, isUnread, isPreferred, userPreferenceId, isAnyPreferred, sortOrder, scoreThreshold, initialPagination.limit])

  // モーダルナビ用の次ページを読み込み、navEntries と entries の両方を更新する。
  // 要件：次の記事を取得する際は、本来の記事リスト（entries）と
  // モーダル表示開始時用の記事リスト（navEntries）の両方を更新すること。
  // 背景：「あとで読む」リストで閲覧中に「あとで読む」を解除しながら「次へ」を押すと
  // リストの先頭に戻ってしまうのを防ぐため、モーダル表示中は navEntries を
  // スナップショットとして独立管理している。しかし次ページ読み込み時は
  // entries も同時に更新して無限スクロールとの整合性を維持する必要がある。
  const loadNavMore = useCallback(async () => {
    if (isNavLoading || !navHasMore) return
    setIsNavLoading(true)
    try {
      const nextPage = navPage + 1
      const params = new URLSearchParams()
      params.set('page', String(nextPage))
      params.set('limit', String(initialPagination.limit))
      if (feedId) params.set('feedId', feedId)
      if (tagId) params.set('tagId', tagId)
      if (search) params.set('search', search)
      if (isReadLater) params.set('isReadLater', 'true')
      if (isUnread) params.set('isUnread', 'true')
      if (isPreferred) params.set('isPreferred', 'true')
      if (userPreferenceId) params.set('userPreferenceId', userPreferenceId)
      if (isAnyPreferred) params.set('isAnyPreferred', 'true')
      if (sortOrder) params.set('sortOrder', sortOrder)
      if (scoreThreshold !== undefined) params.set('scoreThreshold', String(scoreThreshold))

      const res = await fetch(`/api/entries?${params.toString()}`)
      if (!res.ok) return
      const json = await res.json()
      // モーダルナビ用リストを更新（モーダル表示中の安定したナビゲーションに使用）
      setNavEntries((prev) => [...prev, ...json.data])
      setNavPage(nextPage)
      setNavHasMore(json.pagination.hasNext)
      // 本来の記事リストと無限スクロール状態も同時に更新し、二重読み込みを防ぐ
      setEntries((prev) => [...prev, ...json.data])
      setPage(nextPage)
      setHasMore(json.pagination.hasNext)
    } finally {
      setIsNavLoading(false)
    }
  }, [isNavLoading, navHasMore, navPage, feedId, tagId, search, isReadLater, isUnread, isPreferred, userPreferenceId, isAnyPreferred, sortOrder, scoreThreshold, initialPagination.limit])

  // Infinite scroll via IntersectionObserver (card grid only)
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (observations) => {
        if (observations[0].isIntersecting) {
          loadMore()
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore])

  // Prefetch entry details for adjacent entries (prev and next)
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
        .then((json) => {
          if (json.success) prefetchCacheRef.current.set(id, json.data)
        })
        .finally(() => prefetchingRef.current.delete(id))
    }
  }, [navIndex, navEntries, selectedEntryId])

  // Preload next nav page when the last nav entry is displayed
  useEffect(() => {
    if (!selectedEntryId || !navHasMore || isNavLoading || navEntries.length === 0) return
    if (navIndex === navEntries.length - 1) {
      loadNavMore()
    }
  }, [navIndex, navEntries.length, navHasMore, isNavLoading, selectedEntryId, loadNavMore])

  // Navigate to next entry after loadNavMore completes (fallback for fast clicks)
  useEffect(() => {
    if (!pendingNavigateNext || navEntries.length === 0) return
    const currentIndex = navEntries.findIndex((e) => e.id === selectedEntryId)
    if (currentIndex < navEntries.length - 1) {
      setPendingNavigateNext(false)
      const nextId = navEntries[currentIndex + 1].id
      const params = new URLSearchParams(window.location.search)
      params.set('entryId', nextId)
      window.history.pushState(null, '', `${basePath}?${params.toString()}`)
      setSelectedEntryId(nextId)
    }
  }, [navEntries, pendingNavigateNext, selectedEntryId, basePath])

  const enterSelectionMode = () => {
    setIsSelectionMode(true)
    setSelectedIds(new Set())
  }

  const exitSelectionMode = () => {
    setIsSelectionMode(false)
    setSelectedIds(new Set())
  }

  const toggleSelectEntry = useCallback((entryId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(entryId)) {
        next.delete(entryId)
      } else {
        next.add(entryId)
      }
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(entries.map((e) => e.id)))
  }, [entries])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

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
      prev.map((e) =>
        e.id === entryId
          ? { ...e, meta: e.meta ? { ...e.meta, isRead: newIsRead } : null }
          : e
      )
    )
  }, [])

  const closeEntry = () => {
    const params = new URLSearchParams(window.location.search)
    params.delete('entryId')
    window.history.pushState(null, '', `${basePath}?${params.toString()}`)
    setSelectedEntryId(null)
  }

  const goToPrev = () => {
    if (navIndex > 0) {
      openEntry(navEntries[navIndex - 1].id)
    }
  }

  const goToNext = () => {
    if (navIndex < navEntries.length - 1) {
      openEntry(navEntries[navIndex + 1].id)
    } else if (navHasMore) {
      // Preload should already be in progress; set pending flag to navigate on completion
      setPendingNavigateNext(true)
      if (!isNavLoading) {
        loadNavMore()
      }
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
        {!isReadLater && !isPreferred && !tagId && (
          <Link href="/feeds/new" className="text-xs text-primary hover:underline">
            フィードを追加する
          </Link>
        )}
        {tagId && (
          <button
            onClick={async () => {
              const res = await fetch(`/api/tags/${tagId}`, { method: 'DELETE' })
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
          <span className="text-xs text-muted-foreground py-1">
            クリックして記事を選択
          </span>
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
