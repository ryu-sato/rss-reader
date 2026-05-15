# Implementation Plan

- [ ] 1. Foundation: データモデルと型定義の確立
- [ ] 1.1 Digest Prismaモデルとマイグレーションの確認
  - `prisma/schema.prisma` に `Digest` モデルが定義されていること（id, title?, content, createdAt, createdAt降順インデックス）
  - `@@map("digests")` でテーブル名が設定されていること
  - マイグレーションが適用済みであること（`npx prisma migrate status` で確認）
  - _Requirements: 2.1, 3.1, 4.1, 5.2_
  - _Boundary: DigestService_

- [ ] 1.2 Digest TypeScript型定義の確認
  - `src/types/digest.ts` に `Digest`（id, title, content, createdAt）と `DigestListItem`（id, title, createdAt）が定義されていること
  - `GetDigestsResponse`, `GetDigestResponse`, `CreateDigestResponse` 型が定義されていること
  - `src/types/feed.ts` の `ErrorCode` に `DIGEST_NOT_FOUND` が含まれていること
  - _Requirements: 6.1, 6.2, 6.3_
  - _Boundary: DigestService_

- [ ] 2. Core: DigestServiceの実装
- [ ] 2.1 ダイジェストCRUD操作の実装
  - `src/lib/digest-service.ts` に `createDigest`, `getDigests`, `getDigestById`, `updateDigest`, `deleteDigest` が実装されていること
  - `getDigests` は `page`（デフォルト1）と `limit`（デフォルト20）を受け取り `{ data, total }` を返すこと
  - `getDigestById` は存在しないIDで `AppError('DIGEST_NOT_FOUND', 'Digest not found', 404)` をスローすること
  - `updateDigest` / `deleteDigest` は操作前に `getDigestById` で存在確認を行うこと
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.2, 6.1–6.5_
  - _Boundary: DigestService_

- [ ] 2.2 タグベースキャッシュの実装
  - `getCachedDigestById(id)` が `unstable_cache` でラップされ、タグ `[digest-${id}]` が設定されていること
  - 詳細ページが `getCachedDigestById` を使用してキャッシュされたデータを取得していること
  - _Requirements: 3.6, 4.5, 5.4_
  - _Boundary: DigestService_

- [ ] 3. Core: REST APIルートの実装
- [ ] 3.1 (P) コレクションAPIの実装（GET/POST /api/digests）
  - `src/app/api/digests/route.ts` に `GET`（一覧取得）と `POST`（作成）ハンドラーが実装されていること
  - GET: `page`・`limit` クエリパラメータを受け取り、`limit` を1〜100にクランプすること
  - POST: `content` が文字列かつ非空であることをバリデーションし、400エラーを返すこと
  - POST成功時: 201ステータスと `{ success: true, data: Digest }` を返すこと
  - `AppError` は対応するHTTPステータスに変換し、予期しないエラーは500を返すこと
  - _Requirements: 6.1, 6.2, 6.6_
  - _Boundary: API Routes_

- [ ] 3.2 (P) 個別リソースAPIの実装（GET/PATCH/DELETE /api/digests/:id）
  - `src/app/api/digests/[id]/route.ts` に `GET`・`PATCH`・`DELETE` ハンドラーが実装されていること
  - PATCH: `content` が存在する場合は非空文字列チェック、`title` が存在する場合は文字列またはnullチェックを行うこと
  - PATCH/DELETE成功後に `revalidateTag(`digest-${id}`, 'max')` でキャッシュを無効化すること
  - 存在しないIDへのアクセスは404レスポンスを返すこと
  - _Requirements: 6.3, 6.4, 6.5, 6.6, 6.7, 4.5, 5.4_
  - _Boundary: API Routes_

- [ ] 4. Core: ダイジェスト一覧ページの実装
- [ ] 4.1 DigestsPageコンポーネントの実装
  - `src/app/digests/page.tsx` が `force-dynamic` で動的レンダリングに設定されていること
  - `getDigests(1, 50)` を呼び出して最大50件を取得・表示すること
  - タイトルあり: タイトルを主表示、作成日時をサブ表示
  - タイトルなし: 作成日時を主表示（`ja-JP` ロケール形式）
  - 件数0件時: 空状態メッセージとBookOpenアイコンが表示されること
  - ヘッダーに総件数と `/digests/new` への新規作成リンクが表示されること
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - _Boundary: DigestsPage_

