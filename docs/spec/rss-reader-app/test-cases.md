# RSS Reader アプリ テストケース一覧（逆生成）

## 概要

**分析日時**: 2026-03-16
**総テストケース数（既存）**: ~120件（26ファイル）
**追加推奨テストケース数**: ~60件
**優先対応ファイル数**: 10 ファイル

---

## テストケース一覧

### API ルートテスト

| ID | テスト名 | ファイル | 実装状況 | 優先度 |
|----|---------|---------|---------|--------|
| TC-A01 | GET /api/feeds - 200フィード一覧返却 | `feeds/route.test.ts` | ✅ 実装済 | — |
| TC-A02 | POST /api/feeds - 201フィード作成 | `feeds/route.test.ts` | ✅ 実装済 | — |
| TC-A03 | POST /api/feeds - 400 URL欠損 | `feeds/route.test.ts` | ✅ 実装済 | — |
| TC-A04 | POST /api/feeds - 409 URL重複 | `feeds/route.test.ts` | ✅ 実装済 | — |
| TC-A05 | POST /api/feeds - 422 フェッチ失敗 | `feeds/route.test.ts` | ✅ 実装済 | — |
| TC-A06 | GET /api/feeds/[id] - 200詳細取得 | `feeds/[id]/route.test.ts` | ✅ 実装済 | — |
| TC-A07 | PATCH /api/feeds/[id] - 200更新 | `feeds/[id]/route.test.ts` | ✅ 実装済 | — |
| TC-A08 | DELETE /api/feeds/[id] - 200削除 | `feeds/[id]/route.test.ts` | ✅ 実装済 | — |
| TC-A09 | GET /api/feeds/[id] - 404未存在 | `feeds/[id]/route.test.ts` | ✅ 実装済 | — |
| TC-A10 | POST /api/feeds/refresh - 200成功 | `feeds/refresh/route.test.ts` | ❌ 未実装 | 高 |
| TC-A11 | POST /api/feeds/refresh - 500エラー | `feeds/refresh/route.test.ts` | ❌ 未実装 | 高 |
| TC-A12 | GET /api/entries - 200エントリ一覧 | `entries/route.test.ts` | ✅ 実装済 | — |
| TC-A13 | GET /api/entries - feedId/tagIdフィルター | `entries/route.test.ts` | ✅ 実装済 | — |
| TC-A14 | GET /api/entries - page/limitパラメータ | `entries/route.test.ts` | ✅ 実装済 | — |
| TC-A15 | GET /api/entries - 400無効ページ | `entries/route.test.ts` | ✅ 実装済 | — |
| TC-A16 | GET /api/entries - 500DBエラー | `entries/route.test.ts` | ✅ 実装済 | — |
| TC-A17 | GET /api/entries/[id] - 200詳細取得 | `entries/[id]/route.test.ts` | ✅ 実装済 | — |
| TC-A18 | GET /api/entries/[id] - 404未存在 | `entries/[id]/route.test.ts` | ✅ 実装済 | — |
| TC-A19 | PATCH /api/entries/[id]/meta - 既読更新 | `entries/[id]/meta/route.test.ts` | ✅ 実装済 | — |
| TC-A20 | PATCH /api/entries/[id]/meta - 後で読む更新 | `entries/[id]/meta/route.test.ts` | ✅ 実装済 | — |
| TC-A21 | GET /api/entries/read-later-unread-count - 200カウント | `entries/read-later-unread-count/route.test.ts` | ❌ 未実装 | 中 |
| TC-A22 | GET /api/entries/read-later-unread-count - 0件 | `entries/read-later-unread-count/route.test.ts` | ❌ 未実装 | 中 |
| TC-A23 | GET /api/entries/read-later-unread-count - 500エラー | `entries/read-later-unread-count/route.test.ts` | ❌ 未実装 | 中 |
| TC-A24 | GET /api/tags - 200タグ一覧 | `tags/route.test.ts` | ✅ 実装済 | — |
| TC-A25 | POST /api/tags - 201タグ作成 | `tags/route.test.ts` | ✅ 実装済 | — |
| TC-A26 | PATCH /api/tags/[tagId] - 200タグリネーム | `tags/[tagId]/route.test.ts` | ❌ 未実装 | 高 |
| TC-A27 | PATCH /api/tags/[tagId] - 400 name欠損 | `tags/[tagId]/route.test.ts` | ❌ 未実装 | 高 |
| TC-A28 | PATCH /api/tags/[tagId] - 400 name空文字 | `tags/[tagId]/route.test.ts` | ❌ 未実装 | 高 |
| TC-A29 | DELETE /api/tags/[tagId] - 200削除 | `tags/[tagId]/route.test.ts` | ❌ 未実装 | 高 |
| TC-A30 | POST /api/tags/[tagId]/entries/[entryId] - 割当 | `tags/[tagId]/entries/[entryId]/route.test.ts` | ✅ 実装済 | — |
| TC-A31 | DELETE /api/tags/[tagId]/entries/[entryId] - 解除 | `tags/[tagId]/entries/[entryId]/route.test.ts` | ✅ 実装済 | — |
| TC-A32 | GET /api/digests - 200一覧+ページネーション | `digests/route.test.ts` | ❌ 未実装 | 高 |
| TC-A33 | GET /api/digests - page/limitパラメータ | `digests/route.test.ts` | ❌ 未実装 | 高 |
| TC-A34 | POST /api/digests - 201作成 | `digests/route.test.ts` | ❌ 未実装 | 高 |
| TC-A35 | POST /api/digests - 400 content欠損 | `digests/route.test.ts` | ❌ 未実装 | 高 |
| TC-A36 | POST /api/digests - 201 titleなしで作成 | `digests/route.test.ts` | ❌ 未実装 | 高 |
| TC-A37 | GET /api/digests/[id] - 200詳細 | `digests/[id]/route.test.ts` | ❌ 未実装 | 高 |
| TC-A38 | GET /api/digests/[id] - 404未存在 | `digests/[id]/route.test.ts` | ❌ 未実装 | 高 |
| TC-A39 | PATCH /api/digests/[id] - 200更新 | `digests/[id]/route.test.ts` | ❌ 未実装 | 高 |
| TC-A40 | PATCH /api/digests/[id] - 400 content空文字 | `digests/[id]/route.test.ts` | ❌ 未実装 | 高 |
| TC-A41 | DELETE /api/digests/[id] - 200削除 | `digests/[id]/route.test.ts` | ❌ 未実装 | 高 |

