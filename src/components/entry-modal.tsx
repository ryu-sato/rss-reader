'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { EntryDetail } from '@/types/entry'
import { Button } from '@/components/ui/button'
import { TagInput } from '@/components/tag-input'

interface EntryModalProps {
  entry: EntryDetail
  allTags: Array<{ id: string; name: string; createdAt: Date }>
}

export function EntryModal({ entry, allTags }: EntryModalProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isReadLater, setIsReadLater] = useState(entry.meta?.isReadLater ?? false)
  const [isUpdating, setIsUpdating] = useState(false)

  const closeModal = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('entryId')
    router.push(`/?${params.toString()}`)
  }

  // Auto-mark as read on open (REQ-101)
  useEffect(() => {
    if (!entry.meta?.isRead) {
      fetch(`/api/entries/${entry.id}/meta`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      })
    }
  }, [entry.id, entry.meta?.isRead])

  const toggleReadLater = async () => {
    const newValue = !isReadLater
    setIsReadLater(newValue)
    setIsUpdating(true)
    try {
      const res = await fetch(`/api/entries/${entry.id}/meta`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isReadLater: newValue }),
      })
      if (!res.ok) {
        setIsReadLater(!newValue)
      }
    } catch {
      setIsReadLater(!newValue)
    } finally {
      setIsUpdating(false)
    }
  }

  const goToPrev = async () => {
    const res = await fetch(`/api/entries?beforeId=${entry.id}&limit=1`)
    if (res.ok) {
      const { data } = await res.json()
      if (data?.[0]) {
        const params = new URLSearchParams(searchParams.toString())
        params.set('entryId', data[0].id)
        router.push(`/?${params.toString()}`)
      }
    }
  }

  const goToNext = async () => {
    const res = await fetch(`/api/entries?afterId=${entry.id}&limit=1`)
    if (res.ok) {
      const { data } = await res.json()
      if (data?.[0]) {
        const params = new URLSearchParams(searchParams.toString())
        params.set('entryId', data[0].id)
        router.push(`/?${params.toString()}`)
      }
    }
  }

  const entryTags = entry.tags.map((t) => t.tag)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={entry.title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={goToPrev} aria-label="Previous entry">
              ← Prev
            </Button>
            <Button variant="outline" size="sm" onClick={goToNext} aria-label="Next entry">
              Next →
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={closeModal} aria-label="Close modal">
            ×
          </Button>
        </div>

        <div className="overflow-y-auto flex-1">
          <h2 className="text-xl font-bold mb-2">{entry.title}</h2>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
            <span>{entry.feed.title}</span>
            {entry.publishedAt && (
              <time dateTime={entry.publishedAt.toISOString()}>
                {entry.publishedAt.toLocaleString()}
              </time>
            )}
          </div>

          <div className="flex gap-2 mb-4">
            <a
              href={entry.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary underline"
            >
              Read original article
            </a>
            <Button
              variant={isReadLater ? 'default' : 'outline'}
              size="sm"
              onClick={toggleReadLater}
              disabled={isUpdating}
            >
              {isReadLater ? 'Saved for later' : 'Read later'}
            </Button>
          </div>

          <div className="prose prose-sm max-w-none mb-4">
            <p className="whitespace-pre-wrap">{entry.content ?? entry.description ?? ''}</p>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-2">Tags</h3>
            <TagInput entryId={entry.id} initialTags={entryTags} allTags={allTags} />
          </div>
        </div>
      </div>
    </div>
  )
}
