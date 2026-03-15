import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import DigestForm from '@/components/digest-form'

export default function NewDigestPage() {
  return (
    <div className="h-full overflow-y-auto">
      <main className="px-8 py-8 max-w-2xl">
        <Link
          href="/digests"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          ダイジェスト一覧に戻る
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mb-1.5">ダイジェストを作成</h1>
        <p className="text-sm text-muted-foreground mb-7">記事のまとめをMarkdown形式で記述します</p>
        <DigestForm mode="create" />
      </main>
    </div>
  )
}
