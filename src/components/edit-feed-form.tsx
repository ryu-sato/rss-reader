'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Feed } from '@/types/feed'

interface EditFeedFormProps {
  feed: Feed
}

export default function EditFeedForm({ feed }: EditFeedFormProps) {
  const [title, setTitle] = useState(feed.title)
  const [description, setDescription] = useState(feed.description ?? '')
  const [memo, setMemo] = useState(feed.memo ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('タイトルを入力してください')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/feeds/${feed.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          memo: memo.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error?.message || 'フィードの更新に失敗しました')
        return
      }

      router.push('/feeds')
    } catch {
      setError('予期しないエラーが発生しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="rounded-xl border bg-card">
      {/* URL display section */}
      <div className="px-5 py-4 border-b border-border bg-muted/30 rounded-t-xl">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          フィードURL
        </p>
        <p className="text-sm bg-background border border-border rounded-lg px-3 py-2.5 break-all font-mono text-muted-foreground leading-relaxed">
          {feed.url}
        </p>
      </div>

      <div className="p-5">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              タイトル <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="description" className="text-sm font-medium">説明</Label>
              <span className="text-xs text-muted-foreground tabular-nums">{description.length} / 1000</span>
            </div>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              maxLength={1000}
              placeholder="フィードの説明（任意）"
              className="resize-none"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="memo" className="text-sm font-medium">メモ</Label>
              <span className="text-xs text-muted-foreground tabular-nums">{memo.length} / 1000</span>
            </div>
            <Textarea
              id="memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              disabled={isSubmitting}
              maxLength={1000}
              placeholder="フィードに関するメモ（任意）"
              className="resize-none"
              rows={3}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive bg-destructive/10 border border-destructive/20 px-3 py-2.5 rounded-lg">
              {error}
            </p>
          )}
          <div className="flex gap-3 pt-1">
            <Button type="submit" disabled={isSubmitting} className="gap-2 cursor-pointer">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? '保存中...' : '変更を保存'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/feeds')}
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              キャンセル
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
