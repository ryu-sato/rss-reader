# RSSエントリー閲覧 データフロー図

**作成日**: 2026-03-14
**関連アーキテクチャ**: [architecture.md](architecture.md)
**関連要件定義**: [requirements.md](../../spec/rss-entry-view/requirements.md)

**【信頼性レベル凡例】**:
- 🔵 **青信号**: EARS要件定義書・設計文書・ユーザヒアリングを参考にした確実なフロー
- 🟡 **黄信号**: EARS要件定義書・設計文書・ユーザヒアリングから妥当な推測によるフロー
- 🔴 **赤信号**: EARS要件定義書・設計文書・ユーザヒアリングにない推測によるフロー

---

## システム全体のデータフロー 🔵

**信頼性**: 🔵 *要件定義・アーキテクチャ設計より*

```mermaid
flowchart TD
    User["ユーザー (ブラウザ)"]
    NextFE["Next.js\nServer Component\n(app/page.tsx)"]
    EntryList["EntryList\n(Client Component)"]
    EntryModal["EntryModal\n(Client Component)"]
    NextAPI["API Route Handlers\n(/api/entries/*, /api/tags/*)"]
    EntryService["EntryService\n(lib/entry-service.ts)"]
    TagService["TagService\n(lib/tag-service.ts)"]
    PrismaORM["Prisma ORM"]
    SQLite[("SQLite\ndev.db")]
    Cron["CronScheduler\n(lib/cron.ts)"]
    EntryFetcher["EntryFetcher\n(lib/entry-fetcher.ts)"]
    SSRFGuard["SSRFGuard\n(lib/ssrf-guard.ts)"]
    ExternalRSS["外部 RSS サーバー"]

    User -->|"GET /?feedId=&tagId=&page=&entryId="| NextFE
    NextFE -->|"Prisma直接クエリ"| PrismaORM
    PrismaORM --> SQLite
    SQLite --> PrismaORM
    PrismaORM --> NextFE
    NextFE --> EntryList
    NextFE --> EntryModal

    EntryList -->|"URLパラメータ変更"| NextFE
    EntryModal -->|"PUT /api/entries/:id/meta"| NextAPI
    EntryModal -->|"POST /api/tags"| NextAPI
    NextAPI --> EntryService
    NextAPI --> TagService
    EntryService --> PrismaORM
    TagService --> PrismaORM

    Cron -->|"毎時0分"| EntryService
    EntryService --> SSRFGuard
    EntryService --> EntryFetcher
    SSRFGuard --> EntryFetcher
    EntryFetcher -->|"HTTP GET (30s timeout)"| ExternalRSS
    ExternalRSS --> EntryFetcher
    EntryFetcher --> EntryService
    EntryService --> PrismaORM
```

---

## 主要機能のデータフロー

### 機能1: エントリー一覧表示（フィルター・ページネーション） 🔵

**信頼性**: 🔵 *REQ-001, REQ-003, REQ-004, REQ-005・ヒアリングQ: URLクエリパラメータより*

**関連要件**: REQ-001, REQ-002, REQ-003, REQ-004, REQ-005

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant Page as page.tsx (Server Component)
    participant DB as Prisma/SQLite

    U->>Page: GET /?feedId=xxx&tagId=yyy&page=1
    Page->>DB: findManyEntries({<br/>where: { feedId, tags: { some: { tagId } } },<br/>orderBy: publishedAt desc,<br/>take: 20, skip: 0,<br/>include: { feed, tags, meta }<br/>})
    DB-->>Page: Entry[]（20件以下）+ total件数

    alt エントリーあり
        Page-->>U: エントリー一覧（タイトル・フィード名・日時・既読状態）<br/>+ ページネーションUI<br/>+ フィード・タグフィルターUI
    else エントリー0件
        Page-->>U: 「No entries found. Add some feeds to get started.」
    end
```

**詳細**:
1. `feedId` と `tagId` の両方が指定された場合は AND 条件でフィルタリング
2. Server Component が直接 Prisma クライアントを呼び出し（APIを経由しない）
3. `include: { feed: true, tags: { include: { tag: true } }, meta: true }` でリレーションを含めて取得

---

### 機能2: エントリーモーダル表示（既読自動更新） 🔵

**信頼性**: 🔵 *REQ-006, REQ-007, REQ-101・ヒアリングQ: URLクエリパラメータより*

**関連要件**: REQ-006, REQ-007, REQ-101

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant List as EntryList (Client Component)
    participant Router as Next.js Router
    participant Page as page.tsx (Server Component)
    participant DB as Prisma/SQLite
    participant API as PUT /api/entries/:id/meta

    U->>List: エントリーをクリック
    List->>Router: router.push("/?entryId=xxx&feedId=&tagId=&page=1")
    Router->>Page: GET /?entryId=xxx&...（再レンダリング）
    Page->>DB: findEntryById(xxx, { include: { feed, tags, meta } })
    DB-->>Page: Entry（全文・メタ情報含む）
    Page-->>U: モーダル表示（タイトル・公開日時・本文テキスト・元記事リンク・メタUI）

    Note over U,API: モーダルが開かれた直後に自動既読
    Page->>API: PUT /api/entries/xxx/meta { isRead: true }（Server Action または Client Effect）
    API->>DB: upsert EntryMeta { entryId: xxx, isRead: true }
    DB-->>API: EntryMeta
    API-->>Page: 200 { success: true, data: EntryMeta }
```

