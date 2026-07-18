'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Rss, Tags, Trash2 } from 'lucide-react'
import Link from 'next/link'
import type { EntryDetail, EntryListItem } from '@/features/entry-viewing/types/entry'
import dynamic from 'next/dynamic'
import { EntryCard } from '@/features/entry-viewing/components/entry-card'
import { BulkTagBar } from '@/features/tag-management/components/bulk-tag-bar'
import { Button } from '@/components/ui/button'

const ArticleModal = dynamic(
  () => import('@/features/entry-viewing/components/article-modal').then((m) => m.ArticleModal),
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

  const [entries, setEntries] = useState<EntryListItem[]>(initialEntries)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(initialPagination.hasNext)
  const [isLoading, setIsLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const [navEntries, setNavEntries] = useState<EntryListItem[]>([])
  const [navPage, setNavPage] = useState(1)
  const [navHasMore, setNavHasMore] = useState(false)
  const [isNavLoading, setIsNavLoading] = useState(false)
  const [pendingNavigateNext, setPendingNavigateNext] = useState(false)
  const hasNavSnapshotRef = useRef(false)

  const prefetchCacheRef = useRef<Map<string, EntryDetail>>(new Map())
  const prefetchingRef = useRef<Set<string>>(new Set())

  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)

  useEffect(() => {
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
    if (!selectedEntryId) {
      setEntries(initialEntries)
      setPage(1)
      setHasMore(initialPagination.hasNext)
    }
  }, [initialEntries, initialPagination, selectedEntryId])

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
      const json = await res.json() as {data: EntryListItem[], pagination: Pagination};
      setEntries((prev) => {
        const existingIds = new Set(prev.map((e) => e.id))
        const newEntries = json.data.filter((e) => !existingIds.has(e.id))
        return newEntries.length > 0 ? [...prev, ...newEntries] : prev
      })
      setPage(nextPage)
      setHasMore(json.pagination.hasNext)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, hasMore, page, feedId, tagId, search, isReadLater, isUnread, isPreferred, userPreferenceId, isAnyPreferred, sortOrder, scoreThreshold, initialPagination.limit])

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
      setNavEntries((prev) => {
        const existingIds = new Set(prev.map((e) => e.id))
        const newEntries = json.data.filter((e: { id: string }) => !existingIds.has(e.id))
        return [...prev, ...newEntries]
      })
      setNavPage(nextPage)
      setNavHasMore(json.pagination.hasNext)
      setEntries((prev) => {
        const existingIds = new Set(prev.map((e) => e.id))
        const newEntries = json.data.filter((e: { id: string }) => !existingIds.has(e.id))
        return newEntries.length > 0 ? [...prev, ...newEntries] : prev
      })
    } finally {
      setIsNavLoading(false)
    }
  }, [isNavLoading, navHasMore, navPage, feedId, tagId, search, isReadLater, isUnread, isPreferred, userPreferenceId, isAnyPreferred, sortOrder, scoreThreshold, initialPagination.limit])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (observations) => { if (observations[0].isIntersecting) loadMore() },
      { rootMargin: '200px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore])

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
        .finally(() => prefetchingRef.current.delete(id))
    }
  }, [navIndex, navEntries, selectedEntryId])

  useEffect(() => {
    if (!selectedEntryId || !navHasMore || isNavLoading || navEntries.length === 0) return
    if (navIndex === navEntries.length - 1) loadNavMore()
  }, [navIndex, navEntries.length, navHasMore, isNavLoading, selectedEntryId, loadNavMore])

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
      if (!isNavLoading) loadNavMore()
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
