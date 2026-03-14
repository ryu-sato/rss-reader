'use client'

import { useState } from 'react'
import type { Tag } from '@/types/entry'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface TagInputProps {
  entryId: string
  initialTags: Tag[]
  allTags: Tag[]
}

export function TagInput({ entryId, initialTags, allTags }: TagInputProps) {
  const [tags, setTags] = useState<Tag[]>(initialTags)
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const assignedTagIds = new Set(tags.map((t) => t.id))
  const suggestions = allTags.filter(
    (t) => !assignedTagIds.has(t.id) && t.name.includes(inputValue.toLowerCase().trim())
  )

  const addTag = async (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setIsLoading(true)
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, entryId }),
      })
      if (res.ok) {
        const { data } = await res.json()
        setTags((prev) => {
          if (prev.some((t) => t.id === data.id)) return prev
          return [...prev, data]
        })
        setInputValue('')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const removeTag = async (tagId: string) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/tags/${tagId}/entries/${entryId}`, { method: 'DELETE' })
      if (res.ok) {
        setTags((prev) => prev.filter((t) => t.id !== tagId))
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag(inputValue)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-secondary rounded-md"
          >
            {tag.name}
            <button
              onClick={() => removeTag(tag.id)}
              disabled={isLoading}
              aria-label={`Remove tag ${tag.name}`}
              className="hover:text-destructive"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="relative">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add tag..."
          disabled={isLoading}
          aria-label="Tag input"
        />
        {inputValue && suggestions.length > 0 && (
          <ul className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-md">
            {suggestions.map((tag) => (
              <li key={tag.id}>
                <button
                  className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                  onClick={() => addTag(tag.name)}
                >
                  {tag.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {inputValue && (
        <Button size="sm" variant="outline" onClick={() => addTag(inputValue)} disabled={isLoading}>
          Add &ldquo;{inputValue}&rdquo;
        </Button>
      )}
    </div>
  )
}
