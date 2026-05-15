# Implementation Plan

## タスク一覧

- [ ] 1. TagService の実装
- [ ] 1.1 タグの upsert・一覧・リネーム・削除サービス関数を実装する
  - `src/lib/tag-service.ts` に `upsertTagAndAssign`・`removeTagFromEntry`・`getAllTags`・`renameTag`・`deleteTag` を実装する
  - `upsertTagAndAssign` はタグ名を `toLowerCase().trim()` で正規化してから `prisma.tag.upsert` と `prisma.entryTag.upsert` を順に呼び出す
  - `getAllTags` は `react.cache` でラップし、名前昇順で全タグを返す
  - `renameTag` はタグ名正規化を適用してから `prisma.tag.update` を呼び出す
  - `deleteTag` は `prisma.tag.delete` を呼び出し、カスケード設定で EntryTag が自動削除されることを確認する
  - TypeScript strict モードに準拠し `any` 型を使用しないこと
  - 各関数が期待する入出力型で動作することをユニットテストで確認できる状態になること
  - _Requirements: 1.1, 1.2, 2.1, 3.1, 4.1, 5.1, 6.1, 6.5_
  - _Boundary: TagService_

---

- [ ] 2. タグ API ルートの実装
- [ ] 2.1 (P) GET・POST /api/tags ルートを実装する
  - `src/app/api/tags/route.ts` に `GET` と `POST` ハンドラーを実装する
  - `GET`: `getAllTags()` を呼び出し `{ success: true, data: Tag[] }` を返す
  - `POST`: リクエストボディから `name`・`entryId` を取得し、バリデーション（未指定なら 400）→ entryId 存在確認（なければ 404）→ `upsertTagAndAssign` → 201 レスポンス
  - エラー時は `console.error` でログ出力し 500 を返す
  - `POST /api/tags` が 201 で `{ success: true, data: Tag }` を返すことを統合テストで確認できる状態になること
  - _Requirements: 2.2, 2.3, 2.4, 3.1_
  - _Boundary: Tag API Routes_

- [ ] 2.2 (P) PATCH・DELETE /api/tags/:tagId ルートを実装する
  - `src/app/api/tags/[tagId]/route.ts` に `PATCH` と `DELETE` ハンドラーを実装する
  - `PATCH`: `name` が空またはホワイトスペースのみなら 400・そうでなければ `renameTag` → 200
  - `DELETE`: `deleteTag` を呼び出し → `{ success: true }` を返す（200）
  - `PATCH` で空名を渡したとき 400 VALIDATION_ERROR が返ることを統合テストで確認できる状態になること
  - _Requirements: 4.1, 4.3, 5.1_
  - _Boundary: Tag API Routes_

- [ ] 2.3 (P) DELETE /api/tags/:tagId/entries/:entryId ルートを実装する
  - `src/app/api/tags/[tagId]/entries/[entryId]/route.ts` に `DELETE` ハンドラーを実装する
  - `removeTagFromEntry(tagId, entryId)` を呼び出し、成功なら `{ success: true }` を返す
  - EntryTag が存在しない場合に 404 TAG_NOT_FOUND を返すこと
  - _Requirements: 6.5_
  - _Boundary: Tag API Routes_

- [ ] 2.4 (P) POST /api/tags/batch ルートを実装する
  - `src/app/api/tags/batch/route.ts` に `POST` ハンドラーを実装する
  - バリデーション: `name` が空または `entryIds` が空配列なら 400 VALIDATION_ERROR
  - タグ名を `toLowerCase().trim()` で正規化して `prisma.tag.upsert` を実行する
  - `Prisma.sql` + `Prisma.join` で `INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES ...` を構築し一括挿入する
  - `POST /api/tags/batch` が同じエントリーに重複してタグを付与しても 201 を返すことを統合テストで確認できる状態になること
  - _Requirements: 7.3, 7.5, 7.6_
  - _Boundary: Tag API Routes_

---

