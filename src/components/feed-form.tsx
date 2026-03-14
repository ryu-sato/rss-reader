'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
      setError('URL must start with http:// or https://')
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
        setError(data.error?.message || 'Failed to register feed')
        return
      }

      setUrl('')
      if (redirectTo) {
        router.push(redirectTo)
      } else {
        router.refresh()
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="url">RSS Feed URL</Label>
        <Input
          id="url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/feed.xml"
          required
          disabled={isSubmitting}
          className="mt-1"
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">{error}</p>
      )}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Registering...' : 'Register Feed'}
      </Button>
    </form>
  )
}
