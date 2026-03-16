# RSS Reader 要件定義書（逆生成）

## 分析概要

**分析日時**: 2026-03-16
**対象コードベース**: /workspaces/rss-reader/src
**抽出要件数**: 42個の機能要件、18個の非機能要件
**信頼度**: 88% （実装 + テスト + 明確な動作に基づく）

---

## システム概要

### 推定されたシステム目的

個人または小規模チーム向けのRSSフィードリーダーWebアプリケーション。複数のRSSフィードを購読・管理し、記事を効率的に閲覧・整理できる。SQLiteを使用したローカルファーストのPWA（Progressive Web App）として動作する。

### 対象ユーザー

- **個人ユーザー**: 複数のRSSフィードをまとめて読みたい情報収集者
- **セルフホストユーザー**: Dockerなどでプライベートに運用するユーザー
- **技術系ユーザー**: キーボードショートカット等の高度な設定を活用したいユーザー

---

## 機能要件（EARS記法）

### フィード管理

#### REQ-001: フィード登録
システムはRSS/AtomフィードのURLを指定して新しいフィードを登録できなければならない。

**実装根拠**: `feed-service.ts:createFeed()`, `POST /api/feeds`, `feed-form.tsx`

#### REQ-002: フィード情報取得
システムはフィード登録時にRSSを取得してタイトル・説明・ファビコンURLを自動的に取得しなければならない。

**実装根拠**: `rss-fetcher.ts:fetchFeed()`, `entry-fetcher.ts`

#### REQ-003: フィード重複防止
同一URLのフィードが既に登録されている場合、システムは重複登録を拒否しなければならない。

**実装根拠**: `feed-service.ts` の uniqueConstraint チェック, `ConflictError` (409)

#### REQ-004: フィード一覧表示
システムは登録済みフィードをサイドバーに表示しなければならない。
表示項目: タイトル、未読件数バッジ、ファビコン

**実装根拠**: `sidebar.tsx`, `getAllFeeds()` in `feed-service.ts`

#### REQ-005: フィード編集
システムはフィードのタイトル・説明・メモを編集できなければならない。

**実装根拠**: `PUT /api/feeds/[id]`, `edit-feed-form.tsx`

#### REQ-006: フィード削除
システムはフィードを削除でき、関連する記事も一緒に削除されなければならない。

**実装根拠**: `DELETE /api/feeds/[id]`, Prisma cascade delete

#### REQ-007: フィード管理ページ
システムはフィード一覧をテーブル形式で表示するフィード管理ページを提供しなければならない。
表示項目: タイトル、説明、最終公開日、編集/削除ボタン

**実装根拠**: `feed-list.tsx`, `/app/feeds/page.tsx`

#### REQ-008: 手動リフレッシュ
システムはサイドバーのリフレッシュボタンで全フィードを手動で更新できなければならない。

**実装根拠**: `POST /api/feeds/refresh`, `sidebar.tsx`

#### REQ-009: 自動フィード更新
システムは毎時0分に全フィードを自動的に更新しなければならない。

**実装根拠**: `cron.ts` ("0 * * * *"), `fetchAllFeedsEntries()`

---

### 記事管理

#### REQ-010: 記事取得・保存
システムはRSSフィードから記事を取得してデータベースに保存しなければならない。
保存項目: GUID、タイトル、リンク、説明、本文、画像URL、公開日時

**実装根拠**: `entry-fetcher.ts:fetchEntries()`, `entry-service.ts:saveEntries()`

#### REQ-011: 記事の重複排除（GUID）
同一フィード内で同一GUIDを持つ記事は重複して保存されないようにしなければならない。

**実装根拠**: `entry-service.ts` の upsert (feedId + guid composite unique)

#### REQ-012: 記事件数上限
フィードごとに最大500件の記事を保持し、超過時は古い記事から削除しなければならない。

**実装根拠**: `entry-service.ts:enforceEntryLimit()` (MAX_ENTRIES = 500)

#### REQ-013: 記事一覧表示
システムは記事をカードグリッドで表示しなければならない。
表示項目: サムネイル画像、タイトル、要約、公開日時

**実装根拠**: `entry-card-grid.tsx`, `entry-card.tsx`

#### REQ-014: 無限スクロール
システムは記事一覧でスクロール時に追加記事を自動ロードするインフィニットスクロールを実装しなければならない。

**実装根拠**: `entry-card-grid.tsx` の IntersectionObserver 実装

#### REQ-015: 記事詳細表示（モーダル）
システムは記事クリック時にモーダルで記事詳細（Markdownレンダリング）を表示しなければならない。

**実装根拠**: `article-modal.tsx`

#### REQ-016: 記事ナビゲーション
記事モーダルが開いている場合、システムは前後の記事へのナビゲーションボタンを提供しなければならない。

