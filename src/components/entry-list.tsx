'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Rss } from 'lucide-react'
import type { EntryListItem } from '@/types/entry'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface Pagination {
  page: number
  limit: number
  total: number
  hasNext: boolean
  hasPrev: boolean
}

interface EntryListProps {
  entries: EntryListItem[]
  pagination: Pagination
  basePath?: string
}

export function EntryList({ entries, pagination, basePath = '/' }: EntryListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const selectedEntryId = searchParams.get('entryId')

  const openModal = (entryId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('entryId', entryId)
    router.push(`${basePath}?${params.toString()}`)
  }

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(page))
    router.push(`${basePath}?${params.toString()}`)
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <Rss className="h-8 w-8 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">記事がありません</p>
        <Link href="/feeds/new" className="mt-3 text-xs text-primary hover:underline">
          フィードを追加する
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <ul className="flex-1">
        {entries.map((entry) => {
          const isRead = entry.meta?.isRead ?? false
          const isSelected = selectedEntryId === entry.id
          const date = entry.publishedAt
            ? new Date(entry.publishedAt)
            : new Date(entry.createdAt)

          return (
            <li
              key={entry.id}
              role="button"
              tabIndex={0}
              onClick={() => openModal(entry.id)}
              onKeyDown={(e) => e.key === 'Enter' && openModal(entry.id)}
              className={cn(
                'px-3 py-2.5 cursor-pointer border-b border-border/50 transition-colors',
                isSelected
                  ? 'bg-primary/8 border-l-2 border-l-primary'
                  : 'hover:bg-accent border-l-2 border-l-transparent',
                isRead ? 'opacity-60' : ''
              )}
            >
              <div className="flex items-start gap-2">
                {!isRead && (
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                )}
                {isRead && <span className="mt-1.5 h-1.5 w-1.5 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'text-xs leading-snug line-clamp-2',
                      isRead ? 'font-normal text-muted-foreground' : 'font-semibold text-foreground'
                    )}
                  >
                    {entry.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                      {entry.feed.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">·</span>
                    <time className="text-[10px] text-muted-foreground shrink-0">
                      {formatDate(date)}
                    </time>
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {/* Pagination */}
      {(pagination.hasPrev || pagination.hasNext) && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-border shrink-0">
          <button
            disabled={!pagination.hasPrev}
            onClick={() => goToPage(pagination.page - 1)}
            className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="前のページ"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="text-[10px] text-muted-foreground">{pagination.page}</span>
          <button
            disabled={!pagination.hasNext}
            onClick={() => goToPage(pagination.page + 1)}
            className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="次のページ"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

function formatDate(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const hours = diff / (1000 * 60 * 60)

  if (hours < 1) {
    const mins = Math.floor(diff / (1000 * 60))
    return `${mins}分前`
  }
  if (hours < 24) {
    return `${Math.floor(hours)}時間前`
  }
  if (hours < 24 * 7) {
    return `${Math.floor(hours / 24)}日前`
  }
  return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
}
