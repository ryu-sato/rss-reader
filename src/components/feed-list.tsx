'use client'

import Link from 'next/link'
import type { FeedListItem } from '@/types/feed'
import DeleteConfirmDialog from './delete-confirm-dialog'
import { Button } from '@/components/ui/button'

interface FeedListProps {
  feeds: FeedListItem[]
}

export default function FeedList({ feeds }: FeedListProps) {
  if (feeds.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No feeds registered yet. Add your first feed!</p>
        <Link href="/feeds/new" className="mt-4 inline-block">
          <Button className="mt-4">Add Feed</Button>
        </Link>
      </div>
    )
  }

  return (
    <ul className="space-y-4">
      {feeds.map((feed) => (
        <li key={feed.id} className="border rounded-lg p-4 flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold">{feed.title}</h2>
            <p className="text-sm text-muted-foreground truncate max-w-md">{feed.url}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Added: {new Date(feed.createdAt).toLocaleDateString()}
              {' | '}
              Updated: {new Date(feed.updatedAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2 ml-4">
            <Link href={`/feeds/${feed.id}/edit`}>
              <Button variant="outline" size="sm">Edit</Button>
            </Link>
            <DeleteConfirmDialog feedId={feed.id} feedTitle={feed.title} />
          </div>
        </li>
      ))}
    </ul>
  )
}
