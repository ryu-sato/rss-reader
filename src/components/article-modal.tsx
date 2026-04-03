'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { X, ChevronLeft, ChevronRight, Bookmark, ExternalLink, Eye, EyeOff } from 'lucide-react'
import type { EntryDetail } from '@/types/entry'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { TagInput } from '@/components/tag-input'
import { useHotkeyConfig } from '@/hooks/use-hotkey-config'

interface ArticleModalProps {
  entryId: string
  prefetchedEntry?: EntryDetail | null
  allTags: Array<{ id: string; name: string; createdAt: Date }>
  hasPrev: boolean
  hasNext: boolean
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}

const SWIPE_THRESHOLD = 60

export function ArticleModal({
  entryId,
  prefetchedEntry,
  allTags,
  hasPrev,
  hasNext,
  onClose,
  onPrev,
  onNext,
}: ArticleModalProps) {
  const [entry, setEntry] = useState<EntryDetail | null>(null)
  const [isReadLater, setIsReadLater] = useState(false)
  const [isRead, setIsRead] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isUpdatingRead, setIsUpdatingRead] = useState(false)
  const [swipeX, setSwipeX] = useState(0)
  const [swipeTransition, setSwipeTransition] = useState(false)
  const swipeStartRef = useRef<{ x: number; y: number; active: boolean } | null>(null)
  const { config } = useHotkeyConfig()

  // Reset swipe when entry changes
  useEffect(() => {
    setSwipeX(0)
  }, [entryId])

  // Swipe handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, a, input, textarea')) return
    swipeStartRef.current = { x: e.clientX, y: e.clientY, active: false }
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!swipeStartRef.current) return
    const dx = e.clientX - swipeStartRef.current.x
    const dy = e.clientY - swipeStartRef.current.y
    if (!swipeStartRef.current.active) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      if (Math.abs(dy) >= Math.abs(dx)) { swipeStartRef.current = null; return }
      swipeStartRef.current.active = true
    }
    setSwipeX(dx)
  }, [])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!swipeStartRef.current?.active) { swipeStartRef.current = null; return }
    const dx = e.clientX - swipeStartRef.current.x
    swipeStartRef.current = null
    setSwipeTransition(true)
    setSwipeX(0)
    setTimeout(() => setSwipeTransition(false), 200)
    if (dx > SWIPE_THRESHOLD && hasPrev) onPrev()
    else if (dx < -SWIPE_THRESHOLD && hasNext) onNext()
  }, [hasPrev, hasNext, onPrev, onNext])

  // Fetch entry detail when entryId changes (use prefetched data if available)
  useEffect(() => {
    if (prefetchedEntry) {
      setEntry(prefetchedEntry)
      setIsReadLater(prefetchedEntry.meta?.isReadLater ?? false)
      setIsRead(prefetchedEntry.meta?.isRead ?? false)
      return
    }
    setEntry(null)
    fetch(`/api/entries/${entryId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setEntry(json.data)
          setIsReadLater(json.data.meta?.isReadLater ?? false)
          setIsRead(json.data.meta?.isRead ?? false)
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryId])

  // Auto-mark as read
  useEffect(() => {
    if (!entry || entry.meta?.isRead) return
    fetch(`/api/entries/${entryId}/meta`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isRead: true }),
    }).then(() => {
      setIsRead(true)
      window.dispatchEvent(new CustomEvent('entry:read', { detail: { entryId, feedId: entry.feed.id } }))
    })
  }, [entryId, entry])

  const toggleRead = useCallback(async () => {
    if (!entry) return
    const newValue = !isRead
    setIsRead(newValue)
    setIsUpdatingRead(true)
    try {
      const res = await fetch(`/api/entries/${entryId}/meta`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: newValue }),
      })
      if (!res.ok) {
        setIsRead(!newValue)
      } else {
        const event = newValue ? 'entry:read' : 'entry:unread'
        window.dispatchEvent(new CustomEvent(event, { detail: { entryId, feedId: entry.feed.id } }))
      }
    } catch {
      setIsRead(!newValue)
    } finally {
      setIsUpdatingRead(false)
    }
  }, [entryId, entry, isRead])

  const toggleReadLater = useCallback(async () => {
    const newValue = !isReadLater
    setIsReadLater(newValue)
    setIsUpdating(true)
    try {
      const res = await fetch(`/api/entries/${entryId}/meta`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isReadLater: newValue }),
      })
      if (!res.ok) {
        setIsReadLater(!newValue)
      } else {
        window.dispatchEvent(new CustomEvent('entry:updated', { detail: { entryId, isReadLater: newValue } }))
      }
    } catch {
      setIsReadLater(!newValue)
    } finally {
      setIsUpdating(false)
    }
  }, [entryId, isReadLater])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === config.closeModal) onClose()
      if (e.key === config.prevArticle && hasPrev) onPrev()
      if (e.key === config.nextArticle && hasNext) onNext()
      if (e.key === config.readLater && entry && !isUpdating) toggleReadLater()
      if (e.key === config.toggleRead && entry && !isUpdatingRead) toggleRead()
      if (e.key === config.openOriginal && entry) window.open(entry.link, '_blank', 'noopener,noreferrer')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [config, onClose, onPrev, onNext, hasPrev, hasNext, entry, isUpdating, toggleReadLater])

  const entryTags = entry?.tags.map((t) => t.tag) ?? []

  // iOS PWA standalone mode では <a target="_blank"> がアプリ内で開くため、
  // window.open() を使ってデフォルトブラウザ（Safari）で開く
  const handleExternalLink = (e: React.MouseEvent<HTMLAnchorElement>, url: string) => {
    const isIosStandalone = typeof (window.navigator as unknown as { standalone?: boolean }).standalone !== 'undefined' &&
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    if (isIosStandalone) {
      e.preventDefault()
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      {/* Prev / Modal / Next row */}
      <div
        className="flex items-center gap-2 w-full sm:max-w-[960px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Prev button — hidden on mobile */}
        <button
          onClick={onPrev}
          disabled={!hasPrev}
          aria-label="前の記事"
          className="hidden sm:flex shrink-0 h-10 w-10 rounded-full bg-background/90 border border-border shadow items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {/* Modal */}
        <div
          className="flex-1 min-w-0 h-[92dvh] sm:h-[85vh] bg-background sm:rounded-2xl rounded-t-2xl border border-border shadow-2xl flex flex-col overflow-hidden"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            transform: `translateX(${swipeX}px)`,
            transition: swipeTransition ? 'transform 0.2s ease' : 'none',
          }}
        >
          {/* Toolbar */}
          <div className="h-11 border-b border-border flex items-center justify-between px-4 shrink-0 gap-2">
            {/* Prev/Next — mobile only (desktop shows outside modal) */}
            <div className="flex items-center gap-0.5 sm:hidden shrink-0">
              <button
                onClick={onPrev}
                disabled={!hasPrev}
                aria-label="前の記事"
                className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={onNext}
                disabled={!hasNext}
                aria-label="次の記事"
                className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="text-xs text-muted-foreground truncate hidden sm:block">
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
                  <Tooltip>
                    <TooltipTrigger>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleRead}
                        disabled={isUpdatingRead}
                        aria-label={isRead ? '未読に戻す' : '既読にする'}
                        className="h-7 w-7 sm:w-auto sm:gap-1.5 sm:px-2 p-0 text-xs"
                      >
                        {isUpdatingRead ? (
                          <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                        ) : isRead ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                        <span className="hidden sm:inline">{isRead ? '未読に戻す' : '既読にする'}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      {isRead ? '未読に戻す' : '既読にする'} ({config.toggleRead.toUpperCase()})
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger>
                      <Button
                        variant={isReadLater ? 'default' : 'ghost'}
                        size="sm"
                        onClick={toggleReadLater}
                        disabled={isUpdating}
                        aria-label={isReadLater ? '保存済み' : 'あとで読む'}
                        className="h-7 w-7 sm:w-auto sm:gap-1.5 sm:px-2 p-0 text-xs"
                      >
                        <Bookmark className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{isReadLater ? '保存済み' : 'あとで読む'}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      あとで読む ({config.readLater.toUpperCase()})
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger>
                      <a
                        href={entry.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="元の記事を開く"
                        onClick={(e) => handleExternalLink(e, entry.link)}
                        className="inline-flex items-center justify-center h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      元の記事を開く ({config.openOriginal.toUpperCase()})
                    </TooltipContent>
                  </Tooltip>
                </>
              )}
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={onClose}
                    aria-label="閉じる"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">閉じる ({config.closeModal.toUpperCase()})</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Content */}
          {!entry ? (
            <div className="overflow-y-auto flex-1 px-4 py-4 sm:px-8 sm:py-6 max-w-3xl mx-auto w-full">
              {/* Skeleton loading */}
              <div className="h-7 bg-muted rounded-lg animate-pulse mb-2 w-full" />
              <div className="h-7 bg-muted rounded-lg animate-pulse mb-5 w-3/4" />
              <div className="aspect-video bg-muted rounded-xl animate-pulse mb-6" />
              <div className="space-y-2.5">
                <div className="h-4 bg-muted rounded animate-pulse w-full" />
                <div className="h-4 bg-muted rounded animate-pulse w-full" />
                <div className="h-4 bg-muted rounded animate-pulse w-5/6" />
                <div className="h-4 bg-muted rounded animate-pulse w-full" />
                <div className="h-4 bg-muted rounded animate-pulse w-4/5" />
              </div>
            </div>
          ) : (
            <div className="overflow-y-auto flex-1 px-4 py-4 sm:px-8 sm:py-6 max-w-3xl mx-auto w-full">
              <h2 className="text-xl font-bold leading-snug mb-5 text-foreground">
                <a
                  href={entry.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => handleExternalLink(e, entry.link)}
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
          )}
        </div>

        {/* Next button — hidden on mobile */}
        <button
          onClick={onNext}
          disabled={!hasNext}
          aria-label="次の記事"
          className="hidden sm:flex shrink-0 h-10 w-10 rounded-full bg-background/90 border border-border shadow items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
