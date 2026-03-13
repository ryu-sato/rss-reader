# RSSシードの登録 データフロー図

**作成日**: 2026-03-13
**関連アーキテクチャ**: [architecture.md](architecture.md)
**関連要件定義**: [requirements.md](../../spec/rss-feed-registration/requirements.md)

**【信頼性レベル凡例】**:
- 🔵 **青信号**: EARS要件定義書・設計文書・ユーザヒアリングを参考にした確実なフロー
- 🟡 **黄信号**: EARS要件定義書・設計文書・ユーザヒアリングから妥当な推測によるフロー
- 🔴 **赤信号**: EARS要件定義書・設計文書・ユーザヒアリングにない推測によるフロー

---

## システム全体のデータフロー 🔵

**信頼性**: 🔵 *要件定義・ユーザーストーリーより*

```mermaid
flowchart TD
    User["ユーザー (ブラウザ)"]
    NextPage["Next.js Page\n(React Server Component)"]
    RouteHandler["API Route Handler\n(app/api/feeds/)"]
    FeedService["FeedService\n(lib/feed-service.ts)"]
    RSSFetcher["RSSFetcher\n(lib/rss-fetcher.ts)"]
    SSRFGuard["SSRF Guard\n(lib/ssrf-guard.ts)"]
    PrismaClient["Prisma Client\n(lib/db.ts)"]
    SQLite[("SQLite DB\nprisma/dev.db")]
    ExternalRSS["外部 RSS サーバー"]

    User --> NextPage
    User --> RouteHandler
    RouteHandler --> FeedService
    FeedService --> SSRFGuard
    FeedService --> RSSFetcher
    SSRFGuard --> RSSFetcher
    RSSFetcher --> ExternalRSS
    ExternalRSS --> RSSFetcher
    FeedService --> PrismaClient
    PrismaClient --> SQLite
    SQLite --> PrismaClient
    PrismaClient --> FeedService
    FeedService --> RouteHandler
    NextPage --> PrismaClient
```

---

## 主要機能のデータフロー

### 機能1: RSSフィード登録 🔵

**信頼性**: 🔵 *ユーザーストーリー1.1・要件REQ-001, REQ-101, REQ-102, REQ-103より*

**関連要件**: REQ-001, REQ-101, REQ-102, REQ-103, REQ-106, REQ-107

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant Form as FeedForm (Client Component)
    participant API as POST /api/feeds
    participant SVC as FeedService
    participant SSRF as SSRFGuard
    participant RSS as RSSFetcher
    participant ExtRSS as 外部RSSサーバー
    participant DB as Prisma/SQLite

    U->>Form: URL入力 + 登録ボタンクリック
    Form->>Form: クライアントサイドURL形式バリデーション
    Form->>API: POST /api/feeds { url }
    API->>SVC: createFeed({ url })
    SVC->>DB: findByUrl(url) 重複チェック
    DB-->>SVC: null（未登録）or Feed（登録済み）

    alt 既に登録済み
        SVC-->>API: ConflictError
        API-->>Form: 409 { error: "Feed with this URL already exists" }
        Form-->>U: エラーメッセージ表示
    else 未登録
        SVC->>SSRF: validateUrl(url)
        SSRF->>SSRF: IPアドレス解決・プライベートIP確認
        alt プライベートIP
            SSRF-->>SVC: SSRFError
            SVC-->>API: ValidationError
            API-->>Form: 400 { error: "URL is not allowed" }
            Form-->>U: エラーメッセージ表示
        else パブリックIP
            SVC->>RSS: fetchFeed(url, timeout=30s)
            RSS->>ExtRSS: HTTP GET (AbortController 30s)

            alt タイムアウト/接続失敗
                RSS-->>SVC: FetchError
                SVC-->>API: FetchError
                API-->>Form: 422 { error: "Failed to fetch the feed URL" }
                Form-->>U: エラーメッセージ表示
            else RSS/Atom形式でない
                RSS-->>SVC: ParseError
                SVC-->>API: ParseError
                API-->>Form: 422 { error: "URL is not a valid RSS/Atom feed" }
                Form-->>U: エラーメッセージ表示
            else 取得成功
                RSS-->>SVC: { title, description }
                SVC->>DB: createFeed({ url, title, description, lastFetchedAt })
                DB-->>SVC: Feed（作成済み）
                SVC-->>API: Feed
                API-->>Form: 201 { data: Feed }
                Form-->>U: 登録完了、一覧に追加
            end
        end
    end
