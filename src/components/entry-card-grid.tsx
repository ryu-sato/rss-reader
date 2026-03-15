'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Rss } from 'lucide-react'
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

  // Reset when initial data changes (filter change via server re-render)
  useEffect(() => {
    setEntries(initialEntries)
    setPage(1)
    setHasMore(initialPagination.hasNext)
  }, [initialEntries, initialPagination])

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
  }, [isLoading, hasMore, page, feedId, tagId, isReadLater, isUnread, initialPagination.limit])

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
        {!isReadLater && (
          <Link href="/feeds/new" className="text-xs text-primary hover:underline">
            フィードを追加する
          </Link>
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
