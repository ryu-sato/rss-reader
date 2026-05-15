# Implementation Plan

## preference-recommendations

---

- [ ] 1. 嗜好サービス層とデータアクセス
- [ ] 1.1 嗜好 CRUD サービス関数の実装
  - `getAllPreferences`（作成日時昇順）・`createPreference`・`updatePreference`・`deletePreference` を `preference-service.ts` に実装する
  - Prisma `userPreference` モデルを使ったシンプルな DB アクセスのみで、ビジネスロジックは持たない
  - `getAllPreferences()` を呼ぶと UserPreference 配列が作成日時昇順で返ること
  - _Requirements: 1.1, 1.3, 1.4, 1.6_
  - _Boundary: PreferenceService_

- [ ] 1.2 (P) AppSettings シングルトンサービスの実装
  - `getAppSettings`（row 不在時にデフォルト 0.5 を返す）・`updatePreferredScoreThreshold`（upsert）を `settings-service.ts` に実装する
  - raw query（`prisma.$queryRaw` / `prisma.$executeRaw`）を使った INSERT ON CONFLICT DO UPDATE で実装する
  - `getAppSettings()` を呼んで app_settings 行が存在しない場合に `{ id: 'singleton', preferredScoreThreshold: 0.5 }` が返ること
  - _Requirements: 2.1, 2.2, 2.4_
  - _Boundary: SettingsService_

---

- [ ] 2. 嗜好 API Routes
- [ ] 2.1 (P) 嗜好コレクション API（GET / POST）の実装
  - `GET /api/preferences` で全嗜好一覧を返す・`POST /api/preferences` で嗜好を作成する Route Handler を実装する
  - `text` が空文字・未指定の場合に 400 + `VALIDATION_ERROR` を返す
  - `POST` が成功すると HTTP 201 で作成済み UserPreference が返ること
  - _Requirements: 1.1, 1.2, 1.3_
  - _Boundary: Preference API Routes_

- [ ] 2.2 (P) 嗜好個別 API（PATCH / DELETE）の実装
  - `PATCH /api/preferences/[id]` で嗜好を更新する・`DELETE /api/preferences/[id]` で削除する Route Handler を実装する
  - `text` が空文字・未指定の PATCH リクエストに対して 400 + `VALIDATION_ERROR` を返す
  - `DELETE` 成功時に `{ success: true }` が返ること
  - _Requirements: 1.4, 1.5, 1.6_
  - _Boundary: Preference API Routes_

- [ ] 2.3 (P) 設定 API（GET / PATCH）の実装
  - `GET /api/settings` で現在の AppSettings を返す・`PATCH /api/settings` でスコアしきい値を更新する Route Handler を実装する
  - `preferredScoreThreshold` が数値でない・0.0 未満・1.0 超の場合に 400 + `VALIDATION_ERROR` を返す
  - `PATCH /api/settings` に `{ preferredScoreThreshold: 0.7 }` を送ると更新後の設定が返ること
  - _Requirements: 2.1, 2.2, 2.3_
  - _Boundary: Settings API Route_

---

- [ ] 3. エントリー API への嗜好フィルター統合
- [ ] 3.1 GetEntriesQuery 型への嗜好フィルターフィールド追加
  - `types/entry.ts` の `GetEntriesQuery` に `userPreferenceId?: string`・`isAnyPreferred?: boolean`・`scoreThreshold?: number` を追加する
  - `GET /api/entries` Route Handler で上記パラメータをパースして `findManyEntries` に渡す
  - Route Handler が `isAnyPreferred=true` を受け取って `findManyEntries` に `{ isAnyPreferred: true }` を渡せること
  - _Requirements: 5.1, 5.2, 5.3_
  - _Boundary: Entry API_

- [ ] 3.2 EntryService の findManyEntries / findManyEntriesDedup への嗜好フィルタークエリ追加
  - `findManyEntries` に `isAnyPreferred=true` の場合は `where.scores = { some: { score: { gte: threshold } } }` を追加する
  - `userPreferenceId` が指定された場合は `where.scores = { some: { preferenceId, score: { gte: threshold } } }` を追加する
  - `scoreThreshold` 未指定時は `PREFERRED_SCORE_THRESHOLD = 0.5` を使う
  - `findManyEntriesDedup` にも同様のフィルターを追加する
  - `isAnyPreferred=true`・`scoreThreshold=0.7` で呼ぶとスコア 0.7 以上の記事のみが返ること
  - _Requirements: 3.1, 4.1, 5.4_
  - _Boundary: EntryService_

---

- [ ] 4. 嗜好管理 UI（/preferences ページ）
- [ ] 4.1 preferences ページのサーバーコンポーネント実装
  - `preferences/page.tsx` で `getAllPreferences` と `getAppSettings` を並列取得して `PreferencesClient` に初期値として渡す
  - ページヘッダーに件数（0件時は「好みなし」）を表示する
  - ページを表示すると初期嗜好一覧とスコアしきい値が SSR で提供されること
  - _Requirements: 6.1_
  - _Boundary: preferences page_

- [ ] 4.2 PreferencesClient の嗜好 CRUD インタラクション実装
  - 嗜好追加フォーム（テキストエリア + 追加ボタン）・インライン編集・削除を Client Component として実装する
  - 各操作は `fetch('/api/preferences')` / `fetch('/api/preferences/[id]')` を呼び出し、成功後に state を更新する
  - 空テキストで保存しようとするとエラーメッセージが表示されること
  - API リクエスト中はボタンが disabled になり Loader2 アイコンが表示されること
  - Cmd/Ctrl+Enter でフォームを送信できること
  - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.7, 6.8_
  - _Boundary: PreferencesClient_

