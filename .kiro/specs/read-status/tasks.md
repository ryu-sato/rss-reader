# Implementation Plan

> **注意**: 本フィーチャーは実装済みです。各タスクは既存実装の検証・テスト追加・未実装部分の補完を目的とします。

- [ ] 1. EntryService.updateEntryMeta の実装確認とテスト
- [ ] 1.1 updateEntryMeta シブリング同期ロジックの単体テスト
  - `isRead: true` を更新した場合、同一 link を持つ全シブリングの EntryMeta が upsert されることを確認する
  - `isRead: false` を更新した場合も同様にシブリング全件に伝播することを確認する
  - `isReadLater` のみ更新した場合、対象エントリーのみが更新されシブリングは変化しないことを確認する
  - `isRead + isReadLater` を同時に更新した場合、シブリングには `isRead` のみが伝播し、`isReadLater` は対象エントリーのみに適用されることを確認する
  - テスト: `src/lib/entry-service.test.ts` で上記4ケースがすべてグリーンになること
  - _Requirements: 3.1, 3.3_
  - _Boundary: EntryService_

- [ ] 1.2 saveEntries シブリング既読連動ロジックの単体テスト
  - 既読シブリングが存在する場合、新規エントリーが `isRead: true` で作成されることを確認する
  - 既読シブリングが存在しない場合、EntryMeta が作成されないことを確認する
  - EntryMeta がすでに存在する場合（既存エントリーの更新）、連動ロジックがスキップされることを確認する
  - テスト: `src/lib/entry-service.test.ts` で上記3ケースがすべてグリーンになること
  - _Requirements: 3.2_
  - _Boundary: EntryService_

- [ ] 2. PUT /api/entries/[id]/meta エンドポイントの実装確認とテスト
- [ ] 2.1 PUT /api/entries/[id]/meta の統合テスト
  - `isRead: true` を送信した場合、200 レスポンスと更新済み EntryMeta が返ること
  - 存在しない entryId を指定した場合、404 ENTRY_NOT_FOUND が返ること
  - リクエストボディが空の場合、EntryMeta が変化なく 200 が返ること（isRead/isReadLater とも boolean でなければスキップ）
  - テスト: `src/app/api/entries/[id]/meta/route.test.ts` で上記3ケースがすべてグリーンになること
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - _Boundary: PUT /api/entries/[id]/meta_

- [ ] 3. GET /api/entries/read-later-unread-count エンドポイントの実装確認とテスト
- [ ] 3.1 read-later-unread-count エンドポイントの統合テスト
  - `isReadLater: true, isRead: false` のエントリーが3件ある状態で `count: 3` が返ること
  - `isReadLater: true` でも `isRead: true` の場合はカウントに含まれないことを確認する
  - テスト: `src/app/api/entries/read-later-unread-count/route.test.ts` で上記2ケースがすべてグリーンになること
  - _Requirements: 7.3_
  - _Boundary: GET /api/entries/read-later-unread-count_

- [ ] 4. ArticleModal の既読・あとで読む UI 実装確認とテスト
- [ ] 4.1 (P) 自動既読化の動作テスト
  - ArticleModal を既読でないエントリーで開いた場合、`PUT /api/entries/:id/meta { isRead: true }` が呼ばれること
  - ArticleModal を既に既読のエントリーで開いた場合、PUT リクエストが呼ばれないこと
  - PUT 成功後に `entry:read` カスタムイベントが window に dispatch されること
  - テスト: `src/components/article-modal.test.tsx` で上記3ケースがグリーンになること
  - _Requirements: 1.1, 5.1_
  - _Boundary: ArticleModal_

- [ ] 4.2 (P) toggleRead の楽観的更新とロールバックのテスト
  - 「既読にする」ボタンを押した場合、即座にUI状態が更新（楽観的）され、PUT 成功後に `entry:read` が dispatch されること
  - 「未読に戻す」ボタンを押した場合、PUT 成功後に `entry:unread` が dispatch されること
  - PUT が失敗した場合、isRead 状態が元の値に戻ること
  - `isUpdatingRead: true` の間はボタンが無効化されること
  - テスト: `src/components/article-modal.test.tsx` で上記4ケースがグリーンになること
  - _Requirements: 1.2, 1.3, 1.5, 5.1_
  - _Boundary: ArticleModal_

