import { Suspense } from 'react'
import { findManyEntries } from '@/lib/entry-service'
import { getAllTags } from '@/lib/tag-service'
import { EntryCardGrid } from '@/components/entry-card-grid'

interface PageProps {
  searchParams: Promise<{
    feedId?: string
    tagId?: string
  }>
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams

  const [{ entries, pagination }, allTags] = await Promise.all([
    findManyEntries({
      feedId: params.feedId,
      tagId: params.tagId,
      page: 1,
    }),
    getAllTags(),
  ])

  return (
    <div className="h-full overflow-y-auto">
      <div className="h-11 border-b border-border flex items-center px-4 sticky top-0 bg-background/95 backdrop-blur z-10">
        <span className="text-xs text-muted-foreground">
          {pagination.total === 0 ? '記事なし' : `${pagination.total} 件`}
        </span>
      </div>
      <Suspense>
        <EntryCardGrid
          key={`${params.feedId ?? ''}-${params.tagId ?? ''}`}
          initialEntries={entries}
          initialPagination={pagination}
          feedId={params.feedId}
          tagId={params.tagId}
          allTags={allTags}
        />
      </Suspense>
    </div>
  )
}