- [ ] 3. TagInput コンポーネントの実装
- [ ] 3.1 個別エントリーのタグ付与・除去・サジェスト UI を実装する
  - `src/components/tag-input.tsx` を `'use client'` で実装する
  - props: `entryId: string`・`initialTags: Tag[]`・`allTags: Tag[]`
  - タグチップ一覧（付与済みタグ + ×ボタン）・テキスト入力フィールド・サジェストドロップダウン・「Add」ボタンを描画する
  - `addTag(name)`: `POST /api/tags` を呼び出し、成功後に `setTags` 更新 + `entry:tags-updated` イベント発火 + 入力クリア
  - `removeTag(tagId)`: `DELETE /api/tags/:tagId/entries/:entryId` を呼び出し、成功後に `setTags` 更新 + `entry:tags-updated` イベント発火
  - サジェストは `allTags` から未割り当てタグを入力文字列で部分一致フィルタリングして表示する
  - API 呼び出し中は `isLoading: true` で入力を無効化し、完了後（成功・失敗問わず）に `isLoading: false` に戻す
  - タグ付与・除去後に `entry:tags-updated` が発火されることをテストで確認できる状態になること
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 9.1, 9.2_
  - _Boundary: TagInput_

---

- [ ] 4. BulkTagBar コンポーネントの実装
- [ ] 4.1 一括タグ付けツールバーを実装する
  - `src/components/bulk-tag-bar.tsx` を `'use client'` で実装する
  - props: `selectedCount`・`totalCount`・`allTags`・`onApplyTag`・`onSelectAll`・`onClearSelection`・`onExitSelectionMode`
  - 選択件数表示・タグ名入力フィールド・サジェストドロップダウン・「タグを付ける」ボタン・全選択・選択解除・終了ボタンを描画する
  - `handleApply`: `inputValue` が空または `selectedCount === 0` なら中断。それ以外は `onApplyTag(inputValue.trim())` を呼び出す
  - 適用成功後 `appliedCount` を設定し 2.5 秒後に `null` にリセットして「N件に適用済」フィードバックを表示する
  - サジェストは入力が空のとき全タグ最大 8 件を、非空のとき部分一致タグを表示する
  - `selectedCount === 0` のとき入力と「タグを付ける」ボタンを無効化すること
  - 適用後に完了フィードバックが 2.5 秒間表示されることをテストで確認できる状態になること
  - _Requirements: 7.1, 7.2, 7.4, 7.7, 9.2_
  - _Boundary: BulkTagBar_

---

- [ ] 5. EntryCardGrid への一括タグ付け統合
- [ ] 5.1 EntryCardGrid に選択モードと applyBatchTag ロジックを追加する
  - `src/components/entry-card-grid.tsx` に選択モード状態（`isSelectionMode`・`selectedIds`）と操作関数（`enterSelectionMode`・`exitSelectionMode`・`toggleSelectEntry`・`selectAll`・`clearSelection`）を追加する
  - `applyBatchTag(tagName)`: `POST /api/tags/batch` を呼び出し、成功後に `entry:tags-updated` を発火する
  - `isSelectionMode === true` のとき `BulkTagBar` を描画し、`onApplyTag={applyBatchTag}` を渡す
  - `entry:tags-updated` イベントをリッスンして `prefetchCacheRef` から該当エントリーを削除する
  - BulkTagBar が `isSelectionMode === true` のときのみ描画されることをテストで確認できる状態になること
  - _Requirements: 7.1, 7.3, 7.4, 6.6_
  - _Boundary: EntryCardGrid_
  - _Depends: 4.1, 2.4_

---

- [ ] 6. ArticleModal へのタグ UI 統合
- [ ] 6.1 ArticleModal に TagInput を組み込む
  - `src/components/article-modal.tsx` の記事コンテンツ末尾にタグセクションを追加する
  - `allTags` prop を `ArticleModal` に追加し、`TagInput` に `entryId={entry.id}`・`initialTags={entryTags}`・`allTags={allTags}` を渡す
  - `entryTags` は `entry.tags.map((t) => t.tag)` で導出する
  - エントリー読み込み中はタグセクションを表示しない（entry がロードされたときのみ表示）
  - ArticleModal 内でタグセクションが描画され TagInput が動作することをテストで確認できる状態になること
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  - _Boundary: ArticleModal_
  - _Depends: 3.1_

