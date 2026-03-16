# RSS Reader アプリ テスト仕様書（逆生成）

## 分析概要

**分析日時**: 2026-03-16
**対象コードベース**: `/workspaces/rss-reader/src`
**テストフレームワーク**: Vitest 4.1.0 + @testing-library/react 16.3.2
**既存テストファイル数**: 26 ファイル
**推定カバレッジ**: サービス層 ~75% / APIルート ~65% / コンポーネント ~35% / ページ ~5%
**未テスト対象**: 5 APIルート / 1 サービス / 8 コンポーネント / E2E ゼロ

---

## 現在のテスト実装状況

### テストフレームワーク構成

| 種別 | ツール | 設定ファイル |
|------|--------|-------------|
| 単体・統合テスト | Vitest 4.1.0 | `vitest.config.ts` |
| DOMシミュレーション | jsdom 28.1.0 | `vitest.config.ts` → `environment: 'jsdom'` |
| Reactコンポーネントテスト | @testing-library/react 16.3.2 | `vitest.setup.ts` |
| カスタムマッチャー | @testing-library/jest-dom 6.9.1 | `vitest.setup.ts` |
| E2Eテスト | **未導入** | — |
| カバレッジ計測 | Vitest coverage | `pnpm test:coverage` |

### テストカバレッジ詳細（推定）

| レイヤー | 実装ファイル数 | テストファイル数 | 推定カバレッジ |
|---------|-------------|----------------|-------------|
| APIルート | 12 | 7 | ~58% |
| サービス層 | 7 | 8 | ~85% |
| コンポーネント | ~20 | 8 | ~35% |
| ページ | 11 | 1 | ~9% |
| 統合テスト | — | 2 | — |
| **合計** | **50+** | **26** | **~45%** |

### 実装済みテストカテゴリ

#### ✅ APIルートテスト（実装済み）

| ファイル | メソッド | テスト内容 |
|---------|---------|-----------|
| `api/feeds/route.test.ts` | GET, POST | フィード一覧取得、フィード登録、バリデーション、409/422エラー |
| `api/feeds/[id]/route.test.ts` | GET, PATCH, DELETE | フィード詳細取得・更新・削除、404エラー |
| `api/entries/route.test.ts` | GET | エントリ一覧取得、フィルター、ページネーション、バリデーション |
| `api/entries/[id]/route.test.ts` | GET | エントリ詳細取得、404エラー |
| `api/entries/[id]/meta/route.test.ts` | PATCH | 既読・後で読む状態更新 |
| `api/tags/route.test.ts` | GET, POST | タグ一覧取得、タグ作成 |
| `api/tags/[tagId]/entries/[entryId]/route.test.ts` | POST, DELETE | タグのエントリへの割当・解除 |

#### ✅ サービス層テスト（実装済み）

| ファイル | テスト内容 |
|---------|-----------|
| `lib/feed-service.test.ts` | フィードCRUD、重複チェック、URL検証 |
| `lib/__tests__/entry-service-query.test.ts` | エントリクエリ、フィルター、ページネーション、重複排除 |
| `lib/__tests__/entry-service-save.test.ts` | エントリ保存、upsert、既読連動 |
| `lib/__tests__/tag-service.test.ts` | タグCRUD、タグ割当 |
| `lib/__tests__/entry-fetcher.test.ts` | エントリフェッチ単体テスト |
| `lib/rss-fetcher.test.ts` | RSSフィードパース、各フォーマット対応 |
| `lib/ssrf-guard.test.ts` | SSRF防御、プライベートIP検出、URLバリデーション |
| `lib/errors.test.ts` | カスタムエラークラス |

#### ✅ コンポーネントテスト（実装済み）

| ファイル | テスト内容 |
|---------|-----------|
| `components/feed-form.test.tsx` | フォーム送信・バリデーション |
| `components/feed-list.test.tsx` | フィード一覧表示 |
| `components/entry-list.test.tsx` | エントリ一覧表示 |
| `components/entry-modal.test.tsx` | エントリ詳細モーダル |
| `components/entry-filter.test.tsx` | フィルターロジック |
| `components/edit-feed-form.test.tsx` | フィード編集フォーム |
| `components/delete-confirm-dialog.test.tsx` | 削除確認ダイアログ |
| `components/tag-input.test.tsx` | タグ入力コンポーネント |

