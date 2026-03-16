# RSS Reader 受け入れ基準（逆生成）

**分析日時**: 2026-03-16
**対象コードベース**: /workspaces/rss-reader/src

---

## 実装済み機能テスト

### フィード管理

#### フィード登録 (REQ-001〜003)
- [x] 有効なRSS URLでフィードを登録できる
- [x] 重複URLの登録を409エラーで拒否する
- [x] フィード登録時にタイトル・説明・ファビコンURLが自動取得される
- [x] プライベートIPアドレスへのURLを400エラーで拒否する（SSRF対策）
- [x] http/https以外のURLを拒否する
- [x] 2048文字を超えるURLを拒否する
- [x] 無効なRSSフォーマットのURLを422エラーで拒否する

**テスト根拠**:
- [feed-service.test.ts](../../../src/lib/feed-service.test.ts)
- [ssrf-guard.test.ts](../../../src/lib/__tests__/ssrf-guard.test.ts)
- [api/feeds/route.test.ts](../../../src/app/api/feeds/route.test.ts)

#### フィード編集・削除 (REQ-005〜006)
- [x] フィードのタイトル・説明・メモを更新できる
- [x] フィードを削除すると関連記事が削除される（カスケード削除）
- [x] 存在しないフィードIDへのアクセスは404エラーを返す

**テスト根拠**:
- [api/feeds/[id]/route.test.ts](../../../src/app/api/feeds/[id]/route.test.ts)
- [edit-feed-form.test.tsx](../../../src/components/edit-feed-form.test.tsx)

---

### 記事取得・保存

#### 記事デデュープ・上限管理 (REQ-011〜012)
- [x] 同一フィードの同一GUIDは重複保存されない（upsert）
- [x] フィードごとに500件を超えた際、古い記事から削除される
- [x] 新記事のリンクが既読済み記事と一致する場合、自動的に既読になる

**テスト根拠**:
- [entry-service-save.test.ts](../../../src/lib/__tests__/entry-service-save.test.ts)

#### 画像取得 (REQ-041〜042)
- [x] RSS 2.0 enclosure から画像を取得する
- [x] media:content / media:thumbnail から画像を取得する
- [x] iTunes image から画像を取得する
- [x] コンテンツHTMLの最初のimgタグから画像を取得する
- [x] 上記がない場合、OGPメタタグ（og:image）から画像を取得する
- [x] OGP取得は5件並列・5秒タイムアウトで実行される

**テスト根拠**:
- [entry-fetcher.test.ts](../../../src/lib/__tests__/entry-fetcher.test.ts)

---

### 記事クエリ・フィルタリング

#### フィルタリング (REQ-018〜022)
- [x] feedIdでフィルタリングできる
- [x] tagIdでフィルタリングできる
- [x] タイトルキーワードで検索できる
- [x] 未読記事のみフィルタリングできる
- [x] 「後で読む」記事のみフィルタリングできる
- [x] フィード未指定時は同一URLの記事を1件にデデュープして表示する

**テスト根拠**:
- [entry-service-query.test.ts](../../../src/lib/__tests__/entry-service-query.test.ts)

---

### 既読管理

#### 既読操作 (REQ-023〜026)
- [x] 記事メタのisRead/isReadLaterを更新できる
- [x] 記事を既読にすると同一リンクの全記事が既読になる
- [x] isReadLaterはリンク同期されない（個別管理）

**テスト根拠**:
- [entry-service-save.test.ts](../../../src/lib/__tests__/entry-service-save.test.ts)
- [api/entries/[id]/meta/route.test.ts](../../../src/app/api/entries/[id]/meta/route.test.ts)

---

### タグ管理

#### タグCRUD (REQ-030〜033)
- [x] タグを作成して記事に紐付ける（upsert）
- [x] タグ名が重複する場合は既存タグを使用する
- [x] 記事からタグの紐付けを削除できる
- [x] タグ名を変更できる（case-insensitive正規化）
- [x] タグを削除すると全記事からの紐付けも削除される

**テスト根拠**:
- [tag-service.test.ts](../../../src/lib/__tests__/tag-service.test.ts)
- [api/tags/route.test.ts](../../../src/app/api/tags/route.test.ts)
- [api/tags/[tagId]/entries/[entryId]/route.test.ts](../../../src/app/api/tags/[tagId]/entries/[entryId]/route.test.ts)

---

### UIコンポーネント

#### フィードフォーム (REQ-001〜003)
- [x] URLを入力して送信するとフィード追加APIが呼ばれる
- [x] APIエラー時にエラーメッセージを表示する
- [x] 送信中はボタンが無効化される

**テスト根拠**: [feed-form.test.tsx](../../../src/components/feed-form.test.tsx)

#### フィード一覧 (REQ-007)
- [x] フィード一覧が表示される
- [x] 編集・削除ボタンが機能する

