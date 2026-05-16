'use client'

import { useState } from 'react'
import { Tag, X, CheckSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface BulkTagBarProps {
  selectedCount: number
  totalCount: number
  allTags: Array<{ id: string; name: string }>
  onApplyTag: (tagName: string) => Promise<void>
  onSelectAll: () => void
  onClearSelection: () => void
  onExitSelectionMode: () => void
}

export function BulkTagBar({
  selectedCount,
  totalCount,
  allTags,
  onApplyTag,
  onSelectAll,
  onClearSelection,
  onExitSelectionMode,
}: BulkTagBarProps) {
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [appliedCount, setAppliedCount] = useState<number | null>(null)

  const trimmedInput = inputValue.toLowerCase().trim()
  const suggestions = trimmedInput
    ? allTags.filter((t) => t.name.includes(trimmedInput))
    : allTags.slice(0, 8)

  const handleApply = async () => {
    if (!inputValue.trim() || selectedCount === 0) return
    setIsLoading(true)
    try {
      await onApplyTag(inputValue.trim())
      setAppliedCount(selectedCount)
      setInputValue('')
      setTimeout(() => setAppliedCount(null), 2500)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 pl-4 pr-2 py-2.5 bg-card border border-border/80 rounded-2xl shadow-2xl shadow-black/25 max-w-[92vw] animate-in slide-in-from-bottom-4 duration-300">
      {/* Selected count */}
      <div className="flex items-center gap-1.5 shrink-0">
        <CheckSquare className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm font-semibold text-foreground whitespace-nowrap">
          {selectedCount}件選択中
        </span>
      </div>

      <div className="w-px h-4 bg-border/60 mx-0.5 shrink-0" />

      {/* Tag input with autocomplete */}
      <div className="relative">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleApply()
            }
          }}
          placeholder="タグ名を入力..."
          disabled={isLoading || selectedCount === 0}
          className="h-8 text-xs w-28 sm:w-36 md:w-44"
          aria-label="一括タグ名入力"
        />
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute bottom-full mb-1 w-full min-w-36 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto z-10">
            {suggestions.map((tag) => (
              <li key={tag.id}>
                <button
                  className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                  onMouseDown={() => setInputValue(tag.name)}
                >
                  {tag.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Apply button */}
      <Button
        size="sm"
        onClick={handleApply}
        disabled={!inputValue.trim() || isLoading || selectedCount === 0}
        className="shrink-0 h-8 text-xs"
      >
        <Tag className="h-3.5 w-3.5 mr-1.5" />
        {isLoading
          ? '適用中...'
          : appliedCount !== null
            ? `${appliedCount}件に適用済`
            : 'タグを付ける'}
      </Button>

      <div className="w-px h-4 bg-border/60 mx-0.5 shrink-0" />

      {/* Select all */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onSelectAll}
        disabled={isLoading || selectedCount === totalCount}
        className="shrink-0 h-8 text-xs text-muted-foreground hover:text-foreground hidden sm:inline-flex"
      >
        すべて選択
      </Button>

      {/* Clear selection */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
        disabled={isLoading || selectedCount === 0}
        className="shrink-0 h-8 text-xs text-muted-foreground hover:text-foreground"
      >
        選択解除
      </Button>

      {/* Exit selection mode */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onExitSelectionMode}
        disabled={isLoading}
        aria-label="選択モードを終了"
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
