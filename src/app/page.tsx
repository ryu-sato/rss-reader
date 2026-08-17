export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { findManyEntries } from '@/domain/entry/entry-repository'
import { getAllTags } from '@/features/tag-management/lib/tag-service'
import { getAllFeeds } from '@/domain/feed/feed-repository'
import { EntryCardGrid } from '@/features/entry-viewing/components/entry-card-grid'
import { ReadFilter } from '@/features/read-status/components/read-filter'
import { SortToggle } from '@/features/entry-viewing/components/sort-toggle'
import { EntryFilterBar } from '@/features/entry-viewing/components/entry-filter-bar'
import { parseSortOrder } from '@/domain/entry/entry-list-query'
import type { EntryListQuery } from '@/domain/entry/entry'
import type { ReadFilterValue } from '@/features/read-status/components/read-filter'

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
  const sortOrder = parseSortOrder(params.sortOrder)

  // 初回取得と追加読み込みで同じ条件を使うため、クエリは 1 か所で組み立てて共有する
  const query: EntryListQuery = {
    feedId: params.feedId,
    tagId: params.tagId,
    search: params.search,
    isUnread,
    sortOrder,
  }

  const [{ entries, pagination }, allTags, allFeeds] = await Promise.all([
    findManyEntries({ ...query, page: 1 }),
    getAllTags(),
    getAllFeeds(),
  ])

  return (
    <div className="h-full overflow-y-auto">
      <div className="sticky top-0 z-10">
        <div className="h-11 border-b border-border/70 flex items-center justify-between px-4 material-chrome">
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
          query={query}
          allTags={allTags}
        />
      </Suspense>
    </div>
  )
}