**テスト根拠**: [feed-list.test.tsx](../../../src/components/feed-list.test.tsx)

#### 記事フィルタ (REQ-018〜021)
- [x] フィード選択でフィルタリングできる
- [x] タグ選択でフィルタリングできる

**テスト根拠**: [entry-filter.test.tsx](../../../src/components/entry-filter.test.tsx)

#### 記事一覧 (REQ-013〜014)
- [x] 記事が一覧表示される
- [x] スクロールで追加記事がロードされる

**テスト根拠**: [entry-list.test.tsx](../../../src/components/entry-list.test.tsx)

#### 記事モーダル (REQ-015〜017, REQ-023〜024, REQ-027, REQ-040)
- [x] 記事の詳細が表示される
- [x] 既読/未読をトグルできる
- [x] 後で読む登録/解除できる
- [x] 前後の記事に移動できる
- [x] キーボードショートカットが動作する

**テスト根拠**: [entry-modal.test.tsx](../../../src/components/entry-modal.test.tsx)

#### タグ入力 (REQ-030〜031, REQ-035)
- [x] タグを追加できる
- [x] タグを削除できる
- [x] 既存タグの補完候補が表示される

**テスト根拠**: [tag-input.test.tsx](../../../src/components/tag-input.test.tsx)

---

### API Routes

#### フィードAPI
- [x] `GET /api/feeds` - フィード一覧取得（未読数付き）
- [x] `POST /api/feeds` - フィード作成（バリデーション付き）
- [x] `GET /api/feeds/[id]` - フィード詳細取得
- [x] `PUT /api/feeds/[id]` - フィード更新
- [x] `DELETE /api/feeds/[id]` - フィード削除
- [x] `POST /api/feeds/refresh` - 手動リフレッシュ

#### 記事API
- [x] `GET /api/entries` - 記事一覧（ページネーション・フィルタ付き）
- [x] `GET /api/entries/[id]` - 記事詳細
- [x] `PUT /api/entries/[id]/meta` - 既読/後で読む更新
- [x] `GET /api/entries/read-later-unread-count` - 後で読む未読数

#### タグAPI
- [x] `GET /api/tags` - タグ一覧
- [x] `POST /api/tags` - タグ作成・記事紐付け
- [x] `PATCH /api/tags/[tagId]` - タグ名変更
- [x] `DELETE /api/tags/[tagId]` - タグ削除
- [x] `DELETE /api/tags/[tagId]/entries/[entryId]` - タグ紐付け削除

**テスト根拠**: 各routeに対応するroute.test.tsファイル

---

## 推奨追加テスト

### 未テスト・テストが少ない機能

- [ ] **ダイジェスト機能**
  - [ ] ダイジェスト作成・更新・削除のAPI tests
  - [ ] `digest-form.tsx` のコンポーネントテスト
  - [ ] `delete-digest-button.tsx` のテスト

- [ ] **設定ページ**
  - [ ] キーボードショートカット設定の保存/読み込みテスト
  - [ ] デフォルトへのリセット機能テスト

- [ ] **サイドバー**
  - [ ] 未読件数バッジの表示テスト
  - [ ] タグのインライン編集テスト
  - [ ] PWAバッジ更新テスト

- [ ] **自動更新**
  - [ ] cron実行のユニットテスト
  - [ ] 更新失敗時のエラーハンドリングテスト

### パフォーマンス・非機能テスト（推奨）

- [ ] **負荷テスト**
  - [ ] 大量フィード（100+）登録時のパフォーマンス
  - [ ] 記事10,000件以上での一覧表示速度

- [ ] **セキュリティテスト**
  - [ ] SQLインジェクション対策の確認
  - [ ] XSS対策（HTMLサニタイズ）の確認
  - [ ] SSRF対策の追加エッジケース

- [ ] **アクセシビリティテスト**
  - [ ] スクリーンリーダー対応
  - [ ] キーボードのみでの操作

- [ ] **PWAテスト**
  - [ ] Service Workerのオフラインキャッシュ動作
  - [ ] アプリバッジの更新確認

---

## 受け入れ基準サマリー

| カテゴリ | 実装済みテスト | 未テスト |
|---------|--------------|---------|
| フィード管理 | ✅ 完全 | - |
| 記事取得・保存 | ✅ 完全 | - |
| 記事フィルタリング | ✅ 完全 | - |
| 既読管理 | ✅ 完全 | - |
| タグ管理 | ✅ 完全 | - |
| UIコンポーネント | ✅ 主要部分 | ダイジェスト、設定 |
| API Routes | ✅ 主要部分 | ダイジェストAPI |
| セキュリティ | ✅ SSRF | SQL injection, XSS |
| パフォーマンス | ❌ 未テスト | 全て |
| PWA | ❌ 未テスト | 全て |
