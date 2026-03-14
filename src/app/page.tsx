import Link from 'next/link'
import { Plus } from 'lucide-react'
import { findManyEntries, getEntryById } from '@/lib/entry-service'
import { getAllTags } from '@/lib/tag-service'
import { EntryList } from '@/components/entry-list'
import { EntryModal } from '@/components/entry-modal'
import { EntryFilter } from '@/components/entry-filter'
import { Button } from '@/components/ui/button'

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
    <main className="py-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">RSS Reader</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {pagination.total === 0 ? 'No entries yet' : `${pagination.total} entries`}
          </p>
        </div>
        <Link href="/feeds/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Feed
          </Button>
        </Link>
      </div>

      <EntryFilter />
      <EntryList entries={entries} pagination={pagination} />

      {selectedEntry && <EntryModal entry={selectedEntry} allTags={allTags} />}
    </main>
  )
}