### サービス層テスト

| ID | テスト名 | ファイル | 実装状況 | 優先度 |
|----|---------|---------|---------|--------|
| TC-S01 | createFeed - フィード作成成功 | `feed-service.test.ts` | ✅ 実装済 | — |
| TC-S02 | createFeed - URL重複でConflictError | `feed-service.test.ts` | ✅ 実装済 | — |
| TC-S03 | getAllFeeds - ソート順（lastPublishedAt降順） | `feed-service.test.ts` | ✅ 実装済 | — |
| TC-S04 | findManyEntries - デフォルト重複排除パス | `entry-service-query.test.ts` | ✅ 実装済 | — |
| TC-S05 | findManyEntries - feedIdフィルター | `entry-service-query.test.ts` | ✅ 実装済 | — |
| TC-S06 | findManyEntries - tagIdフィルター | `entry-service-query.test.ts` | ✅ 実装済 | — |
| TC-S07 | findManyEntries - hasNext/hasPrev | `entry-service-query.test.ts` | ✅ 実装済 | — |
| TC-S08 | updateEntryMeta - isRead連動（同一link） | `entry-service-query.test.ts` | ✅ 実装済 | — |
| TC-S09 | updateEntryMeta - isReadLaterのみ非連動 | `entry-service-query.test.ts` | ✅ 実装済 | — |
| TC-S10 | saveEntries - upsertで新規エントリ保存 | `entry-service-save.test.ts` | ✅ 実装済 | — |
| TC-S11 | saveEntries - 既読連動（同一link既存エントリ） | `entry-service-save.test.ts` | ✅ 実装済 | — |
| TC-S12 | enforceEntryLimit - 500件以下で削除しない | `entry-service-save.test.ts` | ❌ 未実装 | 中 |
| TC-S13 | enforceEntryLimit - 500件超過で古いエントリ削除 | `entry-service-save.test.ts` | ❌ 未実装 | 中 |
| TC-S14 | fetchAllFeedsEntries - エラー発生時に他フィード継続 | `entry-service-save.test.ts` | ❌ 未実装 | 中 |
| TC-S15 | createDigest - title+contentで作成 | `digest-service.test.ts` | ❌ 未実装 | 高 |
| TC-S16 | createDigest - titleなしでnull保存 | `digest-service.test.ts` | ❌ 未実装 | 高 |
| TC-S17 | getDigests - ページネーション（skip計算） | `digest-service.test.ts` | ❌ 未実装 | 高 |
| TC-S18 | getDigestById - 存在するIDで返却 | `digest-service.test.ts` | ❌ 未実装 | 高 |
| TC-S19 | getDigestById - 未存在でAppError | `digest-service.test.ts` | ❌ 未実装 | 高 |
| TC-S20 | updateDigest - title/content更新 | `digest-service.test.ts` | ❌ 未実装 | 高 |
| TC-S21 | updateDigest - titleをnullにクリア | `digest-service.test.ts` | ❌ 未実装 | 高 |
| TC-S22 | updateDigest - 未存在IDでAppError | `digest-service.test.ts` | ❌ 未実装 | 高 |
| TC-S23 | deleteDigest - 正常削除 | `digest-service.test.ts` | ❌ 未実装 | 高 |