```

**詳細ステップ**:
1. フォームでクライアントサイドURL形式チェック（http/https プレフィックス）
2. `POST /api/feeds` に URL を送信
3. DB で重複チェック（UNIQUE 制約）
4. SSRF ガードで対象 IP を検証
5. `rss-parser` で RSS/Atom フェッチ（30秒 AbortController）
6. タイトル・説明を抽出し DB に保存
7. 成功レスポンスを返しフォームをリセット

---

### 機能2: フィード一覧表示 🔵

**信頼性**: 🔵 *ユーザーストーリー2.1・要件REQ-002, REQ-003より*

**関連要件**: REQ-002, REQ-003, REQ-202

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant Page as FeedListPage (Server Component)
    participant DB as Prisma/SQLite

    U->>Page: ページアクセス（GET /）
    Page->>DB: findManyFeeds({ orderBy: createdAt desc })
    DB-->>Page: Feed[] （または空配列）

    alt フィードあり
        Page-->>U: フィード一覧（タイトル・登録日時・最終更新日時）
    else フィードなし
        Page-->>U: 「No feeds registered yet. Add your first feed!」メッセージ
    end
```

---

### 機能3: フィード編集 🔵

**信頼性**: 🔵 *ユーザーストーリー3.1・要件REQ-104より*

**関連要件**: REQ-104

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant Page as FeedEditPage (Client Component)
    participant API as PUT /api/feeds/:id
    participant SVC as FeedService
    participant DB as Prisma/SQLite

    U->>Page: 編集ボタンクリック → 編集フォーム表示
    U->>Page: タイトル・説明・メモを変更して保存
    Page->>API: PUT /api/feeds/:id { title, description, memo }
    API->>SVC: updateFeed(id, { title, description, memo })
    SVC->>DB: findById(id) 存在確認
    alt 存在しない
        DB-->>SVC: null
        SVC-->>API: NotFoundError
        API-->>Page: 404 { error: "Feed not found" }
    else 存在する
        SVC->>DB: updateFeed(id, data)
        DB-->>SVC: Feed（更新済み）
        SVC-->>API: Feed
        API-->>Page: 200 { data: Feed }
        Page-->>U: 更新完了メッセージ表示
    end
```

---

### 機能4: フィード削除 🔵

**信頼性**: 🔵 *ユーザーストーリー4.1・要件REQ-105より*

**関連要件**: REQ-105

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant List as FeedList (Client Component)
    participant Dialog as DeleteConfirmDialog
    participant API as DELETE /api/feeds/:id
    participant SVC as FeedService
    participant DB as Prisma/SQLite

    U->>List: 削除ボタンクリック
    List->>Dialog: 確認ダイアログ表示
    Dialog-->>U: "Are you sure you want to delete this feed?"

    alt キャンセル
        U->>Dialog: キャンセルボタン
        Dialog-->>U: ダイアログを閉じる（削除しない）
    else 確認（削除）
        U->>Dialog: 削除ボタン
        Dialog->>API: DELETE /api/feeds/:id
        API->>SVC: deleteFeed(id)
        SVC->>DB: findById(id) 存在確認
        alt 存在しない
            DB-->>SVC: null
            SVC-->>API: NotFoundError
            API-->>Dialog: 404 { error: "Feed not found" }
        else 存在する
            SVC->>DB: deleteFeed(id)
            DB-->>SVC: 削除完了
            SVC-->>API: success
            API-->>Dialog: 200 { success: true }
            Dialog-->>List: 一覧から削除
            List-->>U: フィードが消えた一覧を表示
        end
    end
```

---

## エラーハンドリングフロー 🔵

**信頼性**: 🔵 *要件定義 REQ-106, REQ-107, EDGE-001, EDGE-002・ヒアリングより*

```mermaid
flowchart TD
    E["エラー発生"] --> T{"エラー種別"}
    T -->|"重複URL (ConflictError)"| C409["409 Conflict\n'Feed with this URL already exists'"]
    T -->|"バリデーションエラー"| C400["400 Bad Request\n'Invalid URL format'"]
    T -->|"SSRF ブロック"| C400b["400 Bad Request\n'URL is not allowed'"]
    T -->|"HTTP取得失敗/タイムアウト"| C422a["422 Unprocessable Entity\n'Failed to fetch the feed URL'"]
    T -->|"RSS形式エラー"| C422b["422 Unprocessable Entity\n'URL is not a valid RSS/Atom feed'"]
    T -->|"リソース未存在"| C404["404 Not Found\n'Feed not found'"]
    T -->|"サーバー内部エラー"| C500["500 Internal Server Error\n'Internal server error'"]

    C409 --> R["フォームにエラーメッセージ表示"]
    C400 --> R
    C400b --> R
    C422a --> R
    C422b --> R
    C404 --> R
    C500 --> L["ログ記録"] --> R
```

