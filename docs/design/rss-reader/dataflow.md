# データフロー図（逆生成）

## 分析日時
2026-03-16

---

## フィード追加フロー

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as FeedForm (Client)
    participant A as POST /api/feeds
    participant S as feed-service
    participant G as ssrf-guard
    participant R as rss-parser
    participant D as SQLite (Prisma)

    U->>F: URL入力・送信
    F->>A: POST /api/feeds { url }
    A->>A: Zodバリデーション
    A->>G: validateUrl(url)
    G->>G: DNS解決・プライベートIPチェック
    G-->>A: OK or エラー
    A->>R: フィードURL取得・パース
    R-->>A: タイトル・説明・ファビコン
    A->>S: createFeed(input)
    S->>D: Feed.upsert (url unique)
    D-->>S: Feed レコード
    S-->>A: Feed
    A-->>F: 201 { success, data: Feed }
    F->>F: router.push('/feeds')
```

---

## 記事自動取得フロー（Cronジョブ）

```mermaid
flowchart TD
    A[node-cron: 毎時00分] --> B[fetchAllFeedsEntries]
    B --> C[全フィードをDBから取得]
    C --> D{各フィードを並列処理}
    D --> E[ssrf-guard: URL検証]
    E --> F[rss-parser: RSS/Atomフェッチ]
    F --> G[記事パース\nカスタムフィールド: media, itunes]
    G --> H{画像URL抽出}
    H -->|enclosure| I[RSSメディアURL使用]
    H -->|なし| J[OGPメタタグから取得]
    H -->|なし| K[image URL未設定]
    I --> L[Entry.upsert\nfeedId+guid unique]
    J --> L
    K --> L
    L --> M{重複リンクの既読状態伝播}
    M --> N[既存のisRead状態をコピー]
    N --> O{フィードが500記事超過?}
    O -->|YES| P[古い記事を削除]
    O -->|NO| Q[完了]
    P --> Q
    Q --> R[feed.lastFetchedAt更新]
```

---

## 記事一覧取得・表示フロー

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant P as page.tsx (Server)
    participant C as EntryCardGrid (Client)
    participant A as GET /api/entries
    participant S as entry-service
    participant D as SQLite

    U->>P: ページアクセス (URLパラメータ: feedId, tagId, search)
    P->>P: searchParams解析
    P->>C: 初期レンダリング (フィルタProps)
    C->>A: GET /api/entries?feedId=...&page=1&limit=20
    A->>S: getEntries(query)
    S->>D: SQLクエリ\n(ウィンドウ関数で重複排除)
    D-->>S: Entry[] + EntryMeta[] + Tag[]
    S-->>A: { items, pagination }
    A-->>C: 200 { data: { items, pagination } }
    C->>C: カード一覧表示
    U->>C: スクロール (IntersectionObserver)
    C->>A: GET /api/entries?afterId=lastId&limit=20
    A-->>C: 次のページデータ
    C->>C: カードを追加表示
```

---

## 記事詳細表示・既読フロー

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant C as EntryCardGrid (Client)
    participant M as EntryModal (Client)
    participant A1 as GET /api/entries/[id]
    participant A2 as PUT /api/entries/[id]/meta
    participant S as entry-service
    participant D as SQLite

    U->>C: カードクリック
    C->>C: URL: ?entryId=xxx
    C->>M: モーダル表示
    M->>A1: GET /api/entries/[id]
    A1->>S: getEntry(id)
    S->>D: Entry + EntryMeta + Tags取得
    D-->>S: EntryDetail
    S-->>M: EntryDetail
    M->>M: 記事コンテンツ表示
    M->>A2: PUT /api/entries/[id]/meta { isRead: true }
    A2->>S: updateEntryMeta(id, { isRead: true })
    S->>D: EntryMeta.upsert
    S->>D: 同一リンクの全記事を既読に
    D-->>M: 更新完了
    M->>M: dispatchEvent('entry:read', { entryId, feedId })
    C->>C: entry:readイベント受信\nカード表示更新
    Note over C: サイドバーのunreadCountも更新
```

---

## 状態管理フロー（カスタムイベント）

```mermaid
flowchart LR
    A[EntryModal] -->|dispatchEvent entry:read| B[window]
    B -->|addEventListener entry:read| C[EntryCardGrid\n既読バッジ更新]
    B -->|addEventListener entry:read| D[Sidebar\nunreadCount更新]

    E[EntryModal] -->|dispatchEvent entry:updated| B
    B -->|addEventListener entry:updated| C2[EntryCardGrid\nread-later更新]

    F[TagInput] -->|dispatchEvent tag:deleted| B
    B -->|addEventListener tag:deleted| G[EntryCardGrid\nタグフィルタリセット]
```

---

## URLパラメータによるフィルター状態管理

```mermaid
flowchart TD
    A[EntryFilterBar] --> B{URLパラメータ変更}
    B -->|feedId=xxx| C[フィードフィルタ適用]
    B -->|tagId=xxx| D[タグフィルタ適用]
    B -->|search=query| E[検索フィルタ適用]
    B -->|isUnread=true| F[未読のみ表示]
    B -->|entryId=xxx| G[記事モーダル表示]
    C --> H[router.push with params]
    D --> H
    E --> H
    F --> H
    G --> H
    H --> I[Server: searchParams解析]
    I --> J[EntryCardGrid再レンダリング]
```

---

## タグ管理フロー

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant T as TagInput (Client)
    participant A1 as POST /api/tags
    participant A2 as DELETE /api/tags/[id]/entries/[entryId]
    participant S as tag-service
    participant D as SQLite

    U->>T: タグ名入力・追加
    T->>A1: POST /api/tags { name, entryId }
    A1->>S: createTag(name, entryId)
    S->>D: Tag.upsert (lowercase normalize)
    S->>D: EntryTag.create
    D-->>T: Tag追加完了

    U->>T: タグ削除ボタン
    T->>A2: DELETE /api/tags/[tagId]/entries/[entryId]
    A2->>S: removeTagFromEntry(tagId, entryId)
    S->>D: EntryTag.delete
    D-->>T: タグ削除完了
    T->>T: dispatchEvent('tag:deleted')
```

---

## ダイジェスト作成フロー

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as DigestForm (Client)
    participant A as POST /api/digests
    participant S as digest-service
    participant D as SQLite

    U->>F: タイトル・コンテンツ入力
    F->>A: POST /api/digests { title, content }
    A->>A: Zodバリデーション
    A->>S: createDigest(data)
    S->>D: Digest.create
    D-->>S: Digest
    S-->>F: 201 { data: Digest }
    F->>F: router.push('/digests/[id]')
```

---

## エラーハンドリングフロー

```mermaid
flowchart TD
    A[エラー発生] --> B{エラー種別}
    B -->|Zodバリデーションエラー| C[400 Bad Request\nフィールドエラー詳細]
    B -->|SSRF検出| D[400 Bad Request\nSSRF_DETECTED]
    B -->|リソース未存在| E[404 Not Found]
    B -->|DB制約違反| F[409 Conflict\nURL重複等]
    B -->|外部フェッチ失敗| G[500 Internal Server Error]
    B -->|認証エラー| H[401 Unauthorized]
    C --> I[クライアント: Sonner toast表示]
    D --> I
    E --> I
    F --> I
    G --> I
```
