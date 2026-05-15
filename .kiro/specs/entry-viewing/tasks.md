# Implementation Plan

## entry-viewing 実装タスク

---

- [ ] 1. EntryService のクエリ・ページネーション実装
- [ ] 1.1 findManyEntries — フィルタ・ソート・カーソルページネーション
  - `GetEntriesQuery` の全パラメータ（feedId, tagId, search, page, limit, afterId, beforeId, isReadLater, isUnread, userPreferenceId, isAnyPreferred, sortOrder, scoreThreshold）を Prisma where 句に変換する
  - `afterId` / `beforeId` カーソル: pivot エントリーの `publishedAt` を基準に前後フィルタを構築し、`beforeId` 時は昇順取得後 `.reverse()`
  - `Promise.all([findMany, count])` で並列実行し、pagination オブジェクト（page, limit, total, hasNext, hasPrev）を返す
  - feedId 未指定かつカーソルなしの場合のみ `findManyEntriesDedup` に委譲する分岐が実装されていること
  - _Requirements: 2.1, 4.6, 4.7, 8.1, 10.1, 10.5_
  - _Boundary: EntryService_

- [ ] 1.2 findManyEntriesDedup — link URL による重複排除
  - `prisma.entry.findMany({ distinct: ['link'], orderBy: { effectedDate: sortOrder } })` でリストを取得する
  - `prisma.entry.aggregate({ _count: { link: true } })` でページネーション用合計を取得する
  - tagId, search, isReadLater, isUnread, userPreferenceId, isAnyPreferred フィルタとの組み合わせが正しく動作すること
  - feedId 指定時またはカーソルパラメータ（afterId/beforeId）指定時はこの関数を呼ばない
  - _Requirements: 8.1, 8.2_
  - _Boundary: EntryService_

- [ ] 1.3 getEntryById — 詳細取得（feed + meta + tags join）
  - `prisma.entry.findUnique({ where: { id }, include: { feed, meta, tags: { include: { tag } } } })` で EntryDetail を返す
  - 存在しない場合は `null` を返す（API 層で 404 に変換）
  - _Requirements: 10.3, 10.4_
  - _Boundary: EntryService_

---

- [ ] 2. Entry API Routes 実装
- [ ] 2.1 (P) GET /api/entries — クエリパラメータ解析とバリデーション
  - `searchParams` から全パラメータを取り出し、`findManyEntries` に渡す
  - `page` パラメータが `isNaN` または `< 1` の場合、HTTP 400 + `{ code: 'VALIDATION_ERROR' }` を返す
  - 成功時は `{ success: true, data: entries, pagination }` を返す
  - _Requirements: 10.1, 10.2, 10.5_
  - _Boundary: Entry API Routes_

- [ ] 2.2 (P) GET /api/entries/:id — エントリー詳細エンドポイント
  - `getEntryById(id)` を呼び出し、`null` の場合 HTTP 404 + `{ code: 'ENTRY_NOT_FOUND' }` を返す
  - 成功時は `{ success: true, data: EntryDetail }` を返す
  - _Requirements: 10.3, 10.4_
  - _Boundary: Entry API Routes_

---

- [ ] 3. ホームページ Server Component 実装
- [ ] 3.1 page.tsx — 初期データフェッチと SearchParams 読み取り
  - `searchParams` から `feedId`, `tagId`, `search`, `filter`, `sortOrder` を読み取り、型安全にパースする
  - `Promise.all([findManyEntries, getAllTags, getAllFeeds])` で並列フェッチする
  - `pagination.total` を件数ヘッダーに表示し、フィルタ UI コンポーネント（ReadFilter, SortToggle, EntryFilterBar）に値を渡す
  - `EntryCardGrid` に `initialEntries`, `initialPagination`, フィルタ props を渡す
  - Server Component のため `export const dynamic = 'force-dynamic'` を設定する
  - _Requirements: 1.4, 4.3, 4.4_
  - _Boundary: page.tsx_

---

- [ ] 4. EntryFilterBar — フィルタリング・検索 UI
- [ ] 4.1 テキスト検索フィールドとデバウンス
  - 300ms デバウンスタイマーを `useRef<ReturnType<typeof setTimeout>>` で管理し、入力変化時に URL `search` パラメータを更新する
  - IME composition guard: `isComposingRef` で `compositionstart` / `compositionend` を追跡し、composition 中はデバウンスをスキップする
  - `useEffect` で `searchParams` の変化を監視し、外部からの URL 変化時に入力フィールドを同期する
  - クリアボタン（×）クリックで入力を即座にクリアし `search` パラメータを削除する
  - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - _Boundary: EntryFilterBar_

