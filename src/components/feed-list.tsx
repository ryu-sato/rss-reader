'use client'

import Link from 'next/link'
import { Rss, Pencil } from 'lucide-react'
import { useState } from 'react'
import type { FeedListItem } from '@/types/feed'
import DeleteConfirmDialog from './delete-confirm-dialog'
import { Button } from '@/components/ui/button'

function formatRelativeDate(date: Date): string {
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

function FeedFavicon({ faviconUrl, title }: { faviconUrl: string | null; title: string }) {
  const [error, setError] = useState(false)
  if (faviconUrl && !error) {
    return (
      <img
        src={faviconUrl}
        alt={title}
        className="h-4 w-4 object-contain"
        onError={() => setError(true)}
      />
    )
  }
  return <Rss className="h-4 w-4 text-primary" />
}

interface FeedListProps {
  feeds: FeedListItem[]
}

export default function FeedList({ feeds }: FeedListProps) {
  if (feeds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Rss className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-1">No feeds yet</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Add your first RSS feed to get started
        </p>
        <Link href="/feeds/new">
          <Button size="sm">Add Feed</Button>
        </Link>
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {feeds.map((feed) => (
        <li
          key={feed.id}
          className="group border rounded-xl p-4 flex justify-between items-center gap-4 hover:bg-muted/40 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="shrink-0 rounded-lg bg-primary/10 p-2.5 flex items-center justify-center">
              <FeedFavicon faviconUrl={feed.faviconUrl} title={feed.title} />
            </div>
            <div className="min-w-0">
              <h2 className="font-medium truncate">{feed.title}</h2>
              <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-md">
                {feed.url}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {feed.lastPublishedAt
                  ? `最終記事: ${formatRelativeDate(new Date(feed.lastPublishedAt))}`
                  : '記事なし'}
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href={`/feeds/${feed.id}/edit`}>
              <Button variant="ghost" size="sm" className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            </Link>
            <DeleteConfirmDialog feedId={feed.id} feedTitle={feed.title} />
          </div>
        </li>
      ))}
    </ul>
  )
}
