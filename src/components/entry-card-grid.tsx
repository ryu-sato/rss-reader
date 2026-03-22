'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Rss, Trash2 } from 'lucide-react'
import Link from 'next/link'
import type { Entry, EntryListItem } from '@/types/entry'
import { EntryCard } from '@/components/entry-card'
import { ArticleModal } from '@/components/article-modal'

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
  basePath = '/',
  allTags,
}: EntryCardGridProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

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

  const selectedEntryId = searchParams.get('entryId')
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

  // Update card grid isReadLater state and remove from list if on read-later page.
  // navEntries is intentionally not updated here.
  useEffect(() => {
    const handler = (e: Event) => {
      const { entryId: updatedId, isReadLater: newIsReadLater } = (
        e as CustomEvent<{ entryId: string; isReadLater: boolean }>
      ).detail
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

      const res = await fetch(`/api/entries?${params.toString()}`)
      if (!res.ok) return
      const json = await res.json() as {data: Entry[], pagination: Pagination};
      setEntries((prev) => [...prev, ...(json.data.map((entry) => ({ ...entry, meta : null, feed: { id: '', title: '' }, tags: [] })))])
      setPage(nextPage)
      setHasMore(json.pagination.hasNext)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, hasMore, page, feedId, tagId, search, isReadLater, isUnread, isPreferred, userPreferenceId, isAnyPreferred, initialPagination.limit])

  // Load next page for modal navigation (appends to navEntries only)
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

      const res = await fetch(`/api/entries?${params.toString()}`)
      if (!res.ok) return
      const json = await res.json()
      setNavEntries((prev) => [...prev, ...json.data])
      setNavPage(nextPage)
      setNavHasMore(json.pagination.hasNext)
    } finally {
      setIsNavLoading(false)
    }
  }, [isNavLoading, navHasMore, navPage, feedId, tagId, search, isReadLater, isUnread, isPreferred, userPreferenceId, isAnyPreferred, initialPagination.limit])

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
      const params = new URLSearchParams(searchParams.toString())
      params.set('entryId', navEntries[currentIndex + 1].id)
      router.push(`${basePath}?${params.toString()}`, { scroll: false })
    }
  }, [navEntries, pendingNavigateNext, selectedEntryId, searchParams, router, basePath])

  const openEntry = (entryId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('entryId', entryId)
    router.push(`${basePath}?${params.toString()}`, { scroll: false })
  }

  const closeEntry = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('entryId')
    router.push(`${basePath}?${params.toString()}`, { scroll: false })
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
        {entries.map((entry) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            isSelected={selectedEntryId === entry.id}
            onClick={() => openEntry(entry.id)}
            onToggleRead={(entryId, newIsRead) => {
              setEntries((prev) =>
                prev.map((e) =>
                  e.id === entryId
                    ? { ...e, meta: e.meta ? { ...e.meta, isRead: newIsRead } : null }
                    : e
                )
              )
            }}
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
      {selectedEntryId && (
        <ArticleModal
          entryId={selectedEntryId}
          allTags={allTags}
          hasPrev={navIndex > 0}
          hasNext={navIndex < navEntries.length - 1 || navHasMore}
          onClose={closeEntry}
          onPrev={goToPrev}
          onNext={goToNext}
        />
      )}
    </>
  )
}