- [ ] 4.2 フィード・タグセレクターとフィルタクリア
  - フィードセレクター: "すべてのフィード" 選択で `feedId` を削除、フィード選択で `feedId` を設定する
  - タグセレクター: `allTags.length > 0` の場合のみ表示し、同様に `tagId` を更新する
  - フィルタ変更時は `entryId` パラメータを削除して開いているモーダルを閉じる
  - feedId, tagId, search のいずれかが active な場合に "クリア" ボタンを表示し、3パラメータと entryId を同時に削除する
  - _Requirements: 4.1, 4.2, 4.5_
  - _Boundary: EntryFilterBar_

---

- [ ] 5. ReadFilter / SortToggle コンポーネント
- [ ] 5.1 (P) ReadFilter — 既読フィルタトグル
  - "未読" / "すべて" を切り替えるトグルボタン UI を実装する
  - "未読" 選択時は `filter` パラメータを削除、"すべて" 選択時は `filter=all` を設定する
  - フィルタ変更時は `entryId` パラメータを削除する
  - _Requirements: 4.3_
  - _Boundary: ReadFilter_

- [ ] 5.2 (P) SortToggle — ソート順トグル
  - "新しい順" / "古い順" を切り替えるトグルボタン UI を実装する
  - "新しい順" 選択時は `sortOrder` を削除、"古い順" 選択時は `sortOrder=asc` を設定する
  - フィルタ変更時は `entryId` パラメータを削除する
  - _Requirements: 4.4_
  - _Boundary: SortToggle_

---

- [ ] 6. EntryCard コンポーネント
- [ ] 6.1 カード表示と視覚的既読区別
  - `memo()` でラップして不要な再レンダリングを防止する
  - `isRead` が true の場合、カードを `opacity-60` でレンダリングし、未読アクセントストライプを非表示にする
  - サムネイル画像がない場合はプレースホルダー SVG を表示し、画像ロードエラーは `imgError` state で管理する
  - 発行日は `useEffect` 内でクライアントサイドフォーマット（分前/時間前/日前/日付）を適用する
  - _Requirements: 1.1, 1.3_
  - _Boundary: EntryCard_

- [ ] 6.2 既読トグルボタン
  - カード右上に `PUT /api/entries/:id/meta { isRead: !current }` を呼ぶトグルボタンを配置する
  - 成功後に `entry:read` または `entry:unread` カスタムイベントを dispatch する
  - 処理中はスピナーを表示し、ボタンを disabled にする（二重送信防止）
  - バッチ選択モード時は既読トグルボタンを非表示にしてカードクリックで選択トグルのみ機能させる
  - _Requirements: 7.2, 7.3, 11.1_
  - _Boundary: EntryCard_

---

- [ ] 7. EntryCardGrid — 無限スクロールとモーダル制御
- [ ] 7.1 初期表示と IntersectionObserver 設定
  - `entries`, `page`, `hasMore` state を initialEntries/initialPagination で初期化する
  - sentinelRef（スクロール末尾の空 div）に IntersectionObserver を設定し、`rootMargin: '200px'` で viewport 手前からトリガーする
  - `loadMore` は `hasMore` が false または isLoading 中は早期リターンする
  - ローディング中はカードグリッド下部にスピナーを表示する
  - _Requirements: 2.1, 2.2, 2.4, 2.5_
  - _Boundary: EntryCardGrid_

- [ ] 7.2 loadMore — 次ページ取得と重複除去
  - `/api/entries` に `page+1` とすべてのフィルタパラメータを付けて fetch する
  - 既存 entries の ID セットで新エントリーをフィルタし、重複を除去してから `setEntries` で追記する
  - fetch 完了後に `page` と `hasMore` を更新する
  - _Requirements: 2.1, 2.3_
  - _Boundary: EntryCardGrid_

- [ ] 7.3 URL ベースのモーダル管理（history.pushState）
  - マウント時に `URLSearchParams(window.location.search).get('entryId')` で初期 entryId を読み取る
  - `openEntry`: `history.pushState` で `?entryId=xxx` を URL に追加し `selectedEntryId` を更新する（Next.js router.push 不使用）
  - `closeEntry`: `history.pushState` で `entryId` パラメータを削除し `selectedEntryId` を null にする
  - `popstate` イベントリスナーで `selectedEntryId` を URL から再同期し、ブラウザ戻る/進む操作に対応する
  - _Requirements: 5.1, 6.4_
  - _Boundary: EntryCardGrid_

- [ ] 7.4 navEntries スナップショットとモーダルナビゲーション
  - モーダル開封時（selectedEntryId が null → non-null）に entries を navEntries にコピーし、`hasNavSnapshotRef` フラグを立てる
  - モーダルクローズ時に navEntries をクリアし、prefetchCache・pendingNavigateNext もリセットする
  - navEntries の isRead/isReadLater 更新を意図的にスキップし、ナビゲーション中の安定性を維持する
  - `goToPrev` / `goToNext`: navIndex を基準に前後エントリーの ID で `openEntry` を呼ぶ
  - _Requirements: 6.1, 6.2, 6.3, 5.7, 5.8_
  - _Boundary: EntryCardGrid_

