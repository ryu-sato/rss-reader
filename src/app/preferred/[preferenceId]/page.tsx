export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getAllTags } from '@/features/tag-management/lib/tag-service'
import { findManyEntries } from '@/domain/entry/entry-repository'
import { getAllPreferences } from '@/lib/preference-service'
import { getAppSettings } from '@/lib/settings-service'
import { EntryCardGrid } from '@/components/entry-card-grid'
import { ReadFilter } from '@/components/read-filter'
import { ScoreThresholdSlider } from '@/components/score-threshold-slider'
import { SortToggle } from '@/components/sort-toggle'
import { parseSortOrder } from '@/domain/entry/entry-list-query'
import type { EntryListQuery } from '@/domain/entry/entry'
import type { ReadFilterValue } from '@/components/read-filter'

interface PageProps {
  params: Promise<{ preferenceId: string }>
  searchParams: Promise<{ filter?: string; score?: string; sortOrder?: string }>
}

export default async function PreferredByPreferencePage({ params, searchParams }: PageProps) {
  const { preferenceId } = await params
  const resolvedSearchParams = await searchParams
  const filter: ReadFilterValue = resolvedSearchParams.filter === 'all' ? 'all' : 'unread'
  const isUnread = filter === 'unread'
  const sortOrder = parseSortOrder(resolvedSearchParams.sortOrder)

  const settings = await getAppSettings()
  const scoreThreshold =
    resolvedSearchParams.score !== undefined
      ? Number(resolvedSearchParams.score)
      : settings.preferredScoreThreshold

  const query: EntryListQuery = { userPreferenceId: preferenceId, isUnread, scoreThreshold, sortOrder }

  const [{ entries, pagination }, allTags, preferences] = await Promise.all([
    findManyEntries({ ...query, page: 1 }),
    getAllTags(),
    getAllPreferences(),
  ])

  const preference = preferences.find((p) => p.id === preferenceId)
  if (!preference) return notFound()

  return (
    <div className="h-full overflow-y-auto">
      <div className="h-11 border-b border-border/70 flex items-center px-4 gap-2 sticky top-0 material-chrome z-10">
        <span className="text-sm font-medium flex-1 min-w-0 truncate">{preference.name}</span>
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
          basePath={`/preferred/${preferenceId}`}
          allTags={allTags}
        />
      </Suspense>
    </div>
  )
}