- [ ] 4.3 PreferencesClient のスコアしきい値スライダー実装
  - 0.0〜1.0・ステップ 0.05 の range slider を実装し、「デフォルトとして保存」ボタンで `PATCH /api/settings` を呼ぶ
  - 保存成功後 2 秒間「保存しました」ラベルを表示してから元に戻す
  - スライダーで値を変更して保存ボタンを押すと AppSettings が更新されること
  - _Requirements: 6.6, 6.7, 6.8_
  - _Boundary: PreferencesClient_

---

- [ ] 5. ScoreThresholdSlider コンポーネント実装
- [ ] 5.1 ScoreThresholdSlider の実装
  - `score-threshold-slider.tsx` で range slider を実装し、`onMouseUp` / `onTouchEnd` 時に `router.push` で URL の `score` パラメータを更新する
  - `startTransition` で非同期ナビゲーションを管理し、スライダー操作中も UI がレスポンシブに動作する
  - スライダーの値を変更してドラッグを離すと URL の `score` パラメータが更新され、ページが再レンダリングされること
  - _Requirements: 3.4, 4.3_
  - _Boundary: ScoreThresholdSlider_

---

- [ ] 6. 好みの記事ページ群の実装
- [ ] 6.1 (P) /preferred インデックスページの実装
  - `preferred/page.tsx` で `getAllPreferences` を取得し、嗜好0件時は `/preferences` への誘導、1件以上時は「すべて」と各嗜好へのリンク一覧を表示する
  - ページを表示すると嗜好0件時に `/preferences` リンクが表示されること
  - _Requirements: 8.1, 8.2, 8.3_
  - _Boundary: preferred page_

- [ ] 6.2 (P) /preferred/all ページの実装
  - `preferred/all/page.tsx` で `isAnyPreferred=true` でエントリーを取得し、`ScoreThresholdSlider` と `ReadFilter` を組み合わせて表示する
  - `score` クエリパラメータが指定された場合はそのしきい値を使い、未指定時は `AppSettings.preferredScoreThreshold` をデフォルトとして使う
  - ページを表示するとスコアしきい値以上の記事が EntryCardGrid に表示されること
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - _Boundary: preferred/all page_

- [ ] 6.3 (P) /preferred/[id] ページの実装
  - `preferred/[id]/page.tsx` で `userPreferenceId` を使ってエントリーをフィルタリングし、`ScoreThresholdSlider` と `ReadFilter` を組み合わせて表示する
  - `score` クエリパラメータが指定された場合はそのしきい値を使い、未指定時は `AppSettings.preferredScoreThreshold` をデフォルトとして使う
  - ページを表示すると指定嗜好のスコアしきい値以上の記事が EntryCardGrid に表示されること
  - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - _Boundary: preferred/[id] page_

---

- [ ] 7. サイドバーへの「お好みの記事」セクション統合
- [ ] 7.1 Sidebar への嗜好リストセクション追加
  - `sidebar.tsx` の初期マウント時に `fetch('/api/preferences')` を呼んで `preferences` state に保存する
  - 「お好みの記事」リンク（/preferred）・展開ボタン・「すべて」（/preferred/all）・各嗜好テキストリンク（/preferred/[id]）を実装する
  - 嗜好0件時はサブリンクを非表示にする
  - 現在のパスに対応するリンクがアクティブスタイルで表示されること
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - _Boundary: Sidebar_

---

- [ ] 8. テスト
- [ ] 8.1 (P) サービス層のユニットテスト
  - `preference-service.test.ts`: `getAllPreferences`・`createPreference`・`updatePreference`・`deletePreference` のテスト
  - `settings-service.test.ts`: `getAppSettings`（行なし・行あり）・`updatePreferredScoreThreshold`（新規・上書き）のテスト
  - すべてのサービス関数テストが通ること
  - _Requirements: 1.1, 1.3, 1.4, 1.6, 2.1, 2.2, 2.4_
  - _Boundary: PreferenceService, SettingsService_

- [ ] 8.2 (P) API Routes のインテグレーションテスト
  - Preference API（GET・POST・PATCH・DELETE）のレスポンス検証・バリデーションエラー検証
  - Settings API（GET・PATCH・バリデーションエラー）のレスポンス検証
  - Entry API の嗜好フィルターパラメータ（`isAnyPreferred`・`userPreferenceId`・`scoreThreshold`）の組み合わせ検証
  - すべての API テストが通ること
  - _Requirements: 1.1, 1.2, 1.4, 1.5, 2.2, 2.3, 3.1, 4.1, 5.1, 5.2, 5.3_
  - _Boundary: Preference API Routes, Settings API Route, Entry API_

- [ ] 8.3 (P) EntryService 嗜好フィルターのユニットテスト
  - `findManyEntries` に `isAnyPreferred=true`・`scoreThreshold` を渡してスコア以上のエントリーのみが返ること
  - `userPreferenceId` 指定時に当該嗜好スコアでフィルタリングされること
  - `scoreThreshold` 未指定時にデフォルト 0.5 が適用されること
  - すべての EntryService 嗜好フィルターテストが通ること
  - _Requirements: 3.1, 4.1, 5.4_
  - _Boundary: EntryService_
