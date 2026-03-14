import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import FeedForm from '@/components/feed-form'

export default function NewFeedPage() {
  return (
    <main className="container mx-auto py-8 px-4 max-w-2xl">
      <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" />
        Back to feeds
      </Link>
      <h1 className="text-2xl font-bold mb-6">Add New Feed</h1>
      <FeedForm redirectTo="/" />
    </main>
  )
}