**詳細**:
- モーダルを閉じる: ブラウザバックまたは `?entryId` パラメータを除いた URL に遷移
- 前後ナビ: 現在のフィルター・ソート条件と同じクエリで前後のエントリーIDを取得して URL を更新

---

### 機能3: 前後ナビゲーション 🔵

**信頼性**: 🔵 *REQ-007・ヒアリングQ: URLクエリパラメータより*

**関連要件**: REQ-007

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant Modal as EntryModal (Client Component)
    participant API as GET /api/entries

    Note over Modal: 現在: entryId=B（B は一覧中2番目）
    U->>Modal: 「次の記事」ボタンクリック
    Modal->>API: GET /api/entries?feedId=&tagId=&page=1&afterId=B (cursor-based)
    Note right of API: publishedAt < B.publishedAt の最初の1件を取得
    API-->>Modal: Entry C（次のエントリー）
    Modal->>Modal: router.push("/?entryId=C&...")
```

**詳細**:
- カーソルベースの前後取得: `beforeId`/`afterId` パラメータで隣接エントリーを取得
- 最初/最後のエントリーではボタンを disabled にする

---

### 機能4: 既読・後で読む更新 🔵

**信頼性**: 🔵 *REQ-008, REQ-009・NFR-201より*

**関連要件**: REQ-008, REQ-009

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant Modal as EntryModal (Client Component)
    participant API as PUT /api/entries/:id/meta
    participant SVC as EntryService
    participant DB as Prisma/SQLite

    U->>Modal: 「後で読む」ボタンクリック
    Modal->>Modal: 楽観的更新（isReadLater: true）
    Modal->>API: PUT /api/entries/:id/meta { isReadLater: true }
    API->>SVC: updateEntryMeta(id, { isReadLater: true })
    SVC->>DB: upsert EntryMeta { entryId, isReadLater: true }
    DB-->>SVC: EntryMeta
    SVC-->>API: EntryMeta
    API-->>Modal: 200 { success: true, data: EntryMeta }

    alt API失敗
        API-->>Modal: エラー
        Modal->>Modal: 楽観的更新をロールバック
    end
```

---

### 機能5: タグ付け 🔵

**信頼性**: 🔵 *REQ-010, REQ-011, REQ-012・ヒアリングQ: タグcase-insensitiveより*

**関連要件**: REQ-010, REQ-011, REQ-012

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant TagInput as TagInput (Client Component)
    participant API as POST /api/tags
    participant SVC as TagService
    participant DB as Prisma/SQLite

    U->>TagInput: 「tech」と入力してEnter
    TagInput->>API: POST /api/tags { name: "tech", entryId: "xxx" }
    API->>SVC: upsertTagAndAssign({ name: "tech", entryId: "xxx" })
    SVC->>SVC: name.toLowerCase() → "tech"
    SVC->>DB: upsert Tag WHERE name = "tech"
    DB-->>SVC: Tag（既存または新規）
    SVC->>DB: upsert EntryTag { entryId, tagId }
    DB-->>SVC: EntryTag
    SVC-->>API: { tag, entryTag }
    API-->>TagInput: 201 { data: Tag }
    TagInput->>TagInput: タグを表示に追加

    Note over U,TagInput: 既存タグ選択の場合
    U->>TagInput: ドロップダウンから「design」を選択
    TagInput->>API: POST /api/tags { name: "design", entryId: "xxx" }
    Note right of API: upsertなので既存タグを再利用
