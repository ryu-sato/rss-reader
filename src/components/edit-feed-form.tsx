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
      setError('Title cannot be empty')
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
        setError(data.error?.message || 'Failed to update feed')
        return
      }

      router.push('/')
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="rounded-xl border bg-card p-6 space-y-6">
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
          Feed URL
        </p>
        <p className="text-sm bg-muted rounded-lg px-3 py-2 break-all font-mono text-muted-foreground">
          {feed.url}
        </p>
      </div>

      <div className="border-t" />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={isSubmitting}
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <Label htmlFor="description">Description</Label>
            <span className="text-xs text-muted-foreground">{description.length}/1000</span>
          </div>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSubmitting}
            maxLength={1000}
            placeholder="Optional description for this feed"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <Label htmlFor="memo">Memo</Label>
            <span className="text-xs text-muted-foreground">{memo.length}/1000</span>
          </div>
          <Textarea
            id="memo"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            disabled={isSubmitting}
            maxLength={1000}
            placeholder="Personal notes about this feed"
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
