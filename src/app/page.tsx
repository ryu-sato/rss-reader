import { findManyEntries, getEntryById } from '@/lib/entry-service'
import { getAllTags } from '@/lib/tag-service'
import { EntryList } from '@/components/entry-list'
import { EntryModal } from '@/components/entry-modal'
import { EmptyPanel } from '@/components/empty-panel'

interface PageProps {
  searchParams: Promise<{
    feedId?: string
    tagId?: string
    page?: string
    entryId?: string
  }>
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? '1'))

  const [{ entries, pagination }, allTags] = await Promise.all([
    findManyEntries({
      feedId: params.feedId,
      tagId: params.tagId,
      page,
    }),
    getAllTags(),
  ])

  const selectedEntry = params.entryId ? await getEntryById(params.entryId) : null

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Article List Panel */}
      <div className="w-72 shrink-0 border-r border-border flex flex-col overflow-hidden bg-background">
        <div className="h-11 border-b border-border flex items-center px-4 shrink-0">
          <span className="text-xs text-muted-foreground">
            {pagination.total === 0 ? '記事なし' : `${pagination.total} 件`}
          </span>
        </div>
        <div className="overflow-y-auto flex-1">
          <EntryList entries={entries} pagination={pagination} />
        </div>
      </div>

      {/* Article Viewer Panel */}
      <div className="flex-1 overflow-hidden min-w-0">
        {selectedEntry ? (
          <EntryModal entry={selectedEntry} allTags={allTags} />
        ) : (
          <EmptyPanel />
        )}
      </div>
    </div>
  )
}