---

## 未実装テスト（要追加）

### ❌ APIルート（未テスト）

#### 1. POST /api/feeds/refresh

```typescript
// src/app/api/feeds/refresh/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/entry-service', () => ({
  fetchAllFeedsEntries: vi.fn(),
}))

import { fetchAllFeedsEntries } from '@/lib/entry-service'
import { POST } from './route'

describe('POST /api/feeds/refresh', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 200 when refresh succeeds', async () => {
    vi.mocked(fetchAllFeedsEntries).mockResolvedValue(undefined)

    const response = await POST()
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
  })

  it('returns 500 when refresh fails', async () => {
    vi.mocked(fetchAllFeedsEntries).mockRejectedValue(new Error('Network error'))

    const response = await POST()
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.success).toBe(false)
  })
})
```

#### 2. GET /api/entries/read-later-unread-count

```typescript
// src/app/api/entries/read-later-unread-count/route.test.ts
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  prisma: {
    entryMeta: { count: vi.fn() },
  },
}))

import { prisma } from '@/lib/db'
import { GET } from './route'

describe('GET /api/entries/read-later-unread-count', () => {
  it('returns count of unread read-later entries', async () => {
    vi.mocked(prisma.entryMeta.count).mockResolvedValue(5)

    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.count).toBe(5)
    expect(prisma.entryMeta.count).toHaveBeenCalledWith({
      where: { isReadLater: true, isRead: false },
    })
  })

  it('returns 0 when no unread read-later entries', async () => {
    vi.mocked(prisma.entryMeta.count).mockResolvedValue(0)

    const response = await GET()
    const json = await response.json()

    expect(json.data.count).toBe(0)
  })

  it('returns 500 on DB error', async () => {
    vi.mocked(prisma.entryMeta.count).mockRejectedValue(new Error('DB error'))

    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.error.code).toBe('INTERNAL_SERVER_ERROR')
  })
})
```

#### 3. PATCH/DELETE /api/tags/[tagId]

```typescript
// src/app/api/tags/[tagId]/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/tag-service', () => ({
  renameTag: vi.fn(),
  deleteTag: vi.fn(),
}))

import { renameTag, deleteTag } from '@/lib/tag-service'
import { PATCH, DELETE } from './route'

const makeParams = (tagId: string) => ({ params: Promise.resolve({ tagId }) })

describe('PATCH /api/tags/[tagId]', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 200 with updated tag', async () => {
    vi.mocked(renameTag).mockResolvedValue({ id: 'tag-1', name: 'NewName', createdAt: new Date() })

    const req = new NextRequest('http://localhost/api/tags/tag-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'NewName' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req, makeParams('tag-1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.name).toBe('NewName')
  })

  it('returns 400 when name is missing', async () => {
    const req = new NextRequest('http://localhost/api/tags/tag-1', {
      method: 'PATCH',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req, makeParams('tag-1'))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when name is empty string', async () => {
    const req = new NextRequest('http://localhost/api/tags/tag-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: '   ' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req, makeParams('tag-1'))
    const json = await res.json()

    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/tags/[tagId]', () => {
  it('returns 200 when tag is deleted', async () => {
    vi.mocked(deleteTag).mockResolvedValue(undefined)

    const req = new NextRequest('http://localhost/api/tags/tag-1', { method: 'DELETE' })
    const res = await DELETE(req, makeParams('tag-1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(deleteTag).toHaveBeenCalledWith('tag-1')
  })
})
```

#### 4. GET/POST /api/digests

