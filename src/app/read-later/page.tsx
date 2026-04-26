export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { getAllTags } from '@/lib/tag-service'
import { findManyEntries } from '@/lib/entry-service'
import { EntryCardGrid } from '@/components/entry-card-grid'
import { SortToggle } from '@/components/sort-toggle'
import type { SortOrderValue } from '@/components/sort-toggle'

interface PageProps {
  searchParams: Promise<{
    sortOrder?: string
  }>
}

export default async function ReadLaterPage({ searchParams }: PageProps) {
  const params = await searchParams
  const sortOrder: SortOrderValue = params.sortOrder === 'asc' ? 'asc' : 'desc'

  const [{ entries, pagination }, allTags] = await Promise.all([
    findManyEntries({ isReadLater: true, page: 1, sortOrder }),
    getAllTags(),
  ])

  return (
    <div className="h-full overflow-y-auto">
      <div className="h-11 border-b border-border flex items-center justify-between px-4 sticky top-0 bg-background/95 backdrop-blur z-10">
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
          isReadLater
          sortOrder={sortOrder}
          basePath="/read-later"
          allTags={allTags}
        />
      </Suspense>
    </div>
  )
}