### セキュリティテスト（SSRF）

| ID | テスト名 | ファイル | 実装状況 | 優先度 |
|----|---------|---------|---------|--------|
| TC-SEC01 | isPrivateIP - 127.x.x.x はプライベート | `ssrf-guard.test.ts` | ✅ 実装済 | — |
| TC-SEC02 | isPrivateIP - 10.x.x.x はプライベート | `ssrf-guard.test.ts` | ✅ 実装済 | — |
| TC-SEC03 | isPrivateIP - 192.168.x.x はプライベート | `ssrf-guard.test.ts` | ✅ 実装済 | — |
| TC-SEC04 | isPrivateIP - 8.8.8.8 はパブリック | `ssrf-guard.test.ts` | ✅ 実装済 | — |
| TC-SEC05 | validateUrl - http/https のみ許可 | `ssrf-guard.test.ts` | ✅ 実装済 | — |
| TC-SEC06 | validateUrl - 2048文字超でSSRFError | `ssrf-guard.test.ts` | ❌ 未実装 | 中 |
| TC-SEC07 | validateUrl - file://プロトコル拒否 | `ssrf-guard.test.ts` | ❌ 未実装 | 中 |
| TC-SEC08 | validateUrl - ftp://プロトコル拒否 | `ssrf-guard.test.ts` | ❌ 未実装 | 中 |
| TC-SEC09 | validateUrl - IPv6 ループバック(::1)拒否 | `ssrf-guard.test.ts` | ❌ 未実装 | 中 |

### コンポーネントテスト

| ID | テスト名 | ファイル | 実装状況 | 優先度 |
|----|---------|---------|---------|--------|
| TC-C01 | FeedForm - フォーム送信 | `feed-form.test.tsx` | ✅ 実装済 | — |
| TC-C02 | FeedList - フィード一覧表示 | `feed-list.test.tsx` | ✅ 実装済 | — |
| TC-C03 | EntryList - エントリ一覧表示 | `entry-list.test.tsx` | ✅ 実装済 | — |
| TC-C04 | EntryModal - モーダル開閉・コンテンツ表示 | `entry-modal.test.tsx` | ✅ 実装済 | — |
| TC-C05 | EntryFilter - フィルター選択ロジック | `entry-filter.test.tsx` | ✅ 実装済 | — |
| TC-C06 | EditFeedForm - 編集フォーム送信 | `edit-feed-form.test.tsx` | ✅ 実装済 | — |
| TC-C07 | DeleteConfirmDialog - 削除確認フロー | `delete-confirm-dialog.test.tsx` | ✅ 実装済 | — |
| TC-C08 | TagInput - タグ入力・選択 | `tag-input.test.tsx` | ✅ 実装済 | — |
| TC-C09 | EntryCard - カード表示（タイトル・日付・フィード名） | `entry-card.test.tsx` | ❌ 未実装 | 中 |
| TC-C10 | EntryCard - クリックでモーダル開く | `entry-card.test.tsx` | ❌ 未実装 | 中 |
| TC-C11 | EntryCard - 既読状態のスタイル変化 | `entry-card.test.tsx` | ❌ 未実装 | 中 |
| TC-C12 | EntryCard - 後で読むボタン切替 | `entry-card.test.tsx` | ❌ 未実装 | 中 |
| TC-C13 | EntryCardGrid - グリッド表示 | `entry-card-grid.test.tsx` | ❌ 未実装 | 中 |
| TC-C14 | EntryCardGrid - 空状態の表示 | `entry-card-grid.test.tsx` | ❌ 未実装 | 中 |
| TC-C15 | EntryCardGrid - ページネーション操作 | `entry-card-grid.test.tsx` | ❌ 未実装 | 中 |
| TC-C16 | Sidebar - フィードリスト表示 | `sidebar.test.tsx` | ❌ 未実装 | 低 |
| TC-C17 | Sidebar - 開閉トグル | `sidebar.test.tsx` | ❌ 未実装 | 低 |
| TC-C18 | EntryFilterBar - フィード選択 | `entry-filter-bar.test.tsx` | ❌ 未実装 | 低 |
| TC-C19 | EntryFilterBar - 検索入力 | `entry-filter-bar.test.tsx` | ❌ 未実装 | 低 |
| TC-C20 | ReadFilter - 全件/未読切替 | `read-filter.test.tsx` | ❌ 未実装 | 低 |
| TC-C21 | DigestForm - ダイジェスト作成送信 | `digest-form.test.tsx` | ❌ 未実装 | 低 |
| TC-C22 | DigestForm - バリデーション（content必須） | `digest-form.test.tsx` | ❌ 未実装 | 低 |
| TC-C23 | DeleteDigestButton - 削除確認フロー | `delete-digest-button.test.tsx` | ❌ 未実装 | 低 |
| TC-C24 | EmptyPanel - 空状態メッセージ表示 | `empty-panel.test.tsx` | ❌ 未実装 | 低 |

