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
    <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
      <button
        onClick={() => setFilter('unread')}
        className={`text-xs px-2.5 py-1 rounded transition-colors ${
          value === 'unread'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        未読
      </button>
      <button
        onClick={() => setFilter('all')}
        className={`text-xs px-2.5 py-1 rounded transition-colors ${
          value === 'all'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        すべての記事
      </button>
    </div>
  )
}
