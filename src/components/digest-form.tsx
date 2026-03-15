'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface DigestFormProps {
  mode: 'create' | 'edit'
  digestId?: string
  defaultValues?: {
    title?: string | null
    content?: string
  }
}

export default function DigestForm({ mode, digestId, defaultValues }: DigestFormProps) {
  const [title, setTitle] = useState(defaultValues?.title ?? '')
  const [content, setContent] = useState(defaultValues?.content ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!content.trim()) {
      setError('本文は必須です')
      return
    }

    setIsSubmitting(true)
    try {
      const url = mode === 'edit' ? `/api/digests/${digestId}` : '/api/digests'
      const method = mode === 'edit' ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          title: title.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error?.message || '保存に失敗しました')
        return
      }

      router.push(`/digests/${data.data.id}`)
      router.refresh()
    } catch {
      setError('予期しないエラーが発生しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-start gap-3 px-5 py-4 border-b border-border bg-muted/30 rounded-t-xl">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 shrink-0 mt-0.5">
          <FileText className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            {mode === 'create' ? 'ダイジェストを作成' : 'ダイジェストを編集'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Markdown形式で記述できます
          </p>
        </div>
      </div>
      <div className="p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              タイトル <span className="text-muted-foreground text-xs ml-1">（任意）</span>
            </Label>
            <Input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ダイジェストのタイトル"
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content" className="text-sm font-medium">
              本文 <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="## 今週のまとめ&#10;&#10;- 記事1の要約...&#10;- 記事2の要約..."
              required
              disabled={isSubmitting}
              className="min-h-[320px] font-mono text-sm resize-y"
            />
            <p className="text-xs text-muted-foreground">
              Markdown形式をサポートしています（見出し、リスト、リンクなど）
            </p>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive bg-destructive/10 border border-destructive/20 px-3 py-2.5 rounded-lg">
              {error}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={isSubmitting} className="gap-2 cursor-pointer">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? '保存中...' : mode === 'create' ? '作成する' : '保存する'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={isSubmitting}
              className="cursor-pointer"
              onClick={() => router.back()}
            >
              キャンセル
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