- [ ] 7.5 loadNavMore — モーダルナビ用次ページ先読み
  - navEntries の最後尾エントリーを表示中かつ `navHasMore` が true の場合、`loadNavMore` を自動トリガーする
  - `loadNavMore` は navPage/navHasMore/navEntries を独立して更新し、`page`/`hasMore` には触れない（loadMore との分離）
  - `pendingNavigateNext` フラグ: ユーザーが次ナビを要求し navHasMore だった場合に立て、loadNavMore 完了後に自動で次エントリーへ遷移する
  - navEntries に追加したエントリーは entries にも重複除去して追記する（カードグリッドとの同期）
  - _Requirements: 6.5_
  - _Boundary: EntryCardGrid_

- [ ] 7.6 カスタムイベントリスナー（既読・あとで読む・タグ）
  - `entry:read` イベントで entries の当該エントリーの `meta.isRead` を true に更新する
  - `entry:unread` イベントで entries の当該エントリーの `meta.isRead` を false に更新する
  - `entry:updated` イベントで entries の `meta.isReadLater` を更新し、あとで読むフィルタ中は対象エントリーをリストから除去する
  - `entry:tags-updated` イベントで `prefetchCacheRef` から該当エントリーのキャッシュを削除する
  - _Requirements: 7.2, 7.3, 9.3_
  - _Boundary: EntryCardGrid_

---

- [ ] 8. プリフェッチキャッシュ実装
- [ ] 8.1 隣接エントリーのプリフェッチ
  - `selectedEntryId` または `navIndex` が変化した際に、navEntries の前後エントリー（最大2件）の ID を収集する
  - `prefetchCacheRef`（Map）と `prefetchingRef`（Set）で重複フェッチを防ぐ
  - `/api/entries/:id` を fetch し、成功時に `prefetchCacheRef.set(id, data)` でキャッシュする
  - _Requirements: 9.1_
  - _Boundary: EntryCardGrid_

- [ ] 8.2 プリフェッチキャッシュの利用と無効化
  - ArticleModal に `prefetchedEntry={prefetchCacheRef.current.get(selectedEntryId)}` を prop として渡す
  - `entry:tags-updated` イベント受信時に `prefetchCacheRef.delete(entryId)` でエントリーを無効化する
  - モーダルクローズ時に `prefetchCacheRef.current.clear()` で全キャッシュを削除する
  - _Requirements: 9.2, 9.3, 9.4_
  - _Boundary: EntryCardGrid_

---

- [ ] 9. ArticleModal — 全文表示・ナビゲーション
- [ ] 9.1 エントリー詳細フェッチとスケルトン表示
  - `entryId` 変更時に `prefetchedEntry` prop を優先して使用し、null の場合は `/api/entries/:id` を fetch する
  - エントリー取得中はスケルトン UI（タイトル・メタ・画像・本文のアニメーションプレースホルダー）を表示する
  - エントリー切り替え時（entryId 変更）にスクロール位置を先頭にリセットし、readingProgress を 0 に戻す
  - `next/dynamic({ ssr: false })` で動的インポートされ、SSR に含まれないこと
  - _Requirements: 5.2, 5.3, 5.4_
  - _Boundary: ArticleModal_

- [ ] 9.2 記事コンテンツ表示とプログレスバー
  - 記事タイトルを元記事URLへのリンクとして表示する（`<a href={link} target="_blank" rel="noopener noreferrer">`）
  - `content` が存在する場合は `content`、なければ `description` を `whitespace-pre-wrap` でプレーンテキスト表示する
  - スクロールイベントで `(scrollTop / (scrollHeight - clientHeight)) * 100` を計算しプログレスバーに反映する
  - iOS PWA standalone 検出: `window.navigator.standalone` が true の場合は `<a>` クリックを preventDefault して `window.open()` にフォールバックする
  - _Requirements: 5.4, 5.5, 5.6, 5.9_
  - _Boundary: ArticleModal_

- [ ] 9.3 自動既読化
  - `entry` がロードされ `entry.meta?.isRead` が false の場合、`PUT /api/entries/:id/meta { isRead: true }` を実行する
  - 成功後に `isRead` state を true に更新し、`entry:read` カスタムイベントを dispatch する
  - 既に既読の場合は API 呼び出しをスキップする
  - _Requirements: 7.1_
  - _Boundary: ArticleModal_

