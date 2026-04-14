'use client'

import { useState, useCallback, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

interface ScoreThresholdSliderProps {
  value: number
}

export function ScoreThresholdSlider({ value }: ScoreThresholdSliderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [localValue, setLocalValue] = useState(value)
  const [, startTransition] = useTransition()

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = Number(e.target.value)
      setLocalValue(newValue)
    },
    []
  )

  const handleCommit = useCallback(
    (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
      const newValue = Number(e.currentTarget.value)
      setLocalValue(newValue)
      const params = new URLSearchParams(searchParams.toString())
      params.set('score', String(newValue))
      // filter パラメータは保持する
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [router, pathname, searchParams]
  )

  return (
    <div className="flex items-center gap-2 shrink-0">
      <span className="text-xs text-muted-foreground whitespace-nowrap">スコア</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={localValue}
        onChange={handleChange}
        onMouseUp={handleCommit}
        onTouchEnd={handleCommit}
        className="w-24 h-1.5 accent-primary cursor-pointer"
        title={`スコア閾値: ${localValue.toFixed(2)}`}
      />
      <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
        {localValue.toFixed(2)}
      </span>
    </div>
  )
}
