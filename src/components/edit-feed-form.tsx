'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>URL (read-only)</Label>
        <p className="mt-1 text-sm text-muted-foreground break-all">{feed.url}</p>
      </div>
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          disabled={isSubmitting}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isSubmitting}
          maxLength={1000}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="memo">Memo</Label>
        <Textarea
          id="memo"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          disabled={isSubmitting}
          maxLength={1000}
          className="mt-1"
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">{error}</p>
      )}
      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
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
  )
}
