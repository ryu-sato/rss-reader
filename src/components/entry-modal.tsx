'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { X, ChevronLeft, ChevronRight, Bookmark, ExternalLink } from 'lucide-react'
import type { EntryDetail } from '@/types/entry'
import { Button } from '@/components/ui/button'
import { TagInput } from '@/components/tag-input'

interface EntryModalProps {
  entry: EntryDetail
  allTags: Array<{ id: string; name: string; createdAt: Date }>
}

export function EntryModal({ entry, allTags }: EntryModalProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [isReadLater, setIsReadLater] = useState(entry.meta?.isReadLater ?? false)
  const [isUpdating, setIsUpdating] = useState(false)

  const closeModal = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('entryId')
    router.push(`${pathname}?${params.toString()}`)
  }

  // Auto-mark as read on open (REQ-101)
  useEffect(() => {
    if (!entry.meta?.isRead) {
      fetch(`/api/entries/${entry.id}/meta`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      }).then(() => {
        window.dispatchEvent(new CustomEvent('entry:read', { detail: { feedId: entry.feed.id } }))
      })
    }
  }, [entry.id, entry.meta?.isRead, entry.feed.id])

  const toggleReadLater = async () => {
    const newValue = !isReadLater
    setIsReadLater(newValue)
    setIsUpdating(true)
    try {
      const res = await fetch(`/api/entries/${entry.id}/meta`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isReadLater: newValue }),
      })
      if (!res.ok) {
        setIsReadLater(!newValue)
      }
    } catch {
      setIsReadLater(!newValue)
    } finally {
      setIsUpdating(false)
    }
  }

  const isReadLaterPage = pathname === '/read-later'
  const readLaterParam = isReadLaterPage ? '&isReadLater=true' : ''

  const goToPrev = async () => {
    const res = await fetch(`/api/entries?beforeId=${entry.id}&limit=1${readLaterParam}`)
    if (res.ok) {
      const { data } = await res.json()
      if (data?.[0]) {
        const params = new URLSearchParams(searchParams.toString())
        params.set('entryId', data[0].id)
        router.push(`${pathname}?${params.toString()}`)
      }
    }
  }

  const goToNext = async () => {
    const res = await fetch(`/api/entries?afterId=${entry.id}&limit=1${readLaterParam}`)
    if (res.ok) {
      const { data } = await res.json()
      if (data?.[0]) {
        const params = new URLSearchParams(searchParams.toString())
        params.set('entryId', data[0].id)
        router.push(`${pathname}?${params.toString()}`)
      }
    }
  }

  const entryTags = entry.tags.map((t) => t.tag)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={entry.title}
      className="h-full flex flex-col bg-background overflow-hidden"
    >
      {/* Toolbar */}
      <div className="h-11 border-b border-border flex items-center justify-between px-4 shrink-0 gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPrev}
            aria-label="Previous entry"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToNext}
            aria-label="Next entry"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant={isReadLater ? 'default' : 'ghost'}
            size="sm"
            onClick={toggleReadLater}
            disabled={isUpdating}
            className="h-7 gap-1.5 text-xs"
          >
            <Bookmark className="h-3.5 w-3.5" />
            {isReadLater ? '保存済み' : 'あとで読む'}
          </Button>
          <a
            href={entry.link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Read original article"
            className="inline-flex items-center justify-center h-7 w-7 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <Button
            variant="ghost"
            size="sm"
            onClick={closeModal}
            aria-label="Close modal"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-y-auto flex-1 px-8 py-6 max-w-3xl mx-auto w-full">
        <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-primary">{entry.feed.title}</span>
          {entry.publishedAt && (
            <>
              <span>·</span>
              <time dateTime={entry.publishedAt.toISOString()}>
                {entry.publishedAt.toLocaleString('ja-JP', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </time>
            </>
          )}
        </div>

        <h2 className="text-xl font-bold leading-snug mb-5 text-foreground">
          <a
            href={entry.link}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            {entry.title}
          </a>
        </h2>

        {entry.imageUrl && (
          <div className="mb-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={entry.imageUrl}
              alt=""
              className="w-full rounded-lg object-cover max-h-64"
            />
          </div>
        )}

        <div className="prose prose-sm max-w-none text-foreground leading-relaxed mb-6">
          <p className="whitespace-pre-wrap">{entry.content ?? entry.description ?? ''}</p>
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">タグ</p>
          <TagInput entryId={entry.id} initialTags={entryTags} allTags={allTags} />
        </div>
      </div>
    </div>
  )
}
