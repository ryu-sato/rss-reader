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
    <main className="container mx-auto py-8 px-4 max-w-2xl">
      <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" />
        Back to feeds
      </Link>
      <h1 className="text-2xl font-bold mb-6">Edit Feed</h1>
      <EditFeedForm feed={feed} />
    </main>
  )
}
