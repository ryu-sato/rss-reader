export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { findManyEntries } from '@/lib/entry-service'
import { getAllTags } from '@/lib/tag-service'
import { getAllFeeds } from '@/lib/feed-service'
import { EntryCardGrid } from '@/components/entry-card-grid'
import { ReadFilter } from '@/components/read-filter'
import { SortToggle } from '@/components/sort-toggle'
import { EntryFilterBar } from '@/components/entry-filter-bar'
import type { ReadFilterValue } from '@/components/read-filter'
import type { SortOrderValue } from '@/components/sort-toggle'

interface PageProps {
  searchParams: Promise<{
    feedId?: string
    tagId?: string
    search?: string
    filter?: string
    sortOrder?: string
  }>
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams
  const filter: ReadFilterValue = params.filter === 'all' ? 'all' : 'unread'
  const isUnread = filter === 'unread'
  const sortOrder: SortOrderValue = params.sortOrder === 'asc' ? 'asc' : 'desc'

  const [{ entries, pagination }, allTags, allFeeds] = await Promise.all([
    findManyEntries({
      feedId: params.feedId,
      tagId: params.tagId,
      search: params.search,
      page: 1,
      isUnread,
      sortOrder,
    }),
    getAllTags(),
    getAllFeeds(),
  ])

  return (
    <div className="h-full overflow-y-auto">
      <div className="sticky top-0 z-10">
        <div className="h-11 border-b border-border flex items-center justify-between px-4 bg-background/95 backdrop-blur">
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-semibold tabular-nums text-foreground">
              {pagination.total === 0 ? '0' : pagination.total.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground">件</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Suspense>
              <ReadFilter value={filter} />
            </Suspense>
            <div className="w-px h-3.5 bg-border/70 mx-0.5" />
            <Suspense>
              <SortToggle value={sortOrder} />
            </Suspense>
          </div>
        </div>
        <Suspense>
          <EntryFilterBar
            allFeeds={allFeeds.map((f) => ({ id: f.id, title: f.title }))}
            allTags={allTags}
          />
        </Suspense>
      </div>
      <Suspense>
        <EntryCardGrid
          key={`${params.feedId ?? ''}-${params.tagId ?? ''}-${params.search ?? ''}-${filter}-${sortOrder}`}
          initialEntries={entries}
          initialPagination={pagination}
          feedId={params.feedId}
          tagId={params.tagId}
          search={params.search}
          isUnread={isUnread}
          sortOrder={sortOrder}
          allTags={allTags}
        />
      </Suspense>
    </div>
  )
}
