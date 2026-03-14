import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getAllFeeds } from '@/lib/feed-service'
import FeedList from '@/components/feed-list'
import { Button } from '@/components/ui/button'

export default async function Home() {
  const feeds = await getAllFeeds()

  return (
    <main className="py-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your Feeds</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {feeds.length === 0
              ? 'No feeds yet'
              : `${feeds.length} feed${feeds.length > 1 ? 's' : ''} registered`}
          </p>
        </div>
        <Link href="/feeds/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Feed
          </Button>
        </Link>
      </div>
      <FeedList feeds={feeds} />
    </main>
  )
}
