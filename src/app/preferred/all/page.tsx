export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { getAllTags } from '@/features/tag-management/lib/tag-service'
import { findManyEntries } from '@/domain/entry/entry-repository'
import { getAppSettings } from '@/lib/settings-service'
import { EntryCardGrid } from '@/components/entry-card-grid'
import { ReadFilter } from '@/components/read-filter'
import { ScoreThresholdSlider } from '@/components/score-threshold-slider'
import { SortToggle } from '@/components/sort-toggle'
import { parseSortOrder } from '@/domain/entry/entry-list-query'
import type { EntryListQuery } from '@/domain/entry/entry'
import type { ReadFilterValue } from '@/components/read-filter'

interface PageProps {
  searchParams: Promise<{ filter?: string; score?: string; sortOrder?: string }>
}

export default async function PreferredAllPage({ searchParams }: PageProps) {
  const params = await searchParams
  const filter: ReadFilterValue = params.filter === 'all' ? 'all' : 'unread'
  const isUnread = filter === 'unread'
  const sortOrder = parseSortOrder(params.sortOrder)

  const settings = await getAppSettings()
  const scoreThreshold =
    params.score !== undefined ? Number(params.score) : settings.preferredScoreThreshold

  const query: EntryListQuery = { isAnyPreferred: true, isUnread, scoreThreshold, sortOrder }

  const [{ entries, pagination }, allTags] = await Promise.all([
    findManyEntries({ ...query, page: 1 }),
    getAllTags(),
  ])

  return (
    <div className="h-full overflow-y-auto">
      <div className="h-11 border-b border-border/70 flex items-center px-4 gap-2 sticky top-0 material-chrome z-10">
        <span className="text-sm font-medium flex-1 min-w-0 truncate">すべての好みに合う記事</span>
        <span className="text-xs text-muted-foreground shrink-0">
          {pagination.total === 0 ? '記事なし' : `${pagination.total} 件`}
        </span>
        <Suspense>
          <ScoreThresholdSlider value={scoreThreshold} />
        </Suspense>
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
        <EntryCardGrid
          key={`${filter}-${scoreThreshold}-${sortOrder}`}
          initialEntries={entries}
          initialPagination={pagination}
          query={query}
          basePath="/preferred/all"
          allTags={allTags}
        />
      </Suspense>
    </div>
  )
}
