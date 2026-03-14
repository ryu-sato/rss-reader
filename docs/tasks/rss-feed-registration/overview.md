# RSSシードの登録 タスク概要

**作成日**: 2026-03-13
**プロジェクト期間**: 2026-03-13 - 2026-03-20（8日）
**推定工数**: 52時間（4h × 13タスク）
**総タスク数**: 13件

## 関連文書

- **要件定義書**: [📋 requirements.md](../spec/rss-feed-registration/requirements.md)
- **設計文書**: [📐 architecture.md](../design/rss-feed-registration/architecture.md)
- **API仕様**: [🔌 api-endpoints.md](../design/rss-feed-registration/api-endpoints.md)
- **データベース設計**: [🗄️ database-schema.sql](../design/rss-feed-registration/database-schema.sql)
- **インターフェース定義**: [📝 interfaces.ts](../design/rss-feed-registration/interfaces.ts)
- **データフロー図**: [🔄 dataflow.md](../design/rss-feed-registration/dataflow.md)
- **コンテキストノート**: [📝 note.md](../spec/rss-feed-registration/note.md)

## フェーズ構成

| フェーズ | 期間 | 成果物 | タスク数 | 工数 | ファイル |
|---------|------|--------|----------|------|----------|
| Phase 1 | Day 1-1.5 | 開発環境・DB・型定義 | 3 | 12h | [TASK-0001~0003](#phase-1-基盤構築) |
| Phase 2 | Day 2-4 | バックエンドAPI・ビジネスロジック | 5 | 20h | [TASK-0004~0008](#phase-2-バックエンド実装) |
| Phase 3 | Day 5-8 | フロントエンドUI全画面 | 5 | 20h | [TASK-0009~0013](#phase-3-フロントエンド実装) |

## タスク番号管理

**使用済みタスク番号**: TASK-0001 ~ TASK-0013
**次回開始番号**: TASK-0014

## 全体進捗

- [ ] Phase 1: 基盤構築
- [ ] Phase 2: バックエンド実装
- [ ] Phase 3: フロントエンド実装

## マイルストーン

- **M1: 基盤完成** (Day 1.5): Next.js環境・DB・型定義・エラークラス完了
- **M2: API完成** (Day 4): SSRFガード・RSSフェッチャー・FeedService・Route Handler完了
- **M3: UI完成** (Day 8): フィード一覧・登録・削除・編集全画面完了

---

## Phase 1: 基盤構築

**期間**: Day 1 - Day 1.5
**目標**: 開発環境の整備・データベース設計・型定義の確立
**成果物**: Next.jsプロジェクト、Prismaスキーマ、型定義ファイル

### タスク一覧

- [ ] [TASK-0001: Next.jsプロジェクト初期化・依存パッケージ設定](TASK-0001.md) - 4h (DIRECT) 🔵
- [ ] [TASK-0002: Prisma + SQLiteセットアップ・DBスキーマ](TASK-0002.md) - 4h (DIRECT) 🔵
- [ ] [TASK-0003: 型定義ファイル・エラークラス作成](TASK-0003.md) - 4h (DIRECT) 🔵

### 依存関係

```
TASK-0001 → TASK-0002 → TASK-0003
```

---

## Phase 2: バックエンド実装

**期間**: Day 2 - Day 4
**目標**: SSRFガード・RSSフェッチャー・FeedService・APIルートハンドラー完了
**成果物**: lib/ssrf-guard.ts, lib/rss-fetcher.ts, lib/feed-service.ts, app/api/feeds/route.ts, app/api/feeds/[id]/route.ts

### タスク一覧

- [ ] [TASK-0004: SSRFガード実装](TASK-0004.md) - 4h (TDD) 🔵
- [ ] [TASK-0005: RSSフェッチャー実装](TASK-0005.md) - 4h (TDD) 🔵
- [ ] [TASK-0006: FeedServiceビジネスロジック実装](TASK-0006.md) - 4h (TDD) 🔵
- [ ] [TASK-0007: APIルートハンドラー（一覧・登録）](TASK-0007.md) - 4h (TDD) 🔵
- [ ] [TASK-0008: APIルートハンドラー（詳細・更新・削除）](TASK-0008.md) - 4h (TDD) 🔵

### 依存関係

```
TASK-0003 → TASK-0004 → TASK-0005 → TASK-0006 → TASK-0007 → TASK-0008
```

---

## Phase 3: フロントエンド実装

**期間**: Day 5 - Day 8
**目標**: 全フロントエンドUI画面の実装完了
**成果物**: app/page.tsx, components/feed-list.tsx, components/feed-form.tsx, components/delete-confirm-dialog.tsx, app/feeds/new/page.tsx, app/feeds/[id]/edit/page.tsx, components/edit-feed-form.tsx

### タスク一覧

- [ ] [TASK-0009: フィード一覧ページ](TASK-0009.md) - 4h (TDD) 🔵
- [ ] [TASK-0010: フィード登録フォームコンポーネント](TASK-0010.md) - 4h (TDD) 🔵
- [ ] [TASK-0011: 削除確認ダイアログコンポーネント](TASK-0011.md) - 4h (TDD) 🔵
- [ ] [TASK-0012: フィード登録ページ](TASK-0012.md) - 4h (TDD) 🔵
- [ ] [TASK-0013: フィード編集ページ・フォーム](TASK-0013.md) - 4h (TDD) 🔵

### 依存関係

```
TASK-0008 → TASK-0009 → TASK-0010 → TASK-0011 → TASK-0012 → TASK-0013
```

---

## 信頼性レベルサマリー

### 全タスク統計

- **総タスク数**: 13件
- 🔵 **青信号**: 13件 (100%)
- 🟡 **黄信号**: 0件 (0%)
- 🔴 **赤信号**: 0件 (0%)

### フェーズ別信頼性

| フェーズ | 🔵 青 | 🟡 黄 | 🔴 赤 | 合計 |
|---------|-------|-------|-------|------|
| Phase 1 | 3 | 0 | 0 | 3 |
| Phase 2 | 5 | 0 | 0 | 5 |
| Phase 3 | 5 | 0 | 0 | 5 |

**品質評価**: ✅ 高品質

## クリティカルパス

```
TASK-0001 → TASK-0002 → TASK-0003 → TASK-0004 → TASK-0005 → TASK-0006 → TASK-0007 → TASK-0008 → TASK-0009 → TASK-0010 → TASK-0011 → TASK-0012 → TASK-0013
```

**クリティカルパス工数**: 52時間（全タスクが直列）
**並行作業可能工数**: 0時間（各タスクに依存関係あり）

## 次のステップ

タスクを実装するには:
- 全タスク順番に実装: `/tsumiki:kairo-implement`
- 特定タスクを実装: `/tsumiki:kairo-implement TASK-0001`
