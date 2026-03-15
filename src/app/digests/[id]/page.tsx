export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getDigestById } from '@/lib/digest-service'
import { AppError } from '@/lib/errors'
import ReactMarkdown from 'react-markdown'
import { ChevronLeft } from 'lucide-react'

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function DigestDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
      <div className="h-11 border-b border-border flex items-center px-4 sticky top-0 bg-background/95 backdrop-blur z-10 gap-3">
        <Link
          href="/digests"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span>一覧へ</span>
        </Link>
        <span className="text-xs text-muted-foreground">{formatDate(digest.createdAt)}</span>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6">
        {digest.title && (
          <h1 className="text-xl font-bold mb-4">{digest.title}</h1>
        )}
        <article className="prose prose-sm prose-neutral dark:prose-invert max-w-none">
          <ReactMarkdown>{digest.content}</ReactMarkdown>
        </article>
      </div>
    </div>
  )
}
