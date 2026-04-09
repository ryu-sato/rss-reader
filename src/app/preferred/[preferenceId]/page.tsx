export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getAllTags } from '@/lib/tag-service'
import { findManyEntries } from '@/lib/entry-service'
import { getAllPreferences } from '@/lib/preference-service'
import { EntryCardGrid } from '@/components/entry-card-grid'
import { ReadFilter } from '@/components/read-filter'
import type { ReadFilterValue } from '@/components/read-filter'

interface PageProps {
  params: Promise<{ preferenceId: string }>
  searchParams: Promise<{ filter?: string }>
}

export default async function PreferredByPreferencePage({ params, searchParams }: PageProps) {
  const { preferenceId } = await params
  const resolvedSearchParams = await searchParams
  const filter: ReadFilterValue = resolvedSearchParams.filter === 'all' ? 'all' : 'unread'
  const isUnread = filter === 'unread'

  const [{ entries, pagination }, allTags, preferences] = await Promise.all([
    findManyEntries({ userPreferenceId: preferenceId, isUnread, page: 1 }),
    getAllTags(),
    getAllPreferences(),
  ])

  const preference = preferences.find((p) => p.id === preferenceId)
  if (!preference) return notFound()

  return (
    <div className="h-full overflow-y-auto">
      <div className="h-11 border-b border-border flex items-center px-4 gap-2 sticky top-0 bg-background/95 backdrop-blur z-10">
        <span className="text-sm font-medium flex-1 truncate">{preference.text}</span>
        <span className="text-xs text-muted-foreground shrink-0">
          {pagination.total === 0 ? '記事なし' : `${pagination.total} 件`}
        </span>
        <Suspense>
          <ReadFilter value={filter} />
        </Suspense>
      </div>
      <Suspense>
        <EntryCardGrid
          key={filter}
          initialEntries={entries}
          initialPagination={pagination}
          userPreferenceId={preferenceId}
          isUnread={isUnread}
          basePath={`/preferred/${preferenceId}`}
          allTags={allTags}
        />
      </Suspense>
    </div>
  )
}