---

- [ ] 7. Sidebar タグセクションの実装
- [ ] 7.1 Sidebar にタグ一覧・リネーム・削除・フィルタリングリンクを追加する
  - `src/components/sidebar.tsx` の既存実装にタグセクションを追加する
  - マウント時に `GET /api/tags` を呼び出してタグリストを取得・表示する
  - タグ項目はそれぞれ `/?tagId={id}` へのリンクとして描画し、アクティブ状態（`currentTagId === tag.id`）をハイライト表示する
  - `handleRenameTag(tagId)`: `PATCH /api/tags/:tagId` を呼び出し成功後に `setTags` を更新する
  - `handleDeleteTag(tagId)`: `DELETE /api/tags/:tagId` を呼び出し成功後に `setTags` を更新し、フィルタリング中なら `router.push('/')` する
  - `tag:deleted` イベントをリッスンして `GET /api/tags` を再取得しタグリストを更新する
  - タグ名をリネームするとサイドバーのタグリストが即座に更新されることをテストで確認できる状態になること
  - _Requirements: 3.2, 3.3, 4.1, 4.2, 5.2, 5.3, 5.4, 8.1, 8.3_
  - _Boundary: Sidebar タグセクション_
  - _Depends: 2.2_

---

- [ ] 8. タグフィルタリングの統合確認
- [ ] 8.1 タグによるエントリーフィルタリングを確認する
  - `src/components/entry-filter-bar.tsx` で `tagId` URL パラメータが entry-viewing 側で正しく処理されることを確認する（このスペックは `tagId` を URL に設定する Sidebar リンクを所有し、実際のフィルタリングは entry-viewing に委譲する）
  - `/?tagId={id}` へ遷移したとき当該タグのエントリーのみが表示されること（`GET /api/entries?tagId=...` は entry-viewing 担当）を E2E 的に確認する
  - タグフィルタリング中にエントリーが 0 件のとき空状態メッセージが表示されることを確認する
  - サイドバーのタグリンクをクリックするとフィルタリングが適用されることをテストで確認できる状態になること
  - _Requirements: 8.1, 8.2, 8.3, 8.4_
  - _Boundary: Sidebar タグセクション_
  - _Depends: 7.1_

---

- [ ] 9. 統合テストと E2E 検証
- [ ] 9.1 TagService ユニットテストを実装する
  - `src/lib/tag-service.test.ts` を作成する
  - `upsertTagAndAssign`: 新規タグ作成・既存タグ再利用・EntryTag 重複スキップのケースをカバーする
  - `deleteTag`: Tag 削除後に関連 EntryTag が存在しないことを確認する
  - `renameTag`: 大文字入力が小文字で保存されることを確認する
  - `removeTagFromEntry`: 正常削除ケースをカバーする
  - すべてのユニットテストが `npm test` で PASS すること
  - _Requirements: 1.1, 1.2, 5.1, 9.3, 9.4_
  - _Boundary: TagService_

- [ ] 9.2 タグ API 統合テストを実装する
  - `src/app/api/tags/route.test.ts` および `src/app/api/tags/batch/route.test.ts` を作成する
  - `POST /api/tags`: 正常 201・name 未指定 400・entryId 不存在 404 のケースをカバーする
  - `POST /api/tags/batch`: 正常 201・空 entryIds 400・重複付与の冪等性確認のケースをカバーする
  - `PATCH /api/tags/:tagId`: 正常 200・空名 400 のケースをカバーする
  - `DELETE /api/tags/:tagId`: 正常 200・EntryTag カスケード削除確認のケースをカバーする
  - すべての統合テストが `npm test` で PASS すること
  - _Requirements: 2.3, 2.4, 4.3, 5.1, 7.5, 7.6, 9.1_
  - _Boundary: Tag API Routes_
  - _Depends: 9.1_
