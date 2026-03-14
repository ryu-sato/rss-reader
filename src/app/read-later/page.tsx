import { getAllTags } from '@/lib/tag-service'
import { findManyEntries, getEntryById } from '@/lib/entry-service'
import { EntryList } from '@/components/entry-list'
import { EntryModal } from '@/components/entry-modal'

interface PageProps {
  searchParams: Promise<{
    page?: string
    entryId?: string
  }>
}

export default async function ReadLaterPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? '1'))

  const [{ entries, pagination }, allTags] = await Promise.all([
    findManyEntries({ isReadLater: true, page }),
    getAllTags(),
  ])

  const selectedEntry = params.entryId ? await getEntryById(params.entryId) : null

  return (
    <main className="py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">あとで読む</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {pagination.total === 0 ? 'エントリーはありません' : `${pagination.total} 件`}
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="text-muted-foreground">「あとで読む」に追加したエントリーはありません。</div>
      ) : (
        <EntryList entries={entries} pagination={pagination} basePath="/read-later" />
      )}

      {selectedEntry && <EntryModal entry={selectedEntry} allTags={allTags} />}
    </main>
  )
}
