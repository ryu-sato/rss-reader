'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Rss, Trash2 } from 'lucide-react'
import Link from 'next/link'
import type { EntryListItem } from '@/types/entry'
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
  basePath = '/',
  allTags,
}: EntryCardGridProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [entries, setEntries] = useState<EntryListItem[]>(initialEntries)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(initialPagination.hasNext)
  const [isLoading, setIsLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const selectedEntryId = searchParams.get('entryId')
  const selectedIndex = entries.findIndex((e) => e.id === selectedEntryId)

  // Reset when initial data changes, but only when modal is closed.
  // While modal is open, keep the current entries list so that:
  // - Navigation (next/prev) keeps working even if the server re-renders with a shorter list
  // - Articles marked as read don't disappear from the list mid-session
  useEffect(() => {
    if (!selectedEntryId) {
      setEntries(initialEntries)
      setPage(1)
      setHasMore(initialPagination.hasNext)
    }
  }, [initialEntries, initialPagination, selectedEntryId])

  // Update entry read state when an article is marked as read or unread
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

  // Update entry isReadLater state and remove from list if on read-later page
  useEffect(() => {
    const handler = (e: Event) => {
      const { entryId: updatedId, isReadLater: newIsReadLater } = (
        e as CustomEvent<{ entryId: string; isReadLater: boolean }>
      ).detail
      if (isReadLater && !newIsReadLater) {
        // Remove from read-later list
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

      const res = await fetch(`/api/entries?${params.toString()}`)
      if (!res.ok) return
      const json = await res.json()
      setEntries((prev) => [...prev, ...json.data])
      setPage(nextPage)
      setHasMore(json.pagination.hasNext)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, hasMore, page, feedId, tagId, search, isReadLater, isUnread, initialPagination.limit])

  // Infinite scroll via IntersectionObserver
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
    if (selectedIndex > 0) {
      openEntry(entries[selectedIndex - 1].id)
    }
  }

  const goToNext = () => {
    if (selectedIndex < entries.length - 1) {
      openEntry(entries[selectedIndex + 1].id)
    } else if (hasMore) {
      // Load more and navigate after
      loadMore().then(() => {
        setEntries((current) => {
          if (selectedIndex < current.length - 1) {
            openEntry(current[selectedIndex + 1].id)
          }
          return current
        })
      })
    }
  }

  if (entries.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Rss className="h-10 w-10 text-muted-foreground/20 mb-4" />
        <p className="text-sm text-muted-foreground mb-3">
          {isReadLater
            ? '「あとで読む」に追加した記事はありません'
            : isUnread
              ? '未読の記事はありません'
              : '記事がありません'}
        </p>
        {!isReadLater && !tagId && (
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
          hasPrev={selectedIndex > 0}
          hasNext={selectedIndex < entries.length - 1 || hasMore}
          onClose={closeEntry}
          onPrev={goToPrev}
          onNext={goToNext}
        />
      )}
    </>
  )
}