**実装根拠**: `article-modal.tsx` の prev/next ボタン, `entry-card-grid.tsx`

#### REQ-017: 外部リンク
システムは記事モーダルから元記事のURLをブラウザで開けるリンクを提供しなければならない。

**実装根拠**: `article-modal.tsx` の external link button

---

### 記事フィルタリング・検索

#### REQ-018: フィード別フィルタ
システムは特定のフィードの記事のみを表示するフィルタリングを提供しなければならない。

**実装根拠**: `entry-filter.tsx`, `findManyEntries(feedId)` in `entry-service.ts`

#### REQ-019: タグ別フィルタ
システムは特定のタグが付いた記事のみを表示するフィルタリングを提供しなければならない。

**実装根拠**: `entry-filter.tsx`, `findManyEntries(tagId)` in `entry-service.ts`

#### REQ-020: キーワード検索
システムは記事タイトルに対するキーワード検索を提供しなければならない。

**実装根拠**: `entry-filter-bar.tsx`, `findManyEntries(search)` in `entry-service.ts`

#### REQ-021: 既読/未読フィルタ
システムは未読記事のみを表示するフィルタリングを提供しなければならない。デフォルトは未読のみ表示。

**実装根拠**: `read-filter.tsx`, `isUnread` filter in `entry-service.ts`

#### REQ-022: URL重複排除表示
同一URLの記事が複数フィードに存在する場合、デフォルトでフィードを指定していない一覧では1件のみ表示しなければならない。

**実装根拠**: `entry-service.ts:findManyEntriesDedup()` (CTE raw SQL)

---

### 既読管理

#### REQ-023: 既読マーク
システムは記事モーダルを開いたときに自動的に既読マークを付けなければならない。

**実装根拠**: `article-modal.tsx` の auto-read on open

#### REQ-024: 既読/未読トグル
システムは記事の既読/未読状態を手動でトグルできなければならない。
（カードのアイコン、モーダルのボタン両方から）

**実装根拠**: `entry-card.tsx` の eye icon, `article-modal.tsx` の read toggle

#### REQ-025: リンク同期既読
同一リンクを持つ複数記事のいずれかを既読にした場合、システムは同一リンクの全記事を既読にしなければならない。

**実装根拠**: `entry-service.ts:updateEntryMeta()` の link sync logic

#### REQ-026: 新着重複記事の自動既読
フィード更新時に取得した新記事のリンクが既読済みの記事と一致する場合、システムは新記事を自動的に既読にしなければならない。

**実装根拠**: `entry-service.ts:saveEntries()` の link-based dedup

---

### 「後で読む」機能

#### REQ-027: 後で読む登録
システムは記事を「後で読む」リストに追加/削除できなければならない。

**実装根拠**: `article-modal.tsx` の bookmark toggle, `PUT /api/entries/[id]/meta`

#### REQ-028: 後で読む一覧
システムは「後で読む」登録された記事の一覧ページを提供しなければならない。

**実装根拠**: `/app/read-later/page.tsx`

#### REQ-029: 後で読む未読数
システムはサイドバーに「後で読む」の未読件数バッジを表示しなければならない。

**実装根拠**: `GET /api/entries/read-later-unread-count`, `sidebar.tsx`

---

### タグ管理

#### REQ-030: タグ付け
システムは記事にタグを付けられなければならない。タグが存在しない場合は新規作成する。

**実装根拠**: `tag-service.ts:upsertTagAndAssign()`, `POST /api/tags`, `tag-input.tsx`

#### REQ-031: タグ削除
システムは記事からタグを削除できなければならない。

**実装根拠**: `DELETE /api/tags/[tagId]/entries/[entryId]`

#### REQ-032: タグ名変更
システムはタグ名を変更できなければならない。

**実装根拠**: `PATCH /api/tags/[tagId]`, `sidebar.tsx` inline editing

#### REQ-033: タグ削除（全体）
システムはタグ自体を削除でき、全記事からの紐付けも削除されなければならない。

**実装根拠**: `DELETE /api/tags/[tagId]`, `tag-service.ts:deleteTag()`

#### REQ-034: タグ一覧サイドバー表示
システムはサイドバーにタグ一覧を表示し、タグクリックでフィルタリングできなければならない。

**実装根拠**: `sidebar.tsx`, `GET /api/tags`

#### REQ-035: タグ入力オートコンプリート
記事へのタグ入力時、システムは既存タグの候補を表示しなければならない。

**実装根拠**: `tag-input.tsx` の autocomplete

---

### ダイジェスト機能

#### REQ-036: ダイジェスト作成
システムはMarkdown形式のダイジェスト（ノート）を作成できなければならない。

**実装根拠**: `digest-service.ts:createDigest()`, `POST /api/digests`, `digest-form.tsx`

