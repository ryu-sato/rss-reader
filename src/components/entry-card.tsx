'use client'

import Image from 'next/image'
import { memo, useState } from 'react'
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
  const date = entry.publishedAt ? new Date(entry.publishedAt) : new Date(entry.createdAt)
  const showImage = !!entry.imageUrl && !imgError

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
        'group flex flex-col rounded-xl border border-border bg-card cursor-pointer transition-all duration-200',
        'hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5 hover:border-border/60',
        isSelected && 'ring-2 ring-primary border-primary shadow-md shadow-primary/10',
        isRead && 'opacity-60'
      )}
    >
      {/* Image */}
      <div className="relative w-full aspect-video overflow-hidden rounded-t-xl shrink-0">
        {showImage ? (
          <>
            <Image
              src={entry.imageUrl!}
              alt=""
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
              onError={() => setImgError(true)}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              unoptimized
            />
            {/* Subtle gradient overlay at bottom */}
            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/60">
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

        {/* Unread dot */}
        {!isRead && (
          <span className="absolute top-2 left-2 h-2 w-2 rounded-full bg-primary shadow-sm ring-2 ring-card/80" />
        )}

        {/* Read/Unread toggle button (visible on hover) */}
        <Tooltip>
          <TooltipTrigger>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleToggleRead}
              disabled={isUpdating}
              aria-label={isRead ? '未読にする' : '既読にする'}
              className={cn(
                'absolute top-2 right-2 bg-background/85 backdrop-blur-sm border border-white/20 shadow-sm hover:scale-110',
                'opacity-0 group-hover:opacity-100 focus:opacity-100',
              )}
            >
              {isUpdating ? (
                <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
              ) : isRead ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{isRead ? '未読にする' : '既読にする'}</TooltipContent>
        </Tooltip>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-2 p-3 flex-1">
        <p
          className={cn(
            'text-sm leading-snug line-clamp-2',
            isRead ? 'font-normal text-muted-foreground' : 'font-semibold text-foreground'
          )}
        >
          {entry.title}
        </p>
        <div className="flex items-center gap-1.5 mt-auto">
          <span className="text-[11px] text-muted-foreground/80 truncate">{entry.feed.title}</span>
          <span className="text-[11px] text-muted-foreground/40 shrink-0">·</span>
          <time suppressHydrationWarning className="text-[11px] text-muted-foreground/70 shrink-0 tabular-nums">{formatDate(date)}</time>
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
