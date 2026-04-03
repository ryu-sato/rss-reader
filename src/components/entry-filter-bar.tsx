'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'

interface Feed {
  id: string
  title: string
}

interface Tag {
  id: string
  name: string
}

interface EntryFilterBarProps {
  allFeeds: Feed[]
  allTags: Tag[]
}

export function EntryFilterBar({ allFeeds, allTags }: EntryFilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentFeedId = searchParams.get('feedId') ?? ''
  const currentTagId = searchParams.get('tagId') ?? ''
  const currentSearch = searchParams.get('search') ?? ''

  const [searchInput, setSearchInput] = useState(currentSearch)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isComposingRef = useRef(false)

  // Sync input if URL param changes externally (e.g. back/forward)
  useEffect(() => {
    setSearchInput(searchParams.get('search') ?? '')
  }, [searchParams])

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('entryId')
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const handleSearchChange = (value: string) => {
    setSearchInput(value)
    if (isComposingRef.current) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updateParam('search', value || null)
    }, 300)
  }

  const handleCompositionEnd = (value: string) => {
    isComposingRef.current = false
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updateParam('search', value || null)
    }, 300)
  }

  const clearSearch = () => {
    setSearchInput('')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    updateParam('search', null)
  }

  const hasFilters = currentFeedId || currentTagId || currentSearch

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-border bg-background/95 backdrop-blur-sm">
      {/* Title search */}
      <div className="relative flex-1 min-w-40">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="タイトルで検索..."
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          onCompositionStart={() => { isComposingRef.current = true }}
          onCompositionEnd={(e) => handleCompositionEnd(e.currentTarget.value)}
          className="w-full h-8 pl-8 pr-7 text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow"
        />
        {searchInput && (
          <button
            onClick={clearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Feed filter */}
      <select
        value={currentFeedId}
        onChange={(e) => updateParam('feedId', e.target.value || null)}
        className="h-8 px-2 text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring/40 flex-1 sm:flex-none sm:min-w-28 sm:max-w-44 truncate transition-shadow"
      >
        <option value="">すべてのフィード</option>
        {allFeeds.map((feed) => (
          <option key={feed.id} value={feed.id}>
            {feed.title}
          </option>
        ))}
      </select>

      {/* Tag filter */}
      <select
        value={currentTagId}
        onChange={(e) => updateParam('tagId', e.target.value || null)}
        className="h-8 px-2 text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring/40 flex-1 sm:flex-none sm:min-w-28 sm:max-w-44 truncate transition-shadow"
      >
        <option value="">すべてのタグ</option>
        {allTags.map((tag) => (
          <option key={tag.id} value={tag.id}>
            {tag.name}
          </option>
        ))}
      </select>

      {/* Clear all filters */}
      {hasFilters && (
        <button
          onClick={() => {
            setSearchInput('')
            const params = new URLSearchParams(searchParams.toString())
            params.delete('feedId')
            params.delete('tagId')
            params.delete('search')
            params.delete('entryId')
            router.push(`${pathname}?${params.toString()}`, { scroll: false })
          }}
          className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <X className="h-3 w-3" />
          クリア
        </button>
      )}
    </div>
  )
}
