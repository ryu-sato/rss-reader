import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import FeedForm from '@/components/feed-form'

export default function NewFeedPage() {
  return (
    <div className="h-full overflow-y-auto">
      <main className="px-8 py-8 max-w-2xl">
        <Link
          href="/feeds"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          フィード管理に戻る
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mb-1.5">フィードを追加</h1>
        <p className="text-sm text-muted-foreground mb-7">RSSまたはAtomフィードのURLを入力して登録します</p>
        <FeedForm redirectTo="/feeds" />
      </main>
    </div>
  )
}
