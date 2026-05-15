# Implementation Plan

- [ ] 1. データ基盤とエラー型の確立
- [ ] 1.1 Feedエンティティ型・APIリクエスト/レスポンス型・エラーコード型を定義する
  - `src/types/feed.ts` に Feed・FeedListItem・CreateFeedRequest・UpdateFeedRequest・ErrorCode等の型を定義する
  - `FetchedFeedInfo`・`UpdateFeedInput`・フォーム状態型を含める
  - TypeScript strict モードで `any` を使用しない
  - `src/types/feed.ts` が型エラーなしにコンパイルされることを確認する
  - _Requirements: 1.1, 1.2, 4.1, 5.1, 6.1_
  - _Boundary: Types_

- [ ] 1.2 AppError基底クラスと各ドメインエラークラスを実装する
  - `src/lib/errors.ts` に AppError・ConflictError・NotFoundError・FeedFetchError・InvalidFeedFormatError・SSRFError を実装する
  - 各エラーが正しい `code` と `statusCode` を持つことを確認する
  - エラークラスをインスタンス化して `instanceof AppError` でキャッチできることを確認する
  - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7, 5.2, 6.2, 6.4, 7.2_
  - _Boundary: Errors_

- [ ] 1.3 PrismaスキーマにFeedモデルとEntryモデルを定義してマイグレーションを実行する
  - `prisma/schema.prisma` に Feed モデル（url UNIQUE、title・description・faviconUrl・memo・lastFetchedAt）を定義する
  - Entry モデル（feedId_guid 複合ユニーク、effectedDate、imageUrl等）と EntryMeta モデルを定義する
  - FeedからEntryへのカスケード削除リレーションを設定する
  - `npx prisma migrate dev` が成功しDBスキーマが生成されることを確認する
  - _Requirements: 7.1, 3.4_
  - _Boundary: Prisma Schema_

- [ ] 2. SSRF Guard実装
- [ ] 2.1 プライベートIPレンジ定義とisPrivateIP関数を実装する
  - `src/lib/ssrf-guard.ts` に IPv4・IPv6プライベートアドレスのレンジ定数を定義する
  - 対象: RFC1918（10.x/172.16-31.x/192.168.x）・ループバック（127.x/::1）・リンクローカル（169.254.x/fe80:）・CGNAT（100.64-127.x）・IPv6ユニークローカル（fc00:/fd）
  - `isPrivateIP(ip: string): boolean` 関数を実装する
  - 各レンジの代表値と境界値でテストを実行し全件パスすることを確認する
  - _Requirements: 9.4, 9.5_
  - _Boundary: SSRF Guard_

- [ ] 2.2 validateUrl関数を実装してSSRF保護を完成させる
  - `validateUrl(url: string): Promise<void>` を実装する
  - プロトコル検証（http/httpsのみ）・URL長（2048文字以内）・URLパース可能性を検証する
  - `dns.lookup(hostname, { all: true })` で全IPアドレスを解決し `isPrivateIP` で検査する
  - DNS解決失敗時も `SSRFError` を投げる
  - バリデーション違反時に `SSRFError` が投げられ、正常URLでは `void` が返ることを確認する
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  - _Boundary: SSRF Guard_

- [ ] 3. RSSフェッチャーとエントリーフェッチャーの実装
- [ ] 3.1 (P) RssFetcherでフィードメタデータ取得を実装する
  - `src/lib/rss-fetcher.ts` に `fetchFeed(url: string): Promise<FetchedFeedInfo>` を実装する
  - 30秒タイムアウト（AbortController）でHTTPフェッチする
  - rss-parserでパースし title・description・faviconUrl（RSS 2.0 image.url / Atom icon）を抽出する
  - タイトル不在時はURLをフォールバックとして使用する
  - フェッチ失敗時 `FeedFetchError`、パース失敗時 `InvalidFeedFormatError` を投げる
  - `fetchFeed` がモックフィードXMLに対して正しい `FetchedFeedInfo` を返すことを確認する
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 1.6, 1.7_
  - _Boundary: RssFetcher_

- [ ] 3.2 (P) EntryFetcherでエントリー取得と画像URL抽出を実装する
  - `src/lib/entry-fetcher.ts` に `fetchEntries(feedUrl: string): Promise<FetchedEntryData[]>` を実装する
  - rss-parserのカスタムフィールド（content:encoded・media:content・media:thumbnail・itunes:image）を設定する
  - 画像URL抽出優先順位: RSS enclosure → media:content → media:thumbnail → itunes:image → コンテンツ内imgタグ を実装する
  - 画像なしエントリーに対してバッチ5件でOGP取得（og:image/twitter:image、5秒タイムアウト）を実行する
  - `fetchEntries` がモックRSSに対して正しい `FetchedEntryData[]` を返すことを確認する
  - _Requirements: 3.1, 3.2, 3.3_
  - _Boundary: EntryFetcher_

