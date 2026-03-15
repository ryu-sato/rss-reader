export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getDigestById } from '@/lib/digest-service'
import { AppError } from '@/lib/errors'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import { ChevronLeft, Pencil } from 'lucide-react'
import DeleteDigestButton from '@/components/delete-digest-button'

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
      {/* Sticky header */}
      <div className="h-11 border-b border-border flex items-center px-4 sticky top-0 bg-background/95 backdrop-blur z-10">
        <Link
          href="/digests"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span>一覧へ</span>
        </Link>
        <div className="flex items-center gap-3 ml-auto">
          <Link
            href={`/digests/${id}/edit`}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>編集</span>
          </Link>
          <DeleteDigestButton digestId={id} />
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-8">
        {/* Meta */}
        <p className="text-xs text-muted-foreground mb-5">{formatDate(digest.createdAt)}</p>

        {/* Title */}
        {digest.title && (
          <h1 className="text-2xl font-bold leading-snug tracking-tight mb-7 pb-6 border-b border-border">
            {digest.title}
          </h1>
        )}

        {/* Body */}
        <article className="prose prose-sm prose-neutral dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, rehypeSanitize]}>{digest.content}</ReactMarkdown>
        </article>
      </div>
    </div>
  )
}
