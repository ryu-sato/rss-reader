export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { getAllTags } from '@/lib/tag-service'
import { findManyEntries } from '@/lib/entry-service'
import { EntryCardGrid } from '@/components/entry-card-grid'

export default async function PreferredAllPage() {
  const [{ entries, pagination }, allTags] = await Promise.all([
    findManyEntries({ isAnyPreferred: true, page: 1 }),
    getAllTags(),
  ])

  return (
    <div className="h-full overflow-y-auto">
      <div className="h-11 border-b border-border flex items-center px-4 gap-2 sticky top-0 bg-background/95 backdrop-blur z-10">
        <span className="text-sm font-medium flex-1">すべての好みに合う記事</span>
        <span className="text-xs text-muted-foreground shrink-0">
          {pagination.total === 0 ? '記事なし' : `${pagination.total} 件`}
        </span>
      </div>
      <Suspense>
        <EntryCardGrid
          initialEntries={entries}
          initialPagination={pagination}
          isAnyPreferred
          basePath="/preferred/all"
          allTags={allTags}
        />
      </Suspense>
    </div>
  )
}
