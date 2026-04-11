'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export type SortOrderValue = 'desc' | 'asc'

interface SortToggleProps {
  value: SortOrderValue
}

export function SortToggle({ value }: SortToggleProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const setSort = (next: SortOrderValue) => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('entryId')
    if (next === 'desc') {
      params.delete('sortOrder')
    } else {
      params.set('sortOrder', next)
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
      <button
        onClick={() => setSort('desc')}
        className={`text-xs px-2.5 py-1 rounded transition-colors ${
          value === 'desc'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        新しい順
      </button>
      <button
        onClick={() => setSort('asc')}
        className={`text-xs px-2.5 py-1 rounded transition-colors ${
          value === 'asc'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        古い順
      </button>
    </div>
  )
}
