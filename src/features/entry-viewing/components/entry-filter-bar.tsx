'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
    <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-border bg-background/95 backdrop-blur-sm">
      {/* Title search */}
      <div className="relative flex-1 min-w-28 sm:min-w-40">
        <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none z-10 transition-colors duration-150 ${searchInput ? 'text-primary' : 'text-muted-foreground'}`} />
        <Input
          type="text"
          placeholder="タイトルで検索..."
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          onCompositionStart={() => { isComposingRef.current = true }}
          onCompositionEnd={(e) => handleCompositionEnd(e.currentTarget.value)}
          className={`pl-8 pr-7 text-xs h-8 transition-all duration-150 ${searchInput ? 'border-primary/40 bg-primary/5' : ''}`}
        />
        {searchInput && (
          <button
            onClick={clearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Feed filter */}
      <Select
        value={currentFeedId || '__all__'}
        onValueChange={(v) => updateParam('feedId', v === '__all__' ? null : v)}
      >
        <SelectTrigger className={`h-8 text-xs flex-1 sm:flex-none sm:min-w-28 sm:max-w-44 transition-all duration-150 ${currentFeedId ? 'border-primary/40 bg-primary/5 text-primary font-medium' : ''}`}>
          <SelectValue>
            {currentFeedId
              ? (allFeeds.find((f) => f.id === currentFeedId)?.title ?? currentFeedId)
              : 'すべてのフィード'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">すべてのフィード</SelectItem>
          {allFeeds.map((feed) => (
            <SelectItem key={feed.id} value={feed.id}>
              {feed.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <Select
          value={currentTagId || '__all__'}
          onValueChange={(v) => updateParam('tagId', v === '__all__' ? null : v)}
        >
          <SelectTrigger className={`h-8 text-xs flex-1 sm:flex-none sm:min-w-28 sm:max-w-44 transition-all duration-150 ${currentTagId ? 'border-primary/40 bg-primary/5 text-primary font-medium' : ''}`}>
            <SelectValue>
              {currentTagId
                ? (allTags.find((t) => t.id === currentTagId)?.name ?? currentTagId)
                : 'すべてのタグ'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">すべてのタグ</SelectItem>
            {allTags.map((tag) => (
              <SelectItem key={tag.id} value={tag.id}>
                {tag.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Clear all filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSearchInput('')
            const params = new URLSearchParams(searchParams.toString())
            params.delete('feedId')
            params.delete('tagId')
            params.delete('search')
            params.delete('entryId')
            router.push(`${pathname}?${params.toString()}`, { scroll: false })
          }}
          className="h-8 px-2.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-colors duration-150"
        >
          <X className="h-3 w-3" />
          クリア
        </Button>
      )}
    </div>
  )
}
