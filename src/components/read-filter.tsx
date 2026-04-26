'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export type ReadFilterValue = 'unread' | 'all'

interface ReadFilterProps {
  value: ReadFilterValue
}

export function ReadFilter({ value }: ReadFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const setFilter = (next: ReadFilterValue) => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('entryId')
    if (next === 'unread') {
      params.delete('filter')
    } else {
      params.set('filter', next)
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex items-center bg-muted/70 rounded-lg p-0.5 gap-px">
      <button
        onClick={() => setFilter('unread')}
        className={`text-xs px-3 py-1 rounded-md font-medium transition-all duration-150 ${
          value === 'unread'
            ? 'bg-background text-primary shadow-sm ring-1 ring-border/50'
            : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
        }`}
      >
        未読
      </button>
      <button
        onClick={() => setFilter('all')}
        className={`text-xs px-3 py-1 rounded-md font-medium transition-all duration-150 ${
          value === 'all'
            ? 'bg-background text-primary shadow-sm ring-1 ring-border/50'
            : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
        }`}
      >
        すべて
      </button>
    </div>
  )
}