---

## URL検証フロー（SSRF対策含む）🔵

**信頼性**: 🔵 *ヒアリングQ6(SSRF対策)・REQ-101, REQ-402より*

```mermaid
flowchart TD
    Input["URL入力"] --> F1{"http/https?"}
    F1 -->|No| Err1["400: Invalid URL format"]
    F1 -->|Yes| F2{"URL長 <= 2048?"}
    F2 -->|No| Err2["400: URL too long"]
    F2 -->|Yes| F3{"DNS解決可能?"}
    F3 -->|No| Err3["422: Failed to fetch the feed URL"]
    F3 -->|Yes| F4{"プライベートIP?"}
    F4 -->|Yes| Err4["400: URL is not allowed"]
    F4 -->|No| F5["HTTP GET リクエスト (30s timeout)"]
    F5 -->|タイムアウト| Err5["422: Failed to fetch the feed URL (timeout)"]
    F5 -->|接続エラー| Err3
    F5 -->|成功| F6{"RSS/Atom形式?"}
    F6 -->|No| Err6["422: URL is not a valid RSS/Atom feed"]
    F6 -->|Yes| F7["タイトル・説明抽出"]
    F7 --> OK["DB保存 → 成功"]
```

---

## データ処理パターン

### 同期処理 🔵

**信頼性**: 🔵 *アーキテクチャ設計より*

- フィード一覧取得（SQLite はローカルI/O、十分高速）
- フィード編集・削除
- Prisma ORM クエリ（SQLite 同期API使用）

### 非同期処理 🔵

**信頼性**: 🔵 *RSSフェッチ要件より*

- RSS URL検証・フェッチ（外部HTTPリクエスト、30秒タイムアウト）
- Route Handler は全体が async 関数として処理

### バッチ処理 🟡

**信頼性**: 🟡 *将来的な拡張として推測（現スコープ外）*

- 現在のスコープには含まれない（フィード記事の定期更新は今回対象外）

---

## 状態管理フロー

### フロントエンド状態管理 🔵

**信頼性**: 🔵 *Next.js App Router設計・ヒアリングより*

```mermaid
stateDiagram-v2
    [*] --> 初期状態: ページロード
    初期状態 --> フィード一覧表示: Server Component でDB取得
    フィード一覧表示 --> 登録フォーム入力: 登録ボタンクリック
    登録フォーム入力 --> 送信中: 登録ボタンクリック
    送信中 --> フィード一覧表示: 登録成功（router.refresh）
    送信中 --> エラー表示: 登録失敗
    エラー表示 --> 登録フォーム入力: エラー確認
    フィード一覧表示 --> 削除確認ダイアログ: 削除ボタンクリック
    削除確認ダイアログ --> フィード一覧表示: 削除完了/キャンセル
    フィード一覧表示 --> 編集フォーム入力: 編集ボタンクリック
    編集フォーム入力 --> フィード一覧表示: 保存完了
```

---

## データ整合性の保証 🔵

**信頼性**: 🔵 *Prisma + SQLite制約より*

- **UNIQUE制約**: `url` カラムにDB側でUNIQUE制約（REQ-401, REQ-103）
- **NULL制約**: `title`, `url` は NOT NULL
- **トランザクション**: 単一フィード操作のため明示的トランザクション不要
- **Prismaによる型安全保証**: コンパイル時にSQLインジェクションを防止

---

## 関連文書

- **アーキテクチャ**: [architecture.md](architecture.md)
- **型定義**: [interfaces.ts](interfaces.ts)
- **DBスキーマ**: [database-schema.sql](database-schema.sql)
- **API仕様**: [api-endpoints.md](api-endpoints.md)

## 信頼性レベルサマリー

- 🔵 青信号: 18件 (82%)
- 🟡 黄信号: 3件 (14%)
- 🔴 赤信号: 1件 (4%)

**品質評価**: 高品質