```

---

### 機能6: 定期自動取得（1時間ごと） 🔵

**信頼性**: 🔵 *REQ-211・ヒアリングQ: node-cronより*

**関連要件**: REQ-211, REQ-102, REQ-103, REQ-104, EDGE-004

```mermaid
sequenceDiagram
    participant Cron as node-cron (毎時0分)
    participant SVC as EntryService
    participant DB as Prisma/SQLite
    participant SSRF as SSRFGuard
    participant Fetcher as EntryFetcher
    participant ExtRSS as 外部RSSサーバー

    Cron->>SVC: fetchAllFeedsEntries()
    SVC->>DB: findAllFeeds()
    DB-->>SVC: Feed[]（全フィード）

    loop 各フィードについて（try-catchでスキップ）
        SVC->>SSRF: validateUrl(feed.url)
        alt SSRF違反
            SSRF-->>SVC: Error → console.error でログ、continue
        else OK
            SVC->>Fetcher: fetchEntries(feed.url)
            Fetcher->>ExtRSS: HTTP GET (30s timeout)
            alt 取得失敗
                ExtRSS-->>Fetcher: Error
                Fetcher-->>SVC: FetchError → console.error でログ、continue
            else 取得成功
                ExtRSS-->>Fetcher: RSS/Atom XML
                Fetcher->>Fetcher: items を解析・プレーンテキスト変換
                Fetcher-->>SVC: EntryData[]
                SVC->>DB: upsertEntries（guid で重複スキップ: REQ-103）
                DB-->>SVC: 保存済み件数
                SVC->>DB: countEntriesByFeed(feedId)
                DB-->>SVC: 件数
                alt 500件超過（REQ-102）
                    SVC->>DB: deleteOldestEntries(feedId, excess件数)
                    DB-->>SVC: 削除完了
                end
                SVC->>DB: updateFeed({ lastFetchedAt: now })
            end
        end
    end
    Cron-->>Cron: 完了ログ
```

**詳細**:
- `instrumentation.ts` の `register()` で `node-cron.schedule('0 * * * *', ...)` を起動
- `process.env.NEXT_RUNTIME === 'nodejs'` 条件で Node.js ランタイムのみ実行（Edge Runtime では実行しない）

---

## エラーハンドリングフロー 🔵

**信頼性**: 🔵 *既存 rss-feed-registration エラーパターン継承・REQ-104より*

```mermaid
flowchart TD
    E["エラー発生"] --> T{"エラー発生箇所"}

    T -->|"API Route Handler"| R1{"エラー種別"}
    R1 -->|"バリデーション"| C400["400 Bad Request"]
    R1 -->|"エントリー未存在"| C404["404 Not Found"]
    R1 -->|"サーバーエラー"| C500["500 Internal Server Error"]

    T -->|"Cronバックグラウンド"| R2{"対象フィード"}
    R2 -->|"個別フィード失敗"| Skip["console.error ログ\n→ 次フィードを継続（REQ-104）"]
    R2 -->|"全体クラッシュ"| Restart["次のcronサイクルで再試行"]

    C400 --> Resp["エラーレスポンス返却"]
    C404 --> Resp
    C500 --> Log["console.error ログ"] --> Resp
```

---

## URL状態管理フロー（モーダル・フィルター） 🔵

**信頼性**: 🔵 *ヒアリングQ: URLクエリパラメータより*

```mermaid
stateDiagram-v2
    [*] --> エントリー一覧: GET /
    エントリー一覧 --> フィルター適用: feedId/tagId選択
    フィルター適用 --> エントリー一覧: GET /?feedId=xxx&tagId=yyy&page=1
    エントリー一覧 --> モーダル表示: エントリークリック
    モーダル表示 --> エントリー一覧: GET /?entryId=xxx&feedId=&tagId=&page=1
    モーダル表示 --> 次のモーダル: 「次の記事」
    モーダル表示 --> 前のモーダル: 「前の記事」
    次のモーダル --> モーダル表示: URL更新
    前のモーダル --> モーダル表示: URL更新
    モーダル表示 --> エントリー一覧: ブラウザバック / ×ボタン
```

---

## データ整合性の保証 🔵

**信頼性**: 🔵 *Prisma + SQLite制約・REQ-103より*

- **重複排除**: `Entry` テーブルに `@@unique([feedId, guid])` 複合ユニーク制約
- **カスケード削除**: `Feed` 削除時に `Entry` も削除（`onDelete: Cascade`）
- **EntryMeta**: `entryId` に `@unique` 制約（1エントリー1メタ）
- **EntryTag**: `(entryId, tagId)` 複合主キーで重複防止
- **タグ正規化**: アプリ層で `name.toLowerCase()` + DB側 `@unique` 制約

---

## 関連文書

- **アーキテクチャ**: [architecture.md](architecture.md)
- **型定義**: [interfaces.ts](interfaces.ts)
- **DBスキーマ**: [database-schema.sql](database-schema.sql)
- **API仕様**: [api-endpoints.md](api-endpoints.md)

## 信頼性レベルサマリー

- 🔵 青信号: 18件 (86%)
- 🟡 黄信号: 3件 (14%)
- 🔴 赤信号: 0件 (0%)

**品質評価**: 高品質
