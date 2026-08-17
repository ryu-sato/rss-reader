export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { getAllTags } from '@/features/tag-management/lib/tag-service'
import { findManyEntries } from '@/domain/entry/entry-repository'
import { EntryCardGrid } from '@/features/entry-viewing/components/entry-card-grid'
import { SortToggle } from '@/features/entry-viewing/components/sort-toggle'
import { parseSortOrder } from '@/domain/entry/entry-list-query'
import type { EntryListQuery } from '@/domain/entry/entry'

interface PageProps {
  searchParams: Promise<{
    sortOrder?: string
  }>
}

export default async function ReadLaterPage({ searchParams }: PageProps) {
  const params = await searchParams
  const sortOrder = parseSortOrder(params.sortOrder)

  const query: EntryListQuery = { isReadLater: true, sortOrder }

  const [{ entries, pagination }, allTags] = await Promise.all([
    findManyEntries({ ...query, page: 1 }),
    getAllTags(),
  ])

  return (
    <div className="h-full overflow-y-auto">
      <div className="h-11 border-b border-border/70 flex items-center justify-between px-4 sticky top-0 material-chrome z-10">
        <span className="text-xs text-muted-foreground">
          {pagination.total === 0 ? '記事なし' : `${pagination.total} 件`}
        </span>
        <Suspense>
          <SortToggle value={sortOrder} />
        </Suspense>
      </div>
      <Suspense>
        <EntryCardGrid
          key={sortOrder}
          initialEntries={entries}
          initialPagination={pagination}
          query={query}
          basePath="/read-later"
          allTags={allTags}
        />
      </Suspense>
    </div>
  )
}