```typescript
// src/app/api/digests/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/digest-service', () => ({
  getDigests: vi.fn(),
  createDigest: vi.fn(),
}))

import { getDigests, createDigest } from '@/lib/digest-service'
import { GET, POST } from './route'

const sampleDigest = {
  id: 'digest-1',
  title: 'Weekly Digest',
  content: '## This week\n\n- Article 1',
  createdAt: new Date('2026-03-16'),
}

describe('GET /api/digests', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 200 with digest list and pagination', async () => {
    vi.mocked(getDigests).mockResolvedValue({
      data: [{ id: 'digest-1', title: 'Weekly', createdAt: new Date() }],
      total: 1,
    })

    const req = new NextRequest('http://localhost/api/digests')
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toHaveLength(1)
    expect(json.pagination.total).toBe(1)
  })

  it('passes page and limit params to getDigests', async () => {
    vi.mocked(getDigests).mockResolvedValue({ data: [], total: 0 })

    const req = new NextRequest('http://localhost/api/digests?page=2&limit=10')
    await GET(req)

    expect(getDigests).toHaveBeenCalledWith(2, 10)
  })
})

describe('POST /api/digests', () => {
  it('returns 201 with created digest', async () => {
    vi.mocked(createDigest).mockResolvedValue(sampleDigest)

    const req = new NextRequest('http://localhost/api/digests', {
      method: 'POST',
      body: JSON.stringify({ content: '## Digest content', title: 'Weekly Digest' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.data.title).toBe('Weekly Digest')
  })

  it('returns 400 when content is missing', async () => {
    const req = new NextRequest('http://localhost/api/digests', {
      method: 'POST',
      body: JSON.stringify({ title: 'No content' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 201 when title is omitted (title optional)', async () => {
    vi.mocked(createDigest).mockResolvedValue({ ...sampleDigest, title: null })

    const req = new NextRequest('http://localhost/api/digests', {
      method: 'POST',
      body: JSON.stringify({ content: '## Content only' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)

    expect(res.status).toBe(201)
  })
})
```

#### 5. GET/PATCH/DELETE /api/digests/[id]

```typescript
// src/app/api/digests/[id]/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/digest-service', () => ({
  getDigestById: vi.fn(),
  updateDigest: vi.fn(),
  deleteDigest: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }))

import { getDigestById, updateDigest, deleteDigest } from '@/lib/digest-service'
import { AppError } from '@/lib/errors'
import { GET, PATCH, DELETE } from './route'

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) })

describe('GET /api/digests/[id]', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 200 with digest', async () => {
    vi.mocked(getDigestById).mockResolvedValue({
      id: 'digest-1', title: 'Test', content: '## Content', createdAt: new Date(),
    })

    const req = new NextRequest('http://localhost/api/digests/digest-1')
    const res = await GET(req, makeParams('digest-1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.id).toBe('digest-1')
  })

  it('returns 404 when not found', async () => {
    vi.mocked(getDigestById).mockRejectedValue(
      new AppError('DIGEST_NOT_FOUND', 'Digest not found', 404)
    )

    const req = new NextRequest('http://localhost/api/digests/not-exist')
    const res = await GET(req, makeParams('not-exist'))
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.error.code).toBe('DIGEST_NOT_FOUND')
  })
})

describe('PATCH /api/digests/[id]', () => {
  it('returns 200 with updated digest', async () => {
    vi.mocked(updateDigest).mockResolvedValue({
      id: 'digest-1', title: 'Updated', content: '## Updated', createdAt: new Date(),
    })

    const req = new NextRequest('http://localhost/api/digests/digest-1', {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Updated', content: '## Updated' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req, makeParams('digest-1'))

    expect(res.status).toBe(200)
  })

  it('returns 400 when content is empty string', async () => {
    const req = new NextRequest('http://localhost/api/digests/digest-1', {
      method: 'PATCH',
      body: JSON.stringify({ content: '  ' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req, makeParams('digest-1'))

    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/digests/[id]', () => {
  it('returns 200 on successful delete', async () => {
    vi.mocked(deleteDigest).mockResolvedValue(undefined)

    const req = new NextRequest('http://localhost/api/digests/digest-1', { method: 'DELETE' })
    const res = await DELETE(req, makeParams('digest-1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
  })
})
```

### ❌ サービス層（未テスト）

#### digest-service.ts

