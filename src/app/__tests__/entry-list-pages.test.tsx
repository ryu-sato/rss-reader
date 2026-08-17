import React from 'react'
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { prisma } from '@/domain/shared/db'
import { EntryCardGrid } from '@/components/entry-card-grid'
import {
  buildEntriesSearchParams,
  parseEntryListQuery,
} from '@/features/entry-viewing/lib/entry-list-query'
import type { EntryListQuery } from '@/features/entry-viewing/types/entry'

// 記事一覧ページの初回取得だけを差し替える（タグ・好み・設定は実 DB のまま）
vi.mock('@/lib/entry-service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/entry-service')>()),
  findManyEntries: vi.fn(async () => ({
    entries: [],
    pagination: { page: 1, limit: 20, total: 0, hasNext: false, hasPrev: false },
  })),
}))

import { findManyEntries } from '@/lib/entry-service'
import Home from '@/app/page'
import ReadLaterPage from '@/app/read-later/page'
import PreferredAllPage from '@/app/preferred/all/page'
import PreferredByPreferencePage from '@/app/preferred/[preferenceId]/page'

const mockFindManyEntries = vi.mocked(findManyEntries)

/**
 * 記事一覧の絞り込み条件が「初回取得 → グリッド → 追加読み込みの URL → API のパース」を
 * 一周しても欠けないことを固定する。
 *
 * 以前は各ページが条件をバラバラの prop で渡しており、/preferred/all だけが sortOrder を
 * 渡し忘れていた。その結果、古い順で表示しているのに追加読み込みだけが新しい順で取得され、
 * 既に表示済みの記事しか返らず無限スクロールが停止していた。
 */
function findEntryCardGridProps(node: React.ReactNode): Record<string, unknown> | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findEntryCardGridProps(child)
      if (found) return found
    }
    return null
  }
  if (!React.isValidElement(node)) return null
  const props = node.props as { children?: React.ReactNode }
  if (node.type === EntryCardGrid) return props as Record<string, unknown>
  return findEntryCardGridProps(props.children)
}

describe('記事一覧ページの絞り込み条件は初回取得と追加読み込みで一致する', () => {
  let preferenceId: string

  beforeAll(async () => {
    await prisma.entryPreferenceScore.deleteMany()
    await prisma.userPreference.deleteMany()
    const preference = await prisma.userPreference.create({
      data: { id: 'pref-entry-list-pages', text: '古い順テスト用の好み' },
    })
    preferenceId = preference.id
  })

  beforeEach(() => {
    mockFindManyEntries.mockClear()
  })

  const cases: Array<[string, () => Promise<React.ReactNode>, EntryListQuery]> = [
    [
      '/',
      async () => Home({ searchParams: Promise.resolve({ sortOrder: 'asc', feedId: 'feed-1' }) }),
      { feedId: 'feed-1', isUnread: true, sortOrder: 'asc' },
    ],
    [
      '/read-later',
      async () => ReadLaterPage({ searchParams: Promise.resolve({ sortOrder: 'asc' }) }),
      { isReadLater: true, sortOrder: 'asc' },
    ],
    [
      '/preferred/all',
      async () => PreferredAllPage({ searchParams: Promise.resolve({ sortOrder: 'asc' }) }),
      { isAnyPreferred: true, isUnread: true, scoreThreshold: 0.5, sortOrder: 'asc' },
    ],
    [
      '/preferred/[preferenceId]',
      async () =>
        PreferredByPreferencePage({
          params: Promise.resolve({ preferenceId }),
          searchParams: Promise.resolve({ sortOrder: 'asc' }),
        }),
      { isUnread: true, scoreThreshold: 0.5, sortOrder: 'asc' },
    ],
  ]

  it.each(cases)('%s', async (path, renderPage, expectedQuery) => {
    const props = findEntryCardGridProps(await renderPage())
    expect(props).not.toBeNull()

    const query = props!.query as EntryListQuery
    const expected =
      path === '/preferred/[preferenceId]' ? { ...expectedQuery, userPreferenceId: preferenceId } : expectedQuery

    // 1. ページがグリッドに渡す条件
    expect(query).toEqual(expected)

    // 2. 初回取得（サーバ）が同じ条件で呼ばれている
    expect(mockFindManyEntries).toHaveBeenCalledWith({ ...query, page: 1 })

    // 3. 追加読み込みの URL に載せて API 側でパースし直しても同じ条件に戻る
    const searchParams = buildEntriesSearchParams(query, { limit: 20, afterId: 'entry-1' })
    expect(parseEntryListQuery(searchParams)).toEqual(query)
    expect(searchParams.get('sortOrder')).toBe('asc')
  })
})
