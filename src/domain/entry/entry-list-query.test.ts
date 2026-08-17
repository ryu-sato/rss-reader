import { describe, it, expect } from 'vitest'
import {
  buildEntriesSearchParams,
  buildEntriesRequestUrl,
  parseEntryListQuery,
  parseEntryPageParams,
  parseSortOrder,
} from './entry-list-query'
import type { EntryListQuery } from '@/domain/entry/entry'

describe('buildEntriesSearchParams / parseEntryListQuery', () => {
  it('全ての絞り込み条件が URL を往復しても失われない', () => {
    const query: EntryListQuery = {
      feedId: 'feed-1',
      tagId: 'tag-1',
      search: 'rust',
      isReadLater: true,
      isUnread: true,
      userPreferenceId: 'pref-1',
      isAnyPreferred: true,
      sortOrder: 'asc',
      scoreThreshold: 0.7,
    }

    expect(parseEntryListQuery(buildEntriesSearchParams(query))).toEqual(query)
  })

  it('未指定・false の条件は送らない（サーバ側の既定に委ねる）', () => {
    const params = buildEntriesSearchParams({ isUnread: false, sortOrder: 'desc', search: '' })

    expect(params.has('isUnread')).toBe(false)
    expect(params.has('search')).toBe(false)
    expect(params.get('sortOrder')).toBe('desc')
  })

  it('ページ位置は絞り込み条件と一緒にシリアライズされる', () => {
    const url = buildEntriesRequestUrl({ sortOrder: 'asc' }, { limit: 20, afterId: 'entry-9' })
    const searchParams = new URL(url, 'http://localhost').searchParams

    expect(url.startsWith('/api/entries?')).toBe(true)
    expect(parseEntryPageParams(searchParams)).toEqual({
      page: undefined,
      limit: 20,
      afterId: 'entry-9',
      beforeId: undefined,
    })
  })

  it('sortOrder の既定は新しい順', () => {
    expect(parseSortOrder(undefined)).toBe('desc')
    expect(parseSortOrder('bogus')).toBe('desc')
    expect(parseSortOrder('asc')).toBe('asc')
    expect(parseEntryListQuery(new URLSearchParams()).sortOrder).toBe('desc')
  })

  it('数値として読めない値は「指定なし」に倒す（NaN を Prisma に渡さない）', () => {
    const searchParams = new URLSearchParams({ scoreThreshold: 'abc', page: 'x' })

    expect(parseEntryListQuery(searchParams).scoreThreshold).toBeUndefined()
    expect(parseEntryPageParams(searchParams).page).toBeUndefined()
  })
})
