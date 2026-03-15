export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getDigestById } from '@/lib/digest-service'
import { AppError } from '@/lib/errors'
import DigestForm from '@/components/digest-form'

export default async function EditDigestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let digest
  try {
    digest = await getDigestById(id)
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 404) {
      notFound()
    }
    throw error
  }

  return (
    <div className="h-full overflow-y-auto">
      <main className="px-8 py-8 max-w-2xl">
        <Link
          href={`/digests/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          ダイジェストに戻る
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mb-1.5">ダイジェストを編集</h1>
        <p className="text-sm text-muted-foreground mb-7">内容を編集してMarkdown形式で保存します</p>
        <DigestForm
          mode="edit"
          digestId={id}
          defaultValues={{ title: digest.title, content: digest.content }}
        />
      </main>
    </div>
  )
}