- [ ] 9.4 モーダルツールバー（既読・あとで読む・外部リンク・閉じる）
  - 既読/未読トグルボタン: `PUT /api/entries/:id/meta { isRead: !current }` を実行し、成功後に entry:read/entry:unread を dispatch する
  - あとで読むトグルボタン: `PUT /api/entries/:id/meta { isReadLater: !current }` を実行し、成功後に `entry:updated` を dispatch する
  - 外部リンクボタン: `<a href={link} target="_blank" rel="noopener noreferrer">` で元記事を開く（iOS PWA は window.open フォールバック）
  - 処理中は各ボタンをスピナー表示で disabled にする
  - _Requirements: 5.4, 7.1_
  - _Boundary: ArticleModal_

- [ ] 9.5 スワイプジェスチャー
  - `onPointerDown` / `onPointerMove` / `onPointerUp` / `onPointerCancel` でスワイプを検出する
  - button/a/input/textarea 起因のポインターはスワイプを無効化する
  - 水平移動 vs 垂直移動の判定: `|dx| >= |dy|` かつ `|dx| >= 8px` で水平スワイプとみなす
  - `SWIPE_THRESHOLD = 60px` を超えた場合、右スワイプで `onPrev`、左スワイプで `onNext` を呼ぶ
  - ポインターリリース時に `setSwipeX(0)` + 200ms の `swipeTransition` で元の位置に戻す
  - _Requirements: 6.6, 6.7_
  - _Boundary: ArticleModal_

- [ ] 9.6 キーボードショートカット
  - `useHotkeyConfig()` で設定を読み取り、6種類のアクションを `keydown` イベントで処理する
  - input/textarea フォーカス中はショートカットを無効化する
  - デフォルト: Escape=閉じる、ArrowLeft=前、ArrowRight=次、F=あとで読む、M=既読トグル、O=元記事を開く
  - hasPrev/hasNext が false の場合は対応するナビキーを無視する
  - _Requirements: 6.8_
  - _Boundary: ArticleModal_

---

- [ ] 10. 一括タグ付けモード
- [ ] 10.1 バッチ選択モードの切り替えと選択管理
  - "一括タグ付け" ボタンで `isSelectionMode` を true にし、`selectedIds` を空の Set で初期化する
  - `isSelectionMode` が true の場合、EntryCard クリックで `toggleSelectEntry`（選択/解除）を呼び、モーダルを開かない
  - `selectAll`: entries の全 ID を `selectedIds` に追加する
  - `clearSelection`: `selectedIds` を空の Set にリセットする
  - 終了ボタンで `isSelectionMode` を false にし `selectedIds` をクリアする
  - _Requirements: 11.1_
  - _Boundary: EntryCardGrid_

- [ ] 10.2 BulkTagBar との統合とバッチタグ適用
  - `isSelectionMode` が true の場合、BulkTagBar を表示し ArticleModal を非表示にする
  - `applyBatchTag(tagName)`: `POST /api/tags/batch { name: tagName, entryIds: [...selectedIds] }` を送信する
  - 成功後に `entry:tags-updated` カスタムイベントを dispatch し prefetch キャッシュを無効化する
  - _Requirements: 11.2, 11.3_
  - _Boundary: EntryCardGrid_

---

- [ ] 11. テスト
- [ ] 11.1 EntryService ユニットテスト
  - `findManyEntries`: feedId 指定/未指定・カーソルパラメータ・scoreThreshold の境界値テスト
  - `findManyEntriesDedup`: `distinct: ['link']` で重複が1件に集約されること
  - `getEntryById`: 存在する場合は EntryDetail を返し、存在しない場合は null を返すこと
  - _Requirements: 8.1, 8.2, 10.1, 10.3, 10.4_
  - _Boundary: EntryService_

- [ ] 11.2 Entry API Routes 統合テスト
  - `GET /api/entries`: page=0 で 400 VALIDATION_ERROR が返ること
  - `GET /api/entries/:id`: 存在するIDで200、存在しないIDで404 ENTRY_NOT_FOUND が返ること
  - ページネーションレスポンスの `pagination` オブジェクトに必須フィールドが含まれること
  - _Requirements: 10.2, 10.4, 10.5_
  - _Boundary: Entry API Routes_

- [ ] 11.3 EntryCardGrid コンポーネントテスト
  - IntersectionObserver モックで sentinel の交差時に loadMore が呼ばれること
  - `entry:read` イベントで対応カードが視覚的に読了状態に更新されること
  - navEntries スナップショット: モーダル開封後に read 状態変化が navEntries に反映されないこと
  - _Requirements: 2.2, 6.1, 7.2_
  - _Boundary: EntryCardGrid_

- [ ] * 11.4 ArticleModal スワイプ・キーボードテスト（オプション）
  - PointerEvent シミュレーションで 60px 超の水平スワイプが onPrev/onNext を呼ぶこと
  - ArrowLeft/ArrowRight キーが hasPrev/hasNext を考慮して onPrev/onNext を呼ぶこと
  - Escape キーで onClose が呼ばれること
  - _Requirements: 6.6, 6.7, 6.8_
  - _Boundary: ArticleModal_
