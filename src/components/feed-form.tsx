'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Link2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface FeedFormProps {
  redirectTo?: string
}

export default function FeedForm({ redirectTo }: FeedFormProps) {
  const [url, setUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setError('URLはhttp://またはhttps://で始まる必要があります')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error?.message || 'フィードの登録に失敗しました')
        return
      }

      setUrl('')
      if (redirectTo) {
        router.push(redirectTo)
      } else {
        router.refresh()
      }
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
          <Link2 className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">フィードURLを入力</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            購読するRSSまたはAtomフィードのURLを貼り付けてください
          </p>
        </div>
      </div>
      <div className="p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url" className="text-sm font-medium">
              フィードURL <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/feed.xml"
              required
              disabled={isSubmitting}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              http:// または https:// で始まるURLを入力してください
            </p>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive bg-destructive/10 border border-destructive/20 px-3 py-2.5 rounded-lg">
              {error}
            </p>
          )}
          <div className="pt-1">
            <Button type="submit" disabled={isSubmitting} className="gap-2 cursor-pointer">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? '登録中...' : 'フィードを登録'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