```typescript
// src/lib/digest-service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  prisma: {
    digest: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'
import {
  createDigest,
  getDigests,
  getDigestById,
  updateDigest,
  deleteDigest,
} from './digest-service'
import { AppError } from './errors'

const sampleDigest = {
  id: 'digest-1',
  title: 'Weekly',
  content: '## Content',
  createdAt: new Date('2026-03-16'),
}

describe('createDigest', () => {
  it('creates digest with title and content', async () => {
    vi.mocked(prisma.digest.create).mockResolvedValue(sampleDigest)

    const result = await createDigest({ content: '## Content', title: 'Weekly' })

    expect(result).toEqual(sampleDigest)
    expect(prisma.digest.create).toHaveBeenCalledWith({
      data: { content: '## Content', title: 'Weekly' },
    })
  })

  it('creates digest with null title when title is omitted', async () => {
    vi.mocked(prisma.digest.create).mockResolvedValue({ ...sampleDigest, title: null })

    await createDigest({ content: '## Content' })

    expect(prisma.digest.create).toHaveBeenCalledWith({
      data: { content: '## Content', title: null },
    })
  })
})

describe('getDigests', () => {
  it('returns paginated list', async () => {
    vi.mocked(prisma.digest.findMany).mockResolvedValue([sampleDigest])
    vi.mocked(prisma.digest.count).mockResolvedValue(1)

    const result = await getDigests(1, 20)

    expect(result.data).toHaveLength(1)
    expect(result.total).toBe(1)
  })

  it('applies skip based on page number', async () => {
    vi.mocked(prisma.digest.findMany).mockResolvedValue([])
    vi.mocked(prisma.digest.count).mockResolvedValue(30)

    await getDigests(2, 20)

    expect(prisma.digest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 20 })
    )
  })
})

describe('getDigestById', () => {
  it('returns digest when found', async () => {
    vi.mocked(prisma.digest.findUnique).mockResolvedValue(sampleDigest)

    const result = await getDigestById('digest-1')

    expect(result).toEqual(sampleDigest)
  })

  it('throws AppError when not found', async () => {
    vi.mocked(prisma.digest.findUnique).mockResolvedValue(null)

    await expect(getDigestById('not-exist')).rejects.toThrow(AppError)
    await expect(getDigestById('not-exist')).rejects.toMatchObject({
      code: 'DIGEST_NOT_FOUND',
    })
  })
})

describe('updateDigest', () => {
  it('updates and returns digest', async () => {
    vi.mocked(prisma.digest.findUnique).mockResolvedValue(sampleDigest)
    vi.mocked(prisma.digest.update).mockResolvedValue({ ...sampleDigest, title: 'Updated' })

    const result = await updateDigest('digest-1', { title: 'Updated' })

    expect(result.title).toBe('Updated')
  })

  it('allows clearing title with null', async () => {
    vi.mocked(prisma.digest.findUnique).mockResolvedValue(sampleDigest)
    vi.mocked(prisma.digest.update).mockResolvedValue({ ...sampleDigest, title: null })

    const result = await updateDigest('digest-1', { title: null })

    expect(result.title).toBeNull()
  })

  it('throws when digest not found', async () => {
    vi.mocked(prisma.digest.findUnique).mockResolvedValue(null)

    await expect(updateDigest('not-exist', { content: 'New' })).rejects.toThrow(AppError)
  })
})

describe('deleteDigest', () => {
  it('deletes the digest', async () => {
    vi.mocked(prisma.digest.findUnique).mockResolvedValue(sampleDigest)
    vi.mocked(prisma.digest.delete).mockResolvedValue(sampleDigest)

    await expect(deleteDigest('digest-1')).resolves.not.toThrow()
    expect(prisma.digest.delete).toHaveBeenCalledWith({ where: { id: 'digest-1' } })
  })
})
```

### ❌ コンポーネント（未テスト）

主要な欠損コンポーネントテスト（優先順）：

1. **`entry-card.test.tsx`** — エントリカードの表示・クリック操作・既読状態切替
2. **`entry-card-grid.test.tsx`** — グリッド表示・ページネーション操作・空状態
3. **`sidebar.test.tsx`** — サイドバー開閉・フィードリスト表示・ナビゲーション
4. **`entry-filter-bar.test.tsx`** — フィード/タグ選択・検索入力
5. **`read-filter.test.tsx`** — 既読/未読フィルタートグル
6. **`digest-form.test.tsx`** — ダイジェスト作成・編集フォーム
7. **`delete-digest-button.test.tsx`** — 削除確認フロー
8. **`empty-panel.test.tsx`** — 空状態メッセージ表示

