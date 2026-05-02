export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { getAllTags } from '@/lib/tag-service'
import { findManyEntries } from '@/lib/entry-service'
import { getAppSettings } from '@/lib/settings-service'
import { EntryCardGrid } from '@/components/entry-card-grid'
import { ReadFilter } from '@/components/read-filter'
import { ScoreThresholdSlider } from '@/components/score-threshold-slider'
import type { ReadFilterValue } from '@/components/read-filter'

interface PageProps {
  searchParams: Promise<{ filter?: string; score?: string }>
}

export default async function PreferredAllPage({ searchParams }: PageProps) {
  const params = await searchParams
  const filter: ReadFilterValue = params.filter === 'all' ? 'all' : 'unread'
  const isUnread = filter === 'unread'

  const settings = await getAppSettings()
  const scoreThreshold =
    params.score !== undefined ? Number(params.score) : settings.preferredScoreThreshold

  const [{ entries, pagination }, allTags] = await Promise.all([
    findManyEntries({ isAnyPreferred: true, isUnread, page: 1, scoreThreshold }),
    getAllTags(),
  ])

  return (
    <div className="h-full overflow-y-auto">
      <div className="h-11 border-b border-border flex items-center px-4 gap-2 sticky top-0 bg-background/95 backdrop-blur z-10">
        <span className="text-sm font-medium flex-1 min-w-0 truncate">すべての好みに合う記事</span>
        <span className="text-xs text-muted-foreground shrink-0">
          {pagination.total === 0 ? '記事なし' : `${pagination.total} 件`}
        </span>
        <Suspense>
          <ScoreThresholdSlider value={scoreThreshold} />
        </Suspense>
        <Suspense>
          <ReadFilter value={filter} />
        </Suspense>
      </div>
      <Suspense>
        <EntryCardGrid
          key={`${filter}-${scoreThreshold}`}
          initialEntries={entries}
          initialPagination={pagination}
          isAnyPreferred
          isUnread={isUnread}
          scoreThreshold={scoreThreshold}
          basePath="/preferred/all"
          allTags={allTags}
        />
      </Suspense>
    </div>
  )
}