#### REQ-037: ダイジェスト一覧
システムはダイジェストをページネーション付きで一覧表示しなければならない。

**実装根拠**: `GET /api/digests`, `/app/digests/page.tsx`

#### REQ-038: ダイジェスト閲覧・編集・削除
システムはダイジェストの閲覧、編集、削除ができなければならない。

**実装根拠**: `GET/PATCH/DELETE /api/digests/[id]`, `/app/digests/[id]`

---

### 設定・カスタマイズ

#### REQ-039: キーボードショートカット設定
システムはキーボードショートカットをユーザーがカスタマイズできる設定ページを提供しなければならない。

**実装根拠**: `/app/settings/page.tsx`, `use-hotkey-config.ts`, `hotkey-config.ts`

#### REQ-040: キーボードショートカット機能
システムは記事モーダルで以下のデフォルトキーボードショートカットを提供しなければならない:
- `b`: 後で読む登録/解除
- `m`: 既読/未読トグル
- `Escape`: モーダルを閉じる
- `←`: 前の記事
- `→`: 次の記事
- `o`: 元記事を開く

**実装根拠**: `article-modal.tsx`, `hotkey-config.ts`

---

### 画像処理

#### REQ-041: 記事画像取得
システムはRSS記事から以下の優先順位で画像を取得しなければならない:
1. RSS 2.0 enclosure（image/*型）
2. Media RSS (media:content)
3. media:thumbnail
4. iTunes image
5. コンテンツ内の最初の`<img>`タグ
6. OGPメタタグ（og:image, twitter:image）

**実装根拠**: `entry-fetcher.ts` の image extraction logic

#### REQ-042: OGP画像バッチ取得
RSSに画像がない場合、システムは記事URLからOGP画像を取得しなければならない。
5件並列・1件あたり5秒タイムアウト。

**実装根拠**: `entry-fetcher.ts` の OGP fetch batching

---

## 非機能要件

### セキュリティ

#### NFR-001: SSRF対策
システムはフィードURL登録時にSSRF（Server-Side Request Forgery）を防止しなければならない。
ブロック対象: プライベートIPアドレス範囲（127.x, 10.x, 172.16-31.x, 192.168.x, 169.254.x, 100.64-127.x, IPv6 local）

**実装根拠**: `ssrf-guard.ts:validateUrl()`

#### NFR-002: URLプロトコル制限
システムはhttp/httpsプロトコルのURLのみ受け付けなければならない。

**実装根拠**: `ssrf-guard.ts` のプロトコルチェック

#### NFR-003: URL最大長制限
システムはURL入力を2048文字以内に制限しなければならない。

**実装根拠**: `ssrf-guard.ts` の MAX_URL_LENGTH = 2048

#### NFR-004: エラーコード体系
システムは以下の標準HTTPエラーコードでエラーを返さなければならない:
- 400: 不正なURL
- 404: リソースが見つからない
- 409: フィード重複
- 422: RSS取得失敗/不正なフォーマット

**実装根拠**: `errors.ts` の各エラークラス

---

### パフォーマンス

#### NFR-005: ページネーション
システムはAPIレベルでページネーション（cursor-based & offset-based）を実装しなければならない。

**実装根拠**: `findManyEntries()` の `page`, `limit`, `afterId`, `beforeId` パラメータ

#### NFR-006: フィード取得タイムアウト
システムはRSSフィード取得に30秒のタイムアウトを設定しなければならない。

**実装根拠**: `rss-fetcher.ts` の timeout: 30000

#### NFR-007: OGP取得タイムアウト
システムはOGP画像取得に5秒のタイムアウトを設定しなければならない。

**実装根拠**: `entry-fetcher.ts` の OGP timeout = 5000ms

#### NFR-008: データベースインデックス
システムは記事の公開日時降順、フィードID、タグIDにインデックスを設定しなければならない。

**実装根拠**: `prisma/schema.prisma` の @@index 定義

---

### ユーザビリティ

#### NFR-009: レスポンシブデザイン
システムはモバイルからデスクトップまで対応したレスポンシブデザインでなければならない。
グリッド: 1〜4カラム（ビューポートサイズに応じて変化）

**実装根拠**: `entry-card-grid.tsx`, Tailwind CSS レスポンシブクラス

#### NFR-010: ダークモード
システムはダークモードに対応しなければならない。

**実装根拠**: `next-themes` 導入, Tailwind CSS dark クラス

#### NFR-011: トースト通知
システムは操作結果（成功/失敗）をトースト通知で表示しなければならない。

**実装根拠**: `sonner` ライブラリ, 各コンポーネントの toast 呼び出し

#### NFR-012: ファビコン表示
システムはフィードのファビコンをサイドバーに表示し、取得失敗時はフォールバック表示をしなければならない。

**実装根拠**: `sidebar.tsx` の favicon with error fallback

---

### PWA・運用

#### NFR-013: PWA対応
システムはProgressive Web App（PWA）として動作しなければならない。
オフラインキャッシュ対応（Service Worker経由）

**実装根拠**: `src/app/sw.ts`, Serwist ライブラリ

#### NFR-014: アプリバッジ
システムはPWAのアプリアイコンに未読件数バッジを表示しなければならない。

**実装根拠**: `sidebar.tsx` の `navigator.setAppBadge()`

#### NFR-015: スケジュール実行
システムはnode-cronを用いてサーバー起動時からスケジュール実行を開始しなければならない。

**実装根拠**: `cron.ts`, Next.js サーバーサイド初期化

#### NFR-016: エラーハンドリング
システムはスケジュール実行中のエラーをキャッチしてサーバーをクラッシュさせないようにしなければならない。

**実装根拠**: `cron.ts` の try-catch

---

### データ整合性

#### NFR-017: カスケード削除
システムはフィードを削除した際に関連する記事・メタデータ・タグ紐付けも削除しなければならない。

**実装根拠**: Prisma cascade delete in `schema.prisma`

#### NFR-018: タグ名正規化
システムはタグ名の大文字小文字を正規化して一意性を保証しなければならない。

**実装根拠**: `tag-service.ts:renameTag()` のケース正規化

---

## Edgeケース

### エラー処理

#### EDGE-001: 無効なRSSフォーマット
URLが有効でもRSSとして解析できない場合、422エラーを返す。

**実装根拠**: `InvalidFeedFormatError` in `rss-fetcher.ts`

#### EDGE-002: フィード取得失敗
ネットワークエラーやタイムアウトでフィード取得に失敗した場合、422エラーを返す。

**実装根拠**: `FeedFetchError` in `feed-service.ts`

#### EDGE-003: 画像取得失敗
記事カードで画像の読み込みに失敗した場合、エラーを無視してフォールバック表示する。

**実装根拠**: `entry-card.tsx` の onError ハンドラ

#### EDGE-004: スケジュール実行中のURL無効化
自動更新時にフィードURLが無効な場合、そのフィードをスキップして他のフィードの更新を継続する。

**実装根拠**: `entry-service.ts:fetchAllFeedsEntries()` のエラーハンドリング

### 境界値

#### EDGE-101: GUID欠落
RSSアイテムにGUIDが存在しない場合、リンク → タイトルの順でフォールバックする。

**実装根拠**: `entry-fetcher.ts` の GUID 抽出ロジック

#### EDGE-102: 記事件数上限超過
フィードの記事が500件を超えた場合、publishedAt昇順で古い記事から削除する。

**実装根拠**: `entry-service.ts:enforceEntryLimit()`

#### EDGE-103: プライベートIPへのDNS解決
フィードURLのドメインがプライベートIPに解決する場合、SSRF攻撃として400エラーを返す。

**実装根拠**: `ssrf-guard.ts` のDNSルックアップ + IPチェック

---

## 推定されていない要件

### ステークホルダー確認が必要な項目

1. **認証・マルチユーザー対応**
   - 現在は認証なし（シングルユーザー想定）
   - docker-compose にGoogle OAuth設定があるが、本番要件は不明

2. **データバックアップ・リカバリ**
   - SQLiteファイルのバックアップ方法は未定義

3. **SLA・可用性要件**
   - 自動更新失敗時のリトライ戦略は未実装

4. **記事の保持期間**
   - 500件上限のみで期間制限は未実装

5. **OPMLインポート/エクスポート**
   - 未実装（フィードの一括操作機能なし）

### 推奨される次ステップ

1. **認証要件の確認**: シングルユーザー/マルチユーザーの方針決定
2. **OPMLサポート**: フィードのインポート/エクスポート機能
3. **記事保持ポリシー**: 期間ベースの削除戦略
4. **パフォーマンステスト**: 大量フィード時の動作確認
5. **バックアップ戦略**: SQLiteデータの定期バックアップ

---

## 分析の制約事項

| 要因 | 詳細 |
|------|------|
| テストカバレッジ | 主要機能はカバー済み。UIの一部とダイジェスト機能のテストが少ない |
| 認証実装 | docker-compose設定のみで、アプリ内認証コードなし |
| コメント | 全体的に少ない。意図を推定で補完している箇所あり |

### 根拠の強さ

- **強い根拠** (実装 + テスト): REQ-001〜012, REQ-018〜026, NFR-001〜004
- **中程度の根拠** (実装 + 部分テスト): REQ-013〜017, REQ-027〜035, NFR-005〜012
- **弱い根拠** (実装のみ推定): REQ-036〜042, NFR-013〜018
