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
    <div className="flex items-center bg-muted/70 rounded-lg p-0.5 gap-px">
      <button
        onClick={() => setSort('desc')}
        className={`text-xs px-3 py-1 rounded-md font-medium transition-all duration-150 ${
          value === 'desc'
            ? 'bg-background text-primary shadow-sm ring-1 ring-border/50'
            : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
        }`}
      >
        新しい順
      </button>
      <button
        onClick={() => setSort('asc')}
        className={`text-xs px-3 py-1 rounded-md font-medium transition-all duration-150 ${
          value === 'asc'
            ? 'bg-background text-primary shadow-sm ring-1 ring-border/50'
            : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
        }`}
      >
        古い順
      </button>
    </div>
  )
}
