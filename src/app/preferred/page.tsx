export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { ThumbsUp, Layers } from 'lucide-react'
import { getAllPreferences } from '@/lib/preference-service'

export default async function PreferredPage() {
  const preferences = await getAllPreferences()

  return (
    <div className="h-full overflow-y-auto">
      <div className="h-11 border-b border-border flex items-center px-4 sticky top-0 bg-background/95 backdrop-blur z-10">
        <span className="text-sm font-medium">お好みの記事</span>
      </div>
      <div className="p-4 space-y-2">
        {preferences.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            <Link href="/preferences" className="underline underline-offset-2">
              好みの設定
            </Link>
            から好みを追加してください。
          </p>
        ) : (
          <>
            <Link
              href="/preferred/all"
              className="flex items-center gap-3 px-4 py-3 rounded-lg border border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors"
            >
              <Layers className="h-4 w-4 shrink-0 text-primary" />
              <span className="text-sm font-medium text-primary">すべての好みに合う記事</span>
            </Link>
            {preferences.map((p) => (
              <Link
                key={p.id}
                href={`/preferred/${p.id}`}
                className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border hover:bg-accent transition-colors"
              >
                <ThumbsUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm">{p.text}</span>
              </Link>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
