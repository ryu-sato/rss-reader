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
  const [readingProgress, setReadingProgress] = useState(0)
  const swipeStartRef = useRef<{ x: number; y: number; active: boolean } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { config } = useHotkeyConfig()

  // Reset swipe, scroll, and progress when entry changes
  useEffect(() => {
    setSwipeX(0)
    setReadingProgress(0)
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [entryId])

  // Reading progress tracking
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    const progress = scrollHeight <= clientHeight ? 100 : (scrollTop / (scrollHeight - clientHeight)) * 100
    setReadingProgress(progress)
  }, [])

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
        {/* Prev button — desktop only */}
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
          className="flex-1 min-w-0 h-[92dvh] sm:h-[88vh] bg-background sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-black/10 dark:ring-white/10"
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
          <div className="h-12 border-b border-border/60 flex items-center justify-between px-3 sm:px-4 shrink-0 gap-2">
            {/* Left: mobile prev/next + feed info */}
            <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
              <div className="flex items-center sm:hidden shrink-0">
                <button
                  onClick={onPrev}
                  disabled={!hasPrev}
                  aria-label="前の記事"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={onNext}
                  disabled={!hasNext}
                  aria-label="次の記事"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {entry ? (
                <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                  <span className="text-xs font-semibold text-primary truncate max-w-[160px] sm:max-w-[240px]">
                    {entry.feed.title}
                  </span>
                  {entry.publishedAt && (
                    <>
                      <span className="text-muted-foreground/40 text-xs shrink-0">·</span>
                      <time
                        className="text-xs text-muted-foreground shrink-0 hidden sm:block"
                        dateTime={entry.publishedAt.toString()}
                      >
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
              ) : (
                <span className="text-xs text-muted-foreground/50">読み込み中…</span>
              )}
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-0.5 shrink-0">
              {entry && (
                <>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={toggleRead}
                          disabled={isUpdatingRead}
                          aria-label={isRead ? '未読に戻す' : '既読にする'}
                          className="h-8 w-8 sm:w-auto sm:gap-1.5 sm:px-2.5 p-0 text-xs rounded-lg"
                        />
                      }
                    >
                      {isUpdatingRead ? (
                        <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      ) : isRead ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                      <span className="hidden sm:inline">{isRead ? '未読に戻す' : '既読にする'}</span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      {isRead ? '未読に戻す' : '既読にする'} ({config.toggleRead.toUpperCase()})
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant={isReadLater ? 'default' : 'ghost'}
                          size="sm"
                          onClick={toggleReadLater}
                          disabled={isUpdating}
                          aria-label={isReadLater ? '保存済み' : 'あとで読む'}
                          className="h-8 w-8 sm:w-auto sm:gap-1.5 sm:px-2.5 p-0 text-xs rounded-lg"
                        />
                      }
                    >
                      <Bookmark className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{isReadLater ? '保存済み' : 'あとで読む'}</span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      あとで読む ({config.readLater.toUpperCase()})
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <a
                          href={entry.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="元の記事を開く"
                          onClick={(e) => handleExternalLink(e, entry.link)}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        />
                      }
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      元の記事を開く ({config.openOriginal.toUpperCase()})
                    </TooltipContent>
                  </Tooltip>
                </>
              )}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={onClose}
                      aria-label="閉じる"
                      className="text-muted-foreground hover:text-foreground rounded-lg"
                    />
                  }
                >
                  <X className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent side="bottom">閉じる ({config.closeModal.toUpperCase()})</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Reading progress bar */}
          <div className="h-[2px] bg-border/40 shrink-0 overflow-hidden">
            <div
              className="h-full bg-primary/60 transition-[width] duration-100 ease-out"
              style={{ width: `${readingProgress}%` }}
            />
          </div>

          {/* Content */}
          {!entry ? (
            <div className="overflow-y-auto flex-1 px-5 py-7 sm:px-12 sm:py-10 max-w-3xl mx-auto w-full">
              {/* Skeleton: title */}
              <div className="h-8 bg-muted rounded-lg animate-pulse mb-2.5 w-full" />
              <div className="h-8 bg-muted rounded-lg animate-pulse mb-6 w-2/3" />
              {/* Skeleton: meta */}
              <div className="flex gap-2.5 mb-7">
                <div className="h-5 bg-muted rounded-md animate-pulse w-28" />
                <div className="h-5 bg-muted rounded animate-pulse w-24" />
                <div className="h-5 bg-muted rounded animate-pulse w-20" />
              </div>
              {/* Skeleton: image */}
              <div className="aspect-video bg-muted rounded-xl animate-pulse mb-9" />
              {/* Skeleton: body */}
              <div className="space-y-3">
                {[1, 0.96, 0.9, 1, 0.88, 0.94, 1, 0.85].map((w, i) => (
                  <div
                    key={i}
                    className="h-[19px] bg-muted rounded animate-pulse"
                    style={{ width: `${w * 100}%` }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="overflow-y-auto flex-1 px-5 py-7 sm:px-12 sm:py-10 max-w-3xl mx-auto w-full"
            >
              {/* Title */}
              <h2 className="font-reading text-[1.6rem] sm:text-[2rem] font-bold leading-[1.25] mb-4 text-foreground tracking-tight">
                <a
                  href={entry.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => handleExternalLink(e, entry.link)}
                  className="hover:text-primary transition-colors duration-150"
                >
                  {entry.title}
                </a>
              </h2>

              {/* Meta: feed badge + date + reading time */}
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 mb-8">
                <span className="text-[0.75rem] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md leading-5">
                  {entry.feed.title}
                </span>
                {entry.publishedAt && (
                  <>
                    <span className="text-muted-foreground/40 text-xs">·</span>
                    <time
                      className="text-xs text-muted-foreground"
                      dateTime={entry.publishedAt.toString()}
                    >
                      {new Date(entry.publishedAt).toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </time>
                  </>
                )}
              </div>

              {/* Image */}
              {entry.imageUrl && (
                <div className="mb-8 rounded-xl overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={entry.imageUrl}
                    alt=""
                    className="w-full object-cover max-h-72 sm:max-h-80"
                  />
                </div>
              )}

              {/* Body */}
              <div className="font-reading prose prose-base max-w-none dark:prose-invert text-foreground/90 leading-[1.85] mb-10
                prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-foreground
                prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                prose-strong:text-foreground prose-strong:font-semibold
                prose-code:text-sm prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:font-mono">
                <p className="whitespace-pre-wrap">{entry.content ?? entry.description ?? ''}</p>
              </div>

              {/* Tags */}
              <div className="border-t border-border/50 pt-6">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
                  タグ
                </p>
                <TagInput entryId={entry.id} initialTags={entryTags} allTags={allTags} />
              </div>
            </div>
          )}
        </div>

        {/* Next button — desktop only */}
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
