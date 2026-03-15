export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { findManyEntries } from '@/lib/entry-service'
import { getAllTags } from '@/lib/tag-service'
import { EntryCardGrid } from '@/components/entry-card-grid'
import { ReadFilter } from '@/components/read-filter'
import type { ReadFilterValue } from '@/components/read-filter'

interface PageProps {
  searchParams: Promise<{
    feedId?: string
    tagId?: string
    filter?: string
  }>
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams
  const filter: ReadFilterValue = params.filter === 'all' ? 'all' : 'unread'
  const isUnread = filter === 'unread'

  const [{ entries, pagination }, allTags] = await Promise.all([
    findManyEntries({
      feedId: params.feedId,
      tagId: params.tagId,
      page: 1,
      isUnread,
    }),
    getAllTags(),
  ])

  return (
    <div className="h-full overflow-y-auto">
      <div className="h-11 border-b border-border flex items-center justify-between px-4 sticky top-0 bg-background/95 backdrop-blur z-10">
        <span className="text-xs text-muted-foreground">
          {pagination.total === 0 ? '記事なし' : `${pagination.total} 件`}
        </span>
        <Suspense>
          <ReadFilter value={filter} />
        </Suspense>
      </div>
      <Suspense>
        <EntryCardGrid
          key={`${params.feedId ?? ''}-${params.tagId ?? ''}-${filter}`}
          initialEntries={entries}
          initialPagination={pagination}
          feedId={params.feedId}
          tagId={params.tagId}
          isUnread={isUnread}
          allTags={allTags}
        />
      </Suspense>
    </div>
  )
}