---

## エントリサービス 追加テストケース（既存補強）

### enforceEntryLimit（未カバーパス）

```typescript
describe('enforceEntryLimit', () => {
  it('does nothing when count is at limit (500)', async () => {
    vi.mocked(prisma.entry.count).mockResolvedValue(500)

    await enforceEntryLimit('feed-1')

    expect(prisma.entry.deleteMany).not.toHaveBeenCalled()
  })

  it('deletes oldest entries when count exceeds 500', async () => {
    vi.mocked(prisma.entry.count).mockResolvedValue(502)
    vi.mocked(prisma.entry.findMany).mockResolvedValue([{ id: 'old-1' }, { id: 'old-2' }])
    vi.mocked(prisma.entry.deleteMany).mockResolvedValue({ count: 2 })

    await enforceEntryLimit('feed-1')

    expect(prisma.entry.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['old-1', 'old-2'] } },
    })
  })
})
```

### fetchAllFeedsEntries（エラー耐性）

```typescript
describe('fetchAllFeedsEntries', () => {
  it('continues processing other feeds when one fails', async () => {
    vi.mocked(prisma.feed.findMany).mockResolvedValue([
      { id: 'feed-1', url: 'https://good.com/feed' },
      { id: 'feed-2', url: 'https://bad.com/feed' },
    ])
    vi.mocked(validateUrl)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new SSRFError('Blocked'))
    vi.mocked(fetchEntries).mockResolvedValue([])

    await expect(fetchAllFeedsEntries()).resolves.not.toThrow()

    // feed-1 は処理完了、feed-2 はスキップされて feed-1 の lastFetchedAt が更新される
    expect(prisma.feed.update).toHaveBeenCalledTimes(1)
  })
})
```

---

## セキュリティテスト補強

### SSRF ガード追加ケース

```typescript
describe('validateUrl - 追加セキュリティケース', () => {
  it('rejects URLs longer than 2048 characters', async () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(2030)

    await expect(validateUrl(longUrl)).rejects.toThrow('URL must be 2048 characters or less')
  })

  it('rejects file:// protocol', async () => {
    await expect(validateUrl('file:///etc/passwd')).rejects.toThrow('URL must start with http://')
  })

  it('rejects ftp:// protocol', async () => {
    await expect(validateUrl('ftp://example.com/feed')).rejects.toThrow()
  })

  it('rejects IPv6 loopback (::1)', async () => {
    vi.spyOn(dns, 'lookup').mockResolvedValue([{ address: '::1', family: 6 }] as never)

    await expect(validateUrl('https://evil.com/feed')).rejects.toThrow('URL is not allowed')
  })
})
```

---

## E2Eテスト（新規導入推奨）

### 推奨スタック

**Playwright** を推奨（Next.js との公式統合・モダン API）

```bash
pnpm add -D @playwright/test
pnpm exec playwright install
```

### 主要シナリオ

```typescript
// e2e/feed-management.spec.ts
import { test, expect } from '@playwright/test'

test.describe('フィード管理フロー', () => {
  test('フィード追加からエントリ表示まで', async ({ page }) => {
    await page.goto('/')

    // サイドバーからフィード追加
    await page.click('[data-testid="add-feed-button"]')
    await page.fill('[data-testid="feed-url-input"]', 'https://example.com/feed.xml')
    await page.click('[data-testid="submit-feed-button"]')

    // フィード一覧に表示されること
    await expect(page.locator('[data-testid="feed-list"]')).toContainText('Example Blog')

    // エントリが表示されること
    await page.click('text=Example Blog')
    await expect(page.locator('[data-testid="entry-card"]').first()).toBeVisible()
  })

  test('重複フィード登録時のエラー表示', async ({ page }) => {
    await page.goto('/feeds/new')
    await page.fill('[data-testid="feed-url-input"]', 'https://already-exists.com/feed.xml')
    await page.click('[data-testid="submit-feed-button"]')

    await expect(page.locator('[data-testid="error-toast"]'))
      .toContainText('already exists')
  })
})
```

