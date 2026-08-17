'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { EntryListItem, EntryListQuery } from '@/domain/entry/entry'
import { buildEntriesRequestUrl } from '@/domain/entry/entry-list-query'

/**
 * 記事一覧の追加読み込み（UI コアロジック層）。
 *
 * カードグリッドの無限スクロールと、記事モーダルの「次の記事」送りは、
 * 表示先が違うだけで「同じ EntryListQuery でカーソルを進めながら次を取る」処理は同一なので
 * ここに一本化する。呼び出し側は取得済み id の集合（getKnownIds）と、
 * 新着の反映先（onLoaded）だけを与える。
 */

interface UseEntryPaginationOptions {
  /** 一覧の絞り込み条件。初回取得（SSR）とまったく同じものを渡すこと */
  query: EntryListQuery
  limit: number
  initialHasMore: boolean
  /** 取得済みの末尾。ここから先を取りに行く */
  initialCursorId?: string
  /**
   * 取得済み記事 id。重複排除（distinct）の代表エントリ入れ替わりなどで
   * 既知の記事しか返らなかったことを検知するために使う。
   */
  getKnownIds: () => Set<string>
  onLoaded: (newEntries: EntryListItem[]) => void
}

export interface EntryPagination {
  hasMore: boolean
  isLoading: boolean
  loadMore: () => Promise<void>
  /** モーダル用のスナップショットのように、現在位置を外から差し替える */
  reset: (init: { cursorId?: string; hasMore: boolean }) => void
}

interface EntriesResponse {
  data: EntryListItem[]
  pagination: { hasNext: boolean }
}

export function useEntryPagination(options: UseEntryPaginationOptions): EntryPagination {
  const { initialHasMore, initialCursorId } = options

  const [hasMore, setHasMore] = useState(initialHasMore)
  const [isLoading, setIsLoading] = useState(false)

  // loadMore の同一性を保ったまま最新値を読むための ref。
  // loadMore が毎レンダー作り直されると、これを依存に持つ IntersectionObserver も
  // 作り直され続けてしまう。
  const optionsRef = useRef(options)
  useEffect(() => { optionsRef.current = options })
  const hasMoreRef = useRef(hasMore)
  useEffect(() => { hasMoreRef.current = hasMore }, [hasMore])
  const isLoadingRef = useRef(false)
  // 「一覧の末尾」ではなく「どこまで取得したか」を持つ。未読フィルタのように
  // 表示中の記事が後から消える一覧でも、カーソルが巻き戻らないようにするため。
  const cursorIdRef = useRef<string | undefined>(initialCursorId)

  const loadMore = useCallback(async () => {
    if (isLoadingRef.current || !hasMoreRef.current) return
    isLoadingRef.current = true
    setIsLoading(true)
    try {
      const { query, limit, getKnownIds, onLoaded } = optionsRef.current
      const res = await fetch(buildEntriesRequestUrl(query, { limit, afterId: cursorIdRef.current }))
      if (!res.ok) return
      const json = (await res.json()) as EntriesResponse

      const knownIds = getKnownIds()
      const newEntries = json.data.filter((entry) => !knownIds.has(entry.id))
      // 取得結果が既知の記事だけだと一覧の末尾が変わらず、同じカーソルを送り続けて
      // 追加読み込みが止まる。その場合は応答の末尾 id を引き継いで前へ進める。
      const tail = newEntries[newEntries.length - 1] ?? json.data[json.data.length - 1]
      if (tail) cursorIdRef.current = tail.id

      if (newEntries.length > 0) onLoaded(newEntries)
      setHasMore(json.pagination.hasNext)
    } finally {
      isLoadingRef.current = false
      setIsLoading(false)
    }
  }, [])

  const reset = useCallback((init: { cursorId?: string; hasMore: boolean }) => {
    cursorIdRef.current = init.cursorId
    hasMoreRef.current = init.hasMore
    setHasMore(init.hasMore)
  }, [])

  return { hasMore, isLoading, loadMore, reset }
}
