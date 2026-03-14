'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import type { EntryListItem } from '@/types/entry'
import { Button } from '@/components/ui/button'

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
    return <div>No entries found. Add some feeds to get started.</div>
  }

  return (
    <div>
      <ul className="divide-y">
        {entries.map((entry) => (
          <li
            key={entry.id}
            role="button"
            tabIndex={0}
            onClick={() => openModal(entry.id)}
            onKeyDown={(e) => e.key === 'Enter' && openModal(entry.id)}
            className={`py-3 px-2 cursor-pointer hover:bg-accent rounded-md ${entry.meta?.isRead ? 'opacity-60' : ''}`}
          >
            <h3 className="font-medium text-sm">{entry.title}</h3>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span>{entry.feed.title}</span>
              <time>
                {entry.publishedAt
                  ? new Date(entry.publishedAt).toLocaleDateString()
                  : new Date(entry.createdAt).toLocaleDateString()}
              </time>
              {entry.meta?.isRead && <span className="text-xs">Read</span>}
            </div>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between mt-4">
        <Button
          variant="outline"
          size="sm"
          disabled={!pagination.hasPrev}
          onClick={() => goToPage(pagination.page - 1)}
        >
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">Page {pagination.page}</span>
        <Button
          variant="outline"
          size="sm"
          disabled={!pagination.hasNext}
          onClick={() => goToPage(pagination.page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
