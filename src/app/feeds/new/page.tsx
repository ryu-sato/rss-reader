import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import FeedForm from '@/components/feed-form'

export default function NewFeedPage() {
  return (
    <main className="py-8 max-w-2xl">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to feeds
      </Link>
      <h1 className="text-2xl font-bold tracking-tight mb-1">Add New Feed</h1>
      <p className="text-sm text-muted-foreground mb-6">Subscribe to an RSS or Atom feed</p>
      <FeedForm redirectTo="/" />
    </main>
  )
}
