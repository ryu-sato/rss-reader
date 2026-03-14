'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface Feed {
  id: string
  title: string
}

interface Tag {
  id: string
  name: string
}

export function EntryFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [feeds, setFeeds] = useState<Feed[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/feeds').then((r) => r.json()),
      fetch('/api/tags').then((r) => r.json()),
    ])
      .then(([feedsRes, tagsRes]) => {
        if (feedsRes.success) setFeeds(feedsRes.data)
        if (tagsRes.success) setTags(tagsRes.data)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const setFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.set('page', '1')
    params.delete('entryId')
    router.push(`/?${params.toString()}`)
  }

  const clearFilters = () => {
    const params = new URLSearchParams()
    router.push(`/?${params.toString()}`)
  }

  const currentFeedId = searchParams.get('feedId')
  const currentTagId = searchParams.get('tagId')

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <select
        aria-label="Filter by feed"
        value={currentFeedId ?? ''}
        onChange={(e) => setFilter('feedId', e.target.value || null)}
        disabled={isLoading}
        className="border rounded-md px-3 py-1.5 text-sm bg-background"
      >
        <option value="">All feeds</option>
        {feeds.map((feed) => (
          <option key={feed.id} value={feed.id}>
            {feed.title}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by tag"
        value={currentTagId ?? ''}
        onChange={(e) => setFilter('tagId', e.target.value || null)}
        disabled={isLoading}
        className="border rounded-md px-3 py-1.5 text-sm bg-background"
      >
        <option value="">All tags</option>
        {tags.map((tag) => (
          <option key={tag.id} value={tag.id}>
            {tag.name}
          </option>
        ))}
      </select>

      {(currentFeedId || currentTagId) && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          Clear filters
        </Button>
      )}
    </div>
  )
}
