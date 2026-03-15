export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getDigests } from '@/lib/digest-service'
import { BookOpen, Plus } from 'lucide-react'

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function DigestsPage() {
  const { data: digests, total } = await getDigests(1, 50)

  return (
    <div className="h-full overflow-y-auto">
      <div className="h-11 border-b border-border flex items-center px-4 sticky top-0 bg-background/95 backdrop-blur z-10 justify-between">
        <span className="text-xs text-muted-foreground">
          {total === 0 ? 'ダイジェストなし' : `${total} 件`}
        </span>
        <Link
          href="/digests/new"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>新規作成</span>
        </Link>
      </div>

      {digests.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
          <BookOpen className="h-10 w-10 opacity-30" />
          <p className="text-sm">ダイジェストがまだありません</p>
          <p className="text-xs opacity-70">AIが記事をまとめると、ここに表示されます</p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {digests.map((digest) => (
            <li key={digest.id}>
              <Link
                href={`/digests/${digest.id}`}
                className="flex flex-col gap-1 px-4 py-3 hover:bg-accent transition-colors"
              >
                <span className="text-sm font-medium line-clamp-1">
                  {digest.title ?? formatDate(digest.createdAt)}
                </span>
                {digest.title && (
                  <span className="text-xs text-muted-foreground">
                    {formatDate(digest.createdAt)}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