```typescript
// e2e/entry-reading.spec.ts
test.describe('エントリ閲覧フロー', () => {
  test('エントリ既読マークとフィルター', async ({ page }) => {
    await page.goto('/')

    // 未読エントリカードをクリック
    const firstCard = page.locator('[data-testid="entry-card"]').first()
    await firstCard.click()

    // モーダルが開くこと
    await expect(page.locator('[data-testid="entry-modal"]')).toBeVisible()

    // 既読状態になること
    await page.keyboard.press('Escape')
    await expect(firstCard).toHaveAttribute('data-read', 'true')

    // 未読フィルターで非表示になること
    await page.click('[data-testid="unread-filter"]')
    await expect(firstCard).not.toBeVisible()
  })

  test('後で読むトグルと後で読むページ', async ({ page }) => {
    await page.goto('/')

    const firstCard = page.locator('[data-testid="entry-card"]').first()
    await firstCard.locator('[data-testid="read-later-button"]').click()

    await page.goto('/read-later')
    await expect(page.locator('[data-testid="entry-card"]')).toHaveCount(1)
  })
})
```

---

## 不足テストの優先順位

### 高優先度（即座に実装推奨）

| # | テスト | 理由 |
|---|--------|------|
| 1 | `api/digests/route.test.ts` | ダイジェスト機能全体が未テスト |
| 2 | `api/digests/[id]/route.test.ts` | 同上 |
| 3 | `lib/digest-service.test.ts` | サービス層が完全に未テスト |
| 4 | `api/feeds/refresh/route.test.ts` | フィード更新の中核機能が未テスト |
| 5 | `api/tags/[tagId]/route.test.ts` | タグリネーム機能が未テスト |

### 中優先度（次のスプリントで実装）

| # | テスト | 理由 |
|---|--------|------|
| 6 | `entry-card.test.tsx` | 最頻使用コンポーネント |
| 7 | `entry-card-grid.test.tsx` | ページネーション・空状態 |
| 8 | `api/entries/read-later-unread-count/route.test.ts` | バッジ表示に使われる |
| 9 | `enforceEntryLimit` 追加テスト | エントリ上限管理の境界値 |
| 10 | `sidebar.test.tsx` | メインナビゲーション |

### 低優先度（継続的改善として実装）

| # | テスト | 理由 |
|---|--------|------|
| 11 | `entry-filter-bar.test.tsx` | entry-filter.test.tsx で間接テスト済み |
| 12 | `digest-form.test.tsx` | ページテストでカバー可能 |
| 13 | E2Eテスト導入（Playwright） | ユーザーフロー全体の保証 |
| 14 | `empty-panel.test.tsx` | シンプルなプレゼンテーション |
| 15 | `read-filter.test.tsx` | トグルUIのみ |

---

## テスト環境設定

### モックパターン（統一規則）

```typescript
// Prismaクライアントのモック（標準パターン）
vi.mock('@/lib/db', () => ({
  prisma: {
    [model]: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    $queryRawUnsafe: vi.fn(),
    $queryRaw: vi.fn(),
  },
}))

// サービス層のモック（APIルートテスト用）
vi.mock('@/lib/some-service', () => ({
  someFunction: vi.fn(),
}))
```

### テスト実行コマンド

```bash
# 全テスト実行
pnpm test:run

# ウォッチモード
pnpm test

# カバレッジ計測
pnpm test:coverage

# 特定ファイルのみ
pnpm test:run src/lib/digest-service.test.ts

# パターンマッチ
pnpm test:run --reporter=verbose digest
```

---

## 品質目標

| 指標 | 現状（推定） | 目標 |
|------|------------|------|
| 全体行カバレッジ | ~45% | 80%以上 |
| APIルートカバレッジ | ~58% | 95%以上 |
| サービス層カバレッジ | ~85% | 90%以上 |
| コンポーネントカバレッジ | ~35% | 70%以上 |
| E2Eシナリオ数 | 0 | 5以上 |
