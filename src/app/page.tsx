import Link from 'next/link'
import { getAllFeeds } from '@/lib/feed-service'
import FeedList from '@/components/feed-list'
import { Button } from '@/components/ui/button'

export default async function Home() {
  const feeds = await getAllFeeds()

  return (
    <main className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">RSS Feeds</h1>
        <Link href="/feeds/new">
          <Button>Add Feed</Button>
        </Link>
      </div>
      <FeedList feeds={feeds} />
    </main>
  )
}