- [ ] 4. FeedServiceの実装
- [ ] 4.1 createFeed関数を実装する
  - `src/lib/feed-service.ts` に `createFeed(url: string): Promise<Feed>` を実装する
  - 重複チェック（url UNIQUE）→ `validateUrl` → `fetchFeed` → `prisma.feed.create` のシーケンスを実装する
  - 重複時 `ConflictError`、SSRF違反時・フェッチ失敗時・パース失敗時は各エラーをそのまま再スローする
  - 正常登録後に Feed レコードがDBに存在することを確認する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_
  - _Boundary: FeedService_

- [ ] 4.2 (P) getAllFeedsを実装する（未読数・最新投稿日時付き）
  - `getAllFeeds(): Promise<FeedListItem[]>` を React `cache()` でラップして実装する
  - 未読エントリー数（EntryMetaが存在しないまたはisReadがfalse）を `_count` で取得する
  - 各フィードの最新エントリー公開日時（MAX publishedAt）をRAWクエリで取得する
  - 結果を lastPublishedAt 降順でソート（null を末尾）して返す
  - `getAllFeeds` がフィード一覧を unreadCount と lastPublishedAt 付きで返すことを確認する
  - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - _Boundary: FeedService_

- [ ] 4.3 (P) getFeedById・updateFeed・deleteFeedを実装する
  - `getFeedById(id: string): Promise<Feed>` を実装し、存在しない場合 `NotFoundError` を投げる
  - `updateFeed(id: string, data: UpdateFeedInput): Promise<Feed>` を実装する（URL変更不可）
  - `deleteFeed(id: string): Promise<void>` を実装する（Prismaのカスケード削除により関連Entryも削除）
  - 存在しないIDでは `NotFoundError` が、正常時は更新/削除されたデータが返ることを確認する
  - _Requirements: 5.1, 5.2, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3_
  - _Boundary: FeedService_

- [ ] 5. EntryServiceの実装
- [ ] 5.1 saveEntries関数を実装する（重複排除・既読連動）
  - `saveEntries(feedId: string, entries: FetchedEntryData[]): Promise<void>` を実装する
  - `prisma.entry.upsert` で `(feedId, guid)` を一意キーとして重複排除する
  - 新規エントリー保存時に同一linkの既読EntryMetaが存在すれば自動既読にする
  - `saveEntries` 実行後にDBにEntryレコードが存在し重複がないことを確認する
  - _Requirements: 3.1, 3.5_
  - _Boundary: EntryService_

- [ ] 5.2 (P) enforceEntryLimit関数を実装する（500件上限管理）
  - `enforceEntryLimit(feedId: string): Promise<void>` を実装する
  - 500件以下の場合は何もしない
  - 500件超過時は `publishedAt` 昇順（nullは `createdAt` 昇順）で古いものから超過分を削除する
  - エントリーが501件の状態で実行後に500件になることを確認する
  - _Requirements: 3.4_
  - _Boundary: EntryService_

- [ ] 5.3 (P) fetchAllFeedsEntries関数を実装する（全フィードリフレッシュ）
  - `fetchAllFeedsEntries(): Promise<void>` を実装する
  - 全Feedを取得し各フィードに対して `validateUrl` → `fetchEntries` → `saveEntries` → `enforceEntryLimit` → `lastFetchedAt`更新を順次実行する
  - 個別フィードのエラーをcatchしてコンソールログ出力後にスキップし次のフィードを処理継続する
  - 1フィードがエラーでも他のフィード処理が完了することを確認する
  - _Requirements: 3.6, 3.7, 8.1_
  - _Boundary: EntryService_

- [ ] 6. Feed API Routesの実装
- [ ] 6.1 (P) GET/POST /api/feedsルートを実装する
  - `src/app/api/feeds/route.ts` に `GET` ハンドラー（`getAllFeeds` 呼び出し）を実装する
  - `POST` ハンドラーに URL文字列バリデーション（存在・型チェック）と `createFeed` 呼び出しを実装する
  - `AppError` を HTTP ステータスにマッピングする `handleError` 関数を実装する
  - GET で `{success: true, data: FeedListItem[]}` が、POST で 201 `{success: true, data: Feed}` が返ることを確認する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 4.1, 4.2, 4.3, 4.4_
  - _Boundary: Feed API Routes_

- [ ] 6.2 (P) GET/PUT/DELETE /api/feeds/[id]ルートを実装する
  - `src/app/api/feeds/[id]/route.ts` に GET（`getFeedById`）・PUT（`updateFeed`）・DELETE（`deleteFeed`）を実装する
  - PUT ハンドラーに空タイトルバリデーション（`title.trim() === ''`）を実装する
  - `AppError` をステータスコードにマッピングする `handleError` を実装する
  - PUT で空タイトルが 400、GET/PUT/DELETE で存在しないIDが 404 を返すことを確認する
  - _Requirements: 5.1, 5.2, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3_
  - _Boundary: Feed API Routes_

- [ ] 6.3 POST /api/feeds/refreshルートを実装する
  - `src/app/api/feeds/refresh/route.ts` に `fetchAllFeedsEntries` を呼び出す POST ハンドラーを実装する
  - 成功時は `{success: true}` (200)、エラー時は `{success: false}` (500) を返す
  - POST リクエストで `{success: true}` が返り、フィードのエントリーが更新されることを確認する
  - _Requirements: 8.1, 8.2, 8.3_
  - _Boundary: Feed API Routes_