### E2Eテスト（新規導入）

| ID | テスト名 | ファイル | 実装状況 | 優先度 |
|----|---------|---------|---------|--------|
| TC-E01 | フィード追加からエントリ表示まで | `e2e/feed-management.spec.ts` | ❌ 未実装 | 低 |
| TC-E02 | 重複フィード登録エラー表示 | `e2e/feed-management.spec.ts` | ❌ 未実装 | 低 |
| TC-E03 | エントリ既読マーク＋未読フィルター | `e2e/entry-reading.spec.ts` | ❌ 未実装 | 低 |
| TC-E04 | 後で読む追加＋後で読むページ確認 | `e2e/entry-reading.spec.ts` | ❌ 未実装 | 低 |
| TC-E05 | タグ作成・エントリへの割当・フィルター | `e2e/tag-management.spec.ts` | ❌ 未実装 | 低 |
| TC-E06 | ダイジェスト作成・編集・削除フロー | `e2e/digest-management.spec.ts` | ❌ 未実装 | 低 |

---

## 実装工数見積もり

| カテゴリ | 未実装件数 | 推定工数 |
|---------|----------|---------|
| APIルート（高優先） | 16件 | 4時間 |
| サービス層（高優先） | 9件 | 3時間 |
| サービス層（中優先） | 3件 | 1時間 |
| セキュリティ追加 | 4件 | 1時間 |
| コンポーネント（中優先） | 7件 | 5時間 |
| コンポーネント（低優先） | 9件 | 4時間 |
| E2Eテスト導入 | 6件 | 8時間 |
| **合計** | **54件** | **26時間** |

---

## 実装チェックリスト

### 即座に着手（高優先度 / ~7時間）

- [ ] `src/app/api/digests/route.test.ts` — GET, POST テスト実装
- [ ] `src/app/api/digests/[id]/route.test.ts` — GET, PATCH, DELETE テスト実装
- [ ] `src/lib/digest-service.test.ts` — 全CRUD テスト実装
- [ ] `src/app/api/feeds/refresh/route.test.ts` — POST 正常系・エラー系
- [ ] `src/app/api/tags/[tagId]/route.test.ts` — PATCH (rename), DELETE テスト実装

### 次スプリント（中優先度 / ~10時間）

- [ ] `src/app/api/entries/read-later-unread-count/route.test.ts`
- [ ] `src/components/entry-card.test.tsx` — 表示・操作・状態テスト
- [ ] `src/components/entry-card-grid.test.tsx` — グリッド・ページネーション
- [ ] `src/lib/__tests__/entry-service-save.test.ts` — enforceEntryLimit 補強
- [ ] `src/lib/ssrf-guard.test.ts` — URL長制限・プロトコル追加

### 継続改善（低優先度 / ~12時間）

- [ ] `src/components/sidebar.test.tsx`
- [ ] `src/components/entry-filter-bar.test.tsx`
- [ ] `src/components/read-filter.test.tsx`
- [ ] `src/components/digest-form.test.tsx`
- [ ] `src/components/delete-digest-button.test.tsx`
- [ ] `src/components/empty-panel.test.tsx`
- [ ] E2Eテスト環境構築（Playwright導入）
- [ ] E2E シナリオ実装（フィード・エントリ・タグ・ダイジェスト管理）
