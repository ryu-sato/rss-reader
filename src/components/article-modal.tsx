'use client'

import { useEffect, useState } from 'react'
import { X, ChevronLeft, ChevronRight, Bookmark, ExternalLink } from 'lucide-react'
import type { EntryDetail } from '@/types/entry'
import { Button } from '@/components/ui/button'
import { TagInput } from '@/components/tag-input'

interface ArticleModalProps {
  entryId: string
  allTags: Array<{ id: string; name: string; createdAt: Date }>
  hasPrev: boolean
  hasNext: boolean
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}

export function ArticleModal({
  entryId,
  allTags,
  hasPrev,
  hasNext,
  onClose,
  onPrev,
  onNext,
}: ArticleModalProps) {
  const [entry, setEntry] = useState<EntryDetail | null>(null)
  const [isReadLater, setIsReadLater] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  // Fetch entry detail when entryId changes
  useEffect(() => {
    setEntry(null)
    fetch(`/api/entries/${entryId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setEntry(json.data)
          setIsReadLater(json.data.meta?.isReadLater ?? false)
        }
      })
  }, [entryId])

  // Auto-mark as read
  useEffect(() => {
    if (!entry || entry.meta?.isRead) return
    fetch(`/api/entries/${entryId}/meta`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isRead: true }),
    }).then(() => {
      window.dispatchEvent(new CustomEvent('entry:read', { detail: { feedId: entry.feed.id } }))
    })
  }, [entryId, entry])

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasPrev) onPrev()
      if (e.key === 'ArrowRight' && hasNext) onNext()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, onPrev, onNext, hasPrev, hasNext])

  const toggleReadLater = async () => {
    const newValue = !isReadLater
    setIsReadLater(newValue)
    setIsUpdating(true)
    try {
      const res = await fetch(`/api/entries/${entryId}/meta`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isReadLater: newValue }),
      })
      if (!res.ok) setIsReadLater(!newValue)
    } catch {
      setIsReadLater(!newValue)
    } finally {
      setIsUpdating(false)
    }
  }

  const entryTags = entry?.tags.map((t) => t.tag) ?? []

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      {/* Prev / Modal / Next row */}
      <div
        className="flex items-center gap-2 w-full max-w-[960px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Prev button — adjacent to modal left edge */}
        <button
          onClick={onPrev}
          disabled={!hasPrev}
          aria-label="前の記事"
          className="shrink-0 h-10 w-10 rounded-full bg-background/90 border border-border shadow flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {/* Modal */}
        <div className="flex-1 min-w-0 h-[85vh] bg-background rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="h-11 border-b border-border flex items-center justify-between px-4 shrink-0 gap-2">
            <div className="text-xs text-muted-foreground truncate">
              {entry ? (
                <span className="font-medium text-primary">{entry.feed.title}</span>
              ) : (
                <span className="text-muted-foreground/50">読み込み中…</span>
              )}
              {entry?.publishedAt && (
                <>
                  <span className="mx-1.5">·</span>
                  <time dateTime={entry.publishedAt.toString()}>
                    {new Date(entry.publishedAt).toLocaleString('ja-JP', {
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

            <div className="flex items-center gap-1 shrink-0">
              {entry && (
                <>
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
                    aria-label="元の記事を開く"
                    className="inline-flex items-center justify-center h-7 w-7 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                aria-label="閉じる"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          {!entry ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : (
            <div className="overflow-y-auto flex-1 px-8 py-6 max-w-3xl mx-auto w-full">
              <h2 className="text-xl font-bold leading-snug mb-5 text-foreground">{entry.title}</h2>

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
          )}
        </div>

        {/* Next button — adjacent to modal right edge */}
        <button
          onClick={onNext}
          disabled={!hasNext}
          aria-label="次の記事"
          className="shrink-0 h-10 w-10 rounded-full bg-background/90 border border-border shadow flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
