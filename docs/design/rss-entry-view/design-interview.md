# RSSエントリー閲覧 設計ヒアリング記録

**作成日**: 2026-03-14
**ヒアリング実施**: step4 既存情報ベースの差分ヒアリング

## ヒアリング目的

既存の rss-feed-registration 設計文書・実装・要件定義を確認し、RSSエントリー閲覧の技術設計に関する不明点や曖昧な部分を明確化するためのヒアリングを実施しました。

## 質問と回答

### Q1: 定期取得の実装方法（cron）

**カテゴリ**: 技術選択
**背景**: Next.js App Router には標準のcronジョブ機能がないため、実装方式の選択が必要だった。devcontainer環境で動作することが条件。

**質問**: 1時間ごとの定期取得の実装方法を選択してください

**回答**: node-cron（推奨）

**信頼性への影響**:
- `lib/cron.ts` + `src/instrumentation.ts` の設計が 🔴 → 🔵 に向上
- Vercel Cron / 外部サービスの排除が確定

---

### Q2: タグ名の大文字小文字の扱い

**カテゴリ**: データモデル
**背景**: EDGE-102で未定義だったタグの大文字小文字の扱いを決定する必要があった。

**質問**: タグ名の大文字小文字の扱いを教えてください

**回答**: 区別しない（推奨）→ 小文字に正規化して保存

**信頼性への影響**:
- TagService の `name.toLowerCase()` 正規化処理が 🔴 → 🔵 に向上
- Tag テーブルの `name` カラムに `@unique` 制約（小文字正規化後）が確定

---

### Q3: フィルターの AND/OR 条件

**カテゴリ**: データモデル / API設計
**背景**: EDGE-103で未定義だったフィード・タグ複数選択時のフィルター動作を決定する必要があった。

**質問**: フィードとタグを同時選択してフィルターする場合の条件を教えてください

**回答**: AND条件（推奨）

**信頼性への影響**:
- Prisma クエリの `where: { feedId, tags: { some: { tagId } } }` が 🔴 → 🔵 に向上
- API クエリパラメータの `feedId` と `tagId` の AND 組み合わせが確定

---

### Q4: モーダルの状態管理方法

**カテゴリ**: アーキテクチャ
**背景**: モーダルの開閉状態をどこで管理するか（URL vs ローカル状態）が未定義だった。

**質問**: モーダルの状態管理方法を教えてください

**回答**: URLクエリパラメータ（推奨）→ `?entryId=xxx` でモーダルを管理

**信頼性への影響**:
- `app/page.tsx` のServer Componentが `searchParams.entryId` でモーダルデータを取得する設計が 🔴 → 🔵 に向上
- ブラウザバックでモーダルが閉じる動作が確定

---

### Q5: HTML全文の表示方法

**カテゴリ**: 技術選択 / セキュリティ
**背景**: RSSのcontent（全文）はHTMLを含む可能性があり、XSS対策の方針が未定義だった。

**質問**: HTML全文の表示方法を教えてください

**回答**: プレーンテキスト → HTMLタグを全て除去して表示

**信頼性への影響**:
- NFR-101（XSS対策のサニタイズ）が実質不要になり、設計が簡素化
- `string-strip-html` または正規表現でのHTML除去が 🔴 → 🔵 に向上
- `dangerouslySetInnerHTML` 不使用が確定

---

## ヒアリング結果サマリー

### 確認できた事項
- 定期取得: node-cron + Next.js Instrumentation Hook
- タグ: 小文字正規化（case-insensitive）
- フィルター: AND条件
- モーダル: URL クエリパラメータ（`?entryId=xxx`）
- HTML表示: プレーンテキスト変換

### 設計方針の決定事項
- `src/instrumentation.ts` でnode-cronを起動
- TagServiceで `name.toLowerCase()` 正規化
- Prisma `where` に AND 条件を使用
- Server Componentで `searchParams.entryId` を受け取りモーダルデータ取得
- HTML除去ライブラリ（`string-strip-html`）または正規表現を使用

### 残課題
- エントリーの前後ナビ実装: cursor-based か offset-based かは実装時に判断
- タグの最大文字数・最大タグ数は未定義（要実装時に設定）
- node-cron の `NEXT_RUNTIME === 'nodejs'` チェックが Edge Runtime で必要かどうかは実装時確認

### 信頼性レベル分布

**ヒアリング前**:
- 🔵 青信号: 8件
- 🟡 黄信号: 5件
- 🔴 赤信号: 10件以上

**ヒアリング後**:
- 🔵 青信号: 20件以上 (+12以上)
- 🟡 黄信号: 4件 (-1)
- 🔴 赤信号: 0件 (-10以上)

## 関連文書

- **アーキテクチャ設計**: [architecture.md](architecture.md)
- **データフロー**: [dataflow.md](dataflow.md)
- **型定義**: [interfaces.ts](interfaces.ts)
- **DBスキーマ**: [database-schema.sql](database-schema.sql)
- **API仕様**: [api-endpoints.md](api-endpoints.md)
- **要件定義**: [requirements.md](../../spec/rss-entry-view/requirements.md)