- [ ] 4.3 (P) toggleReadLater の楽観的更新とロールバックのテスト
  - 「あとで読む」ボタンを押した場合、PUT 成功後に `entry:updated` が dispatch されること
  - 「保存済み」ボタンを押した場合（isReadLater: false への切り替え）、PUT 成功後に `entry:updated` が dispatch されること
  - PUT が失敗した場合、isReadLater 状態が元の値に戻ること
  - `isUpdating: true` の間はボタンが無効化されること
  - テスト: `src/components/article-modal.test.tsx` で上記4ケースがグリーンになること
  - _Requirements: 2.1, 2.2, 2.4, 2.5, 5.2_
  - _Boundary: ArticleModal_

- [ ] 5. Sidebar の未読数・PWA バッジ実装確認とテスト
- [ ] 5.1 Sidebar イベントリスナーとカウント更新のテスト
  - `entry:read` イベントが window に dispatch された場合、`GET /api/feeds` が再取得されること
  - `entry:updated` イベントが window に dispatch された場合、`GET /api/entries/read-later-unread-count` が再取得されること
  - 初期ロード時に `readLaterUnreadCount` が取得されること
  - テスト: `src/components/sidebar.test.tsx` で上記3ケースがグリーンになること
  - _Requirements: 5.3, 5.4, 7.1, 7.2_
  - _Boundary: Sidebar_

- [ ] 5.2 PWA バッジ通知の動作確認
  - `totalUnread > 0` の場合、`navigator.setAppBadge(totalUnread)` が呼ばれること
  - `totalUnread === 0` の場合、`navigator.clearAppBadge()` が呼ばれること
  - `setAppBadge` が存在しない環境（`'setAppBadge' in navigator` が false）では呼び出しがスキップされること
  - テスト: `src/components/sidebar.test.tsx` で上記3ケースがグリーンになること
  - _Requirements: 8.1, 8.2, 8.3_
  - _Boundary: Sidebar_

- [ ] 6. /read-later ページの実装確認とテスト
- [ ] 6.1 read-later ページのレンダリングテスト
  - `isReadLater: true` のエントリーが一覧に表示されること
  - `isReadLater: false` のエントリーが一覧に含まれないこと
  - `pagination.total === 0` の場合に「記事なし」が表示されること
  - `sortOrder=asc` クエリパラメータで古い順に並ぶこと
  - テスト: `src/app/read-later/page.test.tsx` で上記4ケースがグリーンになること
  - _Requirements: 6.1, 6.2, 6.3_
  - _Boundary: /read-later/page.tsx_

- [ ] 6.2 read-later ページでのエントリー除去動作確認
  - `entry:updated` イベントで `isReadLater: false` になった場合、EntryCardGrid がエントリーを一覧から除去すること（`isReadLater` prop が true の場合の既存 EntryCardGrid ロジックが正しく機能することを確認）
  - テスト: `src/components/entry-card-grid.test.tsx` の既存テストで `isReadLater` prop の除去ロジックがカバーされていること
  - _Requirements: 6.4_
  - _Boundary: EntryCardGrid_

- [ ] 7. キーボードショートカットの動作確認
- [ ] 7.1 (P) ArticleModal キーボードショートカットのテスト
  - `config.toggleRead` キーが押された場合、`toggleRead` が呼び出されること
  - `config.readLater` キーが押された場合、`toggleReadLater` が呼び出されること
  - `isUpdatingRead: true` の間は `toggleRead` が呼び出されないこと
  - `isUpdating: true` の間は `toggleReadLater` が呼び出されないこと
  - テスト: `src/components/article-modal.test.tsx` で上記4ケースがグリーンになること
  - _Requirements: 1.4, 2.3_
  - _Boundary: ArticleModal_