- [ ] 7. フィード管理UIの実装
- [ ] 7.1 (P) FeedFormコンポーネント（フィード追加フォーム）を実装する
  - `src/components/feed-form.tsx` にURL入力フォームのClient Componentを実装する
  - クライアントサイドURLプレフィックス検証（http/httpsで始まるか）を実装する
  - 送信中は `Loader2` ローディング状態、エラー時は `role="alert"` のエラーメッセージを表示する
  - `redirectTo` プロップ指定時に成功後リダイレクトを実装する
  - フォーム送信でAPIが呼び出され、エラーメッセージがUIに表示されることを確認する
  - _Requirements: 1.1, 1.3, 10.5_
  - _Boundary: FeedForm_

- [ ] 7.2 (P) EditFeedFormコンポーネント（フィード編集フォーム）を実装する
  - `src/components/edit-feed-form.tsx` にタイトル・説明・メモ編集フォームのClient Componentを実装する
  - `feed` プロップで初期値を受け取り、URLは読み取り専用で表示する
  - description・memoは最大1000文字、文字数カウンターを表示する
  - 保存成功時に `/feeds` へリダイレクト、キャンセル時も `/feeds` へリダイレクトする
  - フォーム送信でPUT APIが呼び出され、成功後にフィード一覧ページへ遷移することを確認する
  - _Requirements: 6.1, 6.2, 6.3, 10.6_
  - _Boundary: EditFeedForm_

- [ ] 7.3 フィード一覧ページ（FeedsPage）を実装する
  - `src/app/feeds/page.tsx` にフィード一覧のClient Componentを実装する
  - マウント時に `GET /api/feeds` を呼び出し `FeedListItem[]` を取得・表示する
  - ロード中はスケルトンUI（4件パルスアニメーション）を表示する
  - フィードなし時は空状態UIとフィード追加リンクを表示する
  - 削除ボタンクリック時に `confirm()` ダイアログ → `DELETE /api/feeds/[id]` → ローカルstate更新のフローを実装する
  - ページロード後にフィード一覧が表示され、削除確認ダイアログが動作することを確認する
  - _Requirements: 10.1, 10.2, 10.3, 10.4_
  - _Boundary: FeedsPage_

- [ ] 7.4 フィード追加・編集ページのServer Componentを実装する
  - `src/app/feeds/new/page.tsx` に FeedForm を配置した Server Component を実装する
  - `src/app/feeds/[id]/edit/page.tsx` に `getFeedById` でフィード取得し EditFeedForm に渡す Server Component を実装する
  - フィードが存在しない場合は `notFound()` を呼び出す
  - `/feeds/new` でフォームが表示され、`/feeds/:id/edit` で既存フィードの初期値が表示されることを確認する
  - _Depends: 7.1, 7.2_
  - _Requirements: 1.1, 6.1, 5.2_
  - _Boundary: FeedsPage_

- [ ] 8. テストの実装
- [ ] 8.1 (P) SSRF Guard ユニットテストを実装する
  - `src/lib/ssrf-guard.test.ts` を作成する
  - `isPrivateIP` の全プライベートレンジ（IPv4/IPv6各種）と境界値をテストする
  - `validateUrl` の正常URL・プロトコル不正・長さ超過・プライベートIP・DNS解決失敗の各ケースをテストする
  - `npm test` で全テストがパスすることを確認する
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  - _Boundary: SSRF Guard_

- [ ] 8.2 (P) FeedService ユニットテストを実装する
  - `src/lib/feed-service.test.ts` を作成する
  - `createFeed` の正常・重複URL・SSRFエラー・フェッチエラーのケースをテストする
  - `getAllFeeds` の未読数・lastPublishedAtソート順をテストする
  - `updateFeed`・`deleteFeed` の正常・NotFoundのケースをテストする
  - `npm test` で全テストがパスすることを確認する
  - _Requirements: 1.1, 1.4, 4.1, 4.4, 6.1, 7.1_
  - _Boundary: FeedService_

- [ ] 8.3 (P) EntryService ユニットテストを実装する
  - `src/lib/entry-service.test.ts` を作成する（既存テストが存在する場合はマージ）
  - `saveEntries` の重複排除・既読連動のケースをテストする
  - `enforceEntryLimit` の500件境界値テストを実装する
  - `fetchAllFeedsEntries` の個別フィードエラースキップをテストする
  - `npm test` で全テストがパスすることを確認する
  - _Requirements: 3.1, 3.4, 3.5, 3.7_
  - _Boundary: EntryService_

- [ ]* 8.4 Feed API Routes 統合テストを実装する
  - `src/app/api/feeds/route.test.ts` と `src/app/api/feeds/[id]/route.test.ts` を作成する
  - POST /api/feeds の正常・重複・SSRF違反・フェッチ失敗のシナリオをテストする
  - PUT /api/feeds/[id] の空タイトル・NotFound・正常更新をテストする
  - `npm test` で全テストがパスすることを確認する
  - _Requirements: 1.1, 1.4, 6.2, 7.2_
  - _Boundary: Feed API Routes_