- [ ] 5. Core: ダイジェスト詳細ページの実装
- [ ] 5.1 DigestDetailPageコンポーネントの実装
  - `src/app/digests/[id]/page.tsx` が `getCachedDigestById(id)` でデータを取得すること
  - `AppError(404)` キャッチ時に `notFound()` を呼び出すこと
  - `ReactMarkdown` に `remarkGfm`・`rehypeRaw`・`rehypeSanitize` プラグインを適用すること
  - GFMテーブル・コードブロック・チェックリストがレンダリングされること
  - ヘッダーに一覧へ戻るリンク・編集リンク・DeleteDigestButtonが配置されていること
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  - _Boundary: DigestDetailPage_

- [ ] 6. Core: 作成・編集フォームの実装
- [ ] 6.1 (P) DigestFormコンポーネントの実装
  - `src/components/digest-form.tsx` が `mode: 'create' | 'edit'` で動作を切り替えること
  - `content` が空の場合にクライアントサイドでエラーメッセージを表示し送信を中止すること
  - 作成時: `POST /api/digests`、編集時: `PATCH /api/digests/:id` を呼び出すこと
  - 成功後に `/digests/${data.data.id}` へのリダイレクトと `router.refresh()` を実行すること
  - `title` が空文字の場合は `null` として送信すること
  - サーバーエラー時はAPIレスポンスのメッセージをエラー表示すること
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.3, 4.4_
  - _Boundary: DigestForm_

- [ ] 6.2 (P) NewDigestPage・EditDigestPageの実装
  - `src/app/digests/new/page.tsx` が `<DigestForm mode="create" />` をレンダリングすること
  - `src/app/digests/[id]/edit/page.tsx` が `getDigestById(id)` でデータを取得し、`<DigestForm mode="edit" digestId={id} defaultValues={{title, content}} />` に渡すこと
  - 編集ページで存在しないIDの場合は `notFound()` を呼び出すこと
  - 編集ページは `force-dynamic` で常に最新データを取得すること
  - _Requirements: 4.2, 4.4_
  - _Boundary: NewDigestPage, EditDigestPage_

- [ ] 7. Core: 削除機能の実装
- [ ] 7.1 DeleteDigestButtonコンポーネントの実装
  - `src/components/delete-digest-button.tsx` がクリック時に `window.confirm` ダイアログを表示すること
  - 確認後に `DELETE /api/digests/:id` を呼び出すこと
  - 成功時に `/digests` へのリダイレクトと `router.refresh()` を実行すること
  - 削除中は `isDeleting` 状態でボタンをdisabledにすること
  - _Requirements: 5.1, 5.2_
  - _Boundary: DeleteDigestButton_

- [ ] 8. Validation: テスト実装
- [ ] 8.1 DigestServiceのユニットテスト
  - `src/lib/digest-service.test.ts` に以下のテストケースが実装されること
  - `createDigest`: 正常作成でDigestオブジェクトが返ること
  - `getDigests`: ページネーション（page, limit）が正しく動作すること
  - `getDigestById`: 存在しないIDで `AppError(DIGEST_NOT_FOUND, 404)` がスローされること
  - `updateDigest`: 正常更新で更新後のDigestが返ること；存在しないIDで404エラー
  - `deleteDigest`: 正常削除でvoidが返ること；存在しないIDで404エラー
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.2, 6.7_
  - _Boundary: DigestService_

- [ ]* 8.2 APIルートの統合テスト
  - `POST /api/digests` で `content` 未指定時に400レスポンスが返ること
  - `PATCH /api/digests/:id` で存在しないIDに404レスポンスが返ること
  - `DELETE /api/digests/:id` 成功後に `revalidateTag` が呼ばれること
  - _Requirements: 6.1, 6.2, 6.4, 6.6, 6.7_
  - _Boundary: API Routes_
