import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getFeedById } from '@/lib/feed-service'
import EditFeedForm from '@/components/edit-feed-form'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditFeedPage({ params }: Props) {
  const { id } = await params

  let feed
  try {
    feed = await getFeedById(id)
  } catch {
    notFound()
  }

  return (
    <main className="py-8 max-w-2xl">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to feeds
      </Link>
      <h1 className="text-2xl font-bold tracking-tight mb-1">Edit Feed</h1>
      <p className="text-sm text-muted-foreground mb-6">Update the details for this RSS feed</p>
      <EditFeedForm feed={feed} />
    </main>
  )
}
