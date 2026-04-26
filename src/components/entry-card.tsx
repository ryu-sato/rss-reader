'use client'

import Image from 'next/image'
import { memo, useEffect, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import type { EntryListItem } from '@/types/entry'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'

interface EntryCardProps {
  entry: EntryListItem
  isSelected?: boolean
  onClick: (entryId: string) => void
  onToggleRead?: (entryId: string, newIsRead: boolean) => void
}

export const EntryCard = memo(function EntryCard({ entry, isSelected, onClick, onToggleRead }: EntryCardProps) {
  const [imgError, setImgError] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const isRead = entry.meta?.isRead ?? false
  const dateStr = entry.publishedAt ?? entry.createdAt
  const showImage = !!entry.imageUrl && !imgError
  const [displayDate, setDisplayDate] = useState('')

  useEffect(() => {
    setDisplayDate(formatDate(new Date(dateStr)))
  }, [dateStr])

  const handleToggleRead = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isUpdating) return
    const newIsRead = !isRead
    setIsUpdating(true)
    try {
      const res = await fetch(`/api/entries/${entry.id}/meta`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: newIsRead }),
      })
      if (res.ok) {
        onToggleRead?.(entry.id, newIsRead)
        if (newIsRead) {
          window.dispatchEvent(new CustomEvent('entry:read', { detail: { entryId: entry.id, feedId: entry.feed.id } }))
        } else {
          window.dispatchEvent(new CustomEvent('entry:unread', { detail: { entryId: entry.id, feedId: entry.feed.id } }))
        }
      }
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onClick(entry.id)}
      onKeyDown={(e) => e.key === 'Enter' && onClick(entry.id)}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl cursor-pointer bg-card',
        'border transition-all duration-300 ease-out will-change-transform',
        'hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10',
        isSelected
          ? 'border-primary/50 shadow-lg ring-2 ring-primary/25 ring-offset-2 ring-offset-background'
          : 'border-border/60 hover:border-primary/20 shadow-sm',
        isRead && 'opacity-60'
      )}
    >
      {/* Unread left accent stripe — clipped by parent overflow-hidden */}
      {!isRead && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-[3px] bg-primary/40 z-10"
        />
      )}

      {/* Image */}
      <div className="relative w-full aspect-[16/10] overflow-hidden rounded-t-2xl shrink-0">
        {showImage ? (
          <>
            <Image
              src={entry.imageUrl!}
              alt=""
              fill
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
              onError={() => setImgError(true)}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              unoptimized
            />
            <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-accent/30">
            <svg
              className="h-8 w-8 text-muted-foreground/25"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M4.5 19.5h15a.75.75 0 00.75-.75V6.75a.75.75 0 00-.75-.75h-15a.75.75 0 00-.75.75v12c0 .414.336.75.75.75z"
              />
            </svg>
          </div>
        )}

        {/* Read/Unread toggle */}
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleToggleRead}
                disabled={isUpdating}
                aria-label={isRead ? '未読にする' : '既読にする'}
                className={cn(
                  'absolute top-2 right-2 z-10',
                  'bg-background/85 backdrop-blur-md border border-border/50 shadow-sm',
                  'hover:scale-110 hover:bg-background',
                  'opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-200',
                )}
              />
            }
          >
            {isUpdating ? (
              <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
            ) : isRead ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
          </TooltipTrigger>
          <TooltipContent side="bottom">{isRead ? '未読にする' : '既読にする'}</TooltipContent>
        </Tooltip>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-2 px-3.5 pt-3 pb-3 flex-1">
        <p
          className={cn(
            'text-[13px] leading-snug line-clamp-2',
            isRead
              ? 'font-normal text-muted-foreground'
              : 'font-semibold text-foreground'
          )}
        >
          {entry.title}
        </p>
        <div className="flex items-center gap-1.5 mt-auto">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/65 truncate">
            {entry.feed.title}
          </span>
          <span className="text-[10px] text-muted-foreground/35 shrink-0">·</span>
          <time className="text-[10px] text-muted-foreground/55 shrink-0 tabular-nums">{displayDate}</time>
        </div>
      </div>
    </article>
  )
})

function formatDate(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const hours = diff / (1000 * 60 * 60)

  if (hours < 1) {
    const mins = Math.floor(diff / (1000 * 60))
    return `${mins}分前`
  }
  if (hours < 24) return `${Math.floor(hours)}時間前`
  if (hours < 24 * 7) return `${Math.floor(hours / 24)}日前`
  return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
}
