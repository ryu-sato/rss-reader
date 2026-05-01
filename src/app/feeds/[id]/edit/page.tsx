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
    <div className="h-full overflow-y-auto">
      <main className="px-4 py-6 sm:px-8 sm:py-8 max-w-2xl">
        <Link
          href="/feeds"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          フィード管理に戻る
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mb-1.5">フィードを編集</h1>
        <p className="text-sm text-muted-foreground mb-7">フィードのタイトルや説明を更新します</p>
        <EditFeedForm feed={feed} />
      </main>
    </div>
  )
}
