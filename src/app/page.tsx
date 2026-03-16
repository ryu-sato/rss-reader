export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { findManyEntries } from '@/lib/entry-service'
import { getAllTags } from '@/lib/tag-service'
import { getAllFeeds } from '@/lib/feed-service'
import { EntryCardGrid } from '@/components/entry-card-grid'
import { ReadFilter } from '@/components/read-filter'
import { EntryFilterBar } from '@/components/entry-filter-bar'
import type { ReadFilterValue } from '@/components/read-filter'

interface PageProps {
  searchParams: Promise<{
    feedId?: string
    tagId?: string
    search?: string
    filter?: string
  }>
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams
  const filter: ReadFilterValue = params.filter === 'unread' ? 'unread' : 'all'
  const isUnread = filter === 'unread'

  const [{ entries, pagination }, allTags, allFeeds] = await Promise.all([
    findManyEntries({
      feedId: params.feedId,
      tagId: params.tagId,
      search: params.search,
      page: 1,
      isUnread,
    }),
    getAllTags(),
    getAllFeeds(),
  ])

  return (
    <div className="h-full overflow-y-auto">
      <div className="sticky top-0 z-10">
        <div className="h-11 border-b border-border flex items-center justify-between px-4 bg-background/95 backdrop-blur">
          <span className="text-xs text-muted-foreground">
            {pagination.total === 0 ? '記事なし' : `${pagination.total} 件`}
          </span>
          <Suspense>
            <ReadFilter value={filter} />
          </Suspense>
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
          key={`${params.feedId ?? ''}-${params.tagId ?? ''}-${params.search ?? ''}-${filter}`}
          initialEntries={entries}
          initialPagination={pagination}
          feedId={params.feedId}
          tagId={params.tagId}
          search={params.search}
          isUnread={isUnread}
          allTags={allTags}
        />
      </Suspense>
    </div>
  )
}
