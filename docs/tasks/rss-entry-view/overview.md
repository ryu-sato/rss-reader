# RSSエントリー閲覧 タスク概要

**作成日**: 2026-03-14
**プロジェクト期間**: 2026-03-14 - 2026-04-03（約15日）
**推定工数**: 114時間
**総タスク数**: 18件

## 関連文書

- **要件定義書**: [📋 requirements.md](../spec/rss-entry-view/requirements.md)
- **設計文書**: [📐 architecture.md](../design/rss-entry-view/architecture.md)
- **API仕様**: [🔌 api-endpoints.md](../design/rss-entry-view/api-endpoints.md)
- **データベース設計**: [🗄️ database-schema.sql](../design/rss-entry-view/database-schema.sql)
- **インターフェース定義**: [📝 interfaces.ts](../design/rss-entry-view/interfaces.ts)
- **データフロー図**: [🔄 dataflow.md](../design/rss-entry-view/dataflow.md)
- **コンテキストノート**: [📝 note.md](../spec/rss-entry-view/note.md)

## フェーズ構成

| フェーズ | 期間 | 成果物 | タスク数 | 工数 | ファイル |
|---------|------|--------|----------|------|----------|
| Phase 1 | 2日 | DBスキーマ・型定義・パッケージ設定 | 3 | 12h | [TASK-0001~0003](#phase-1-基盤構築) |
| Phase 2 | 6日 | バックエンドAPI・Service・Cron | 8 | 50h | [TASK-0004~0011](#phase-2-バックエンド実装) |
| Phase 3 | 5日 | フロントエンドコンポーネント | 5 | 38h | [TASK-0012~0016](#phase-3-フロントエンド実装) |
| Phase 4 | 2日 | 統合テスト・品質確認 | 2 | 14h | [TASK-0017~0018](#phase-4-統合テスト仕上げ) |

## タスク番号管理

**使用済みタスク番号**: TASK-0001 ~ TASK-0018
**次回開始番号**: TASK-0019

## 全体進捗

- [ ] Phase 1: 基盤構築
- [ ] Phase 2: バックエンド実装
- [ ] Phase 3: フロントエンド実装
- [ ] Phase 4: 統合テスト・仕上げ

## マイルストーン

- **M1: 基盤完成** (2026-03-15): DBスキーマ・型定義・node-cron設定完了
- **M2: API完成** (2026-03-21): EntryService・TagService・全API Route Handler完成
- **M3: UI完成** (2026-03-28): 全フロントエンドコンポーネント完成
- **M4: リリース準備完了** (2026-04-03): 全統合テスト通過

---

## Phase 1: 基盤構築

**期間**: 2026-03-14 ~ 2026-03-15（2日）
**目標**: DB・型定義・パッケージ環境を整える
**成果物**: Prismaマイグレーション、src/types/entry.ts、node-cron設定

### タスク一覧

- [ ] [TASK-0001: Prismaスキーマ追加とマイグレーション](TASK-0001.md) - 4h (DIRECT) 🔵
- [ ] [TASK-0002: エントリー型定義作成（src/types/entry.ts）](TASK-0002.md) - 4h (DIRECT) 🔵
- [ ] [TASK-0003: node-cronパッケージ追加と基本設定](TASK-0003.md) - 4h (DIRECT) 🟡

### 依存関係

```
TASK-0001 → TASK-0002
TASK-0001 → TASK-0003
TASK-0001 → TASK-0004（Phase 2へ）
```

---

## Phase 2: バックエンド実装

**期間**: 2026-03-16 ~ 2026-03-21（6日）
**目標**: EntryService・TagService・API Route Handler・Cronを実装
**成果物**: lib/entry-service.ts, lib/entry-fetcher.ts, lib/tag-service.ts, lib/cron.ts, API Route Handlers

### タスク一覧

- [ ] [TASK-0004: EntryFetcher実装（lib/entry-fetcher.ts）](TASK-0004.md) - 8h (TDD) 🔵
- [ ] [TASK-0005: EntryService - 保存・重複排除・上限管理](TASK-0005.md) - 8h (TDD) 🔵
- [ ] [TASK-0006: EntryService - 一覧取得・フィルター・ページネーション](TASK-0006.md) - 8h (TDD) 🔵
- [ ] [TASK-0007: TagService実装（lib/tag-service.ts）](TASK-0007.md) - 6h (TDD) 🔵
- [ ] [TASK-0008: CronScheduler実装（lib/cron.ts + instrumentation.ts）](TASK-0008.md) - 4h (DIRECT) 🔵
- [ ] [TASK-0009: API Route Handler - エントリー一覧・詳細取得](TASK-0009.md) - 6h (TDD) 🔵
- [ ] [TASK-0010: API Route Handler - メタ情報更新](TASK-0010.md) - 4h (TDD) 🔵
- [ ] [TASK-0011: API Route Handler - タグCRUD](TASK-0011.md) - 4h (TDD) 🔵

### 依存関係

```
TASK-0002 → TASK-0004
TASK-0004 → TASK-0005
TASK-0005 → TASK-0006
TASK-0005 → TASK-0008
TASK-0006 → TASK-0007
TASK-0006 → TASK-0009
TASK-0006 → TASK-0010
TASK-0007 → TASK-0011
```

---

## Phase 3: フロントエンド実装

**期間**: 2026-03-22 ~ 2026-03-28（5日）
**目標**: 全フロントエンドコンポーネントを実装
**成果物**: app/page.tsx（更新）、entry-list.tsx、entry-filter.tsx、entry-modal.tsx、tag-input.tsx

### タスク一覧

- [ ] [TASK-0012: エントリー一覧ページ更新（app/page.tsx）](TASK-0012.md) - 8h (TDD) 🟡
- [ ] [TASK-0013: EntryListコンポーネント（components/entry-list.tsx）](TASK-0013.md) - 8h (TDD) 🟡
- [ ] [TASK-0014: EntryFilterコンポーネント（components/entry-filter.tsx）](TASK-0014.md) - 6h (TDD) 🟡
- [ ] [TASK-0015: EntryModalコンポーネント（components/entry-modal.tsx）](TASK-0015.md) - 8h (TDD) 🔵
- [ ] [TASK-0016: TagInputコンポーネント（components/tag-input.tsx）](TASK-0016.md) - 8h (TDD) 🔵

### 依存関係

```
TASK-0009 → TASK-0012
TASK-0013 → TASK-0012（並行可）
TASK-0014 → TASK-0012（並行可）
TASK-0010 → TASK-0015
TASK-0011 → TASK-0016
TASK-0016 → TASK-0015
```

---

## Phase 4: 統合テスト・仕上げ

**期間**: 2026-03-29 ~ 2026-04-03（2日）
**目標**: 全機能の統合テスト実施・品質確認
**成果物**: 統合テストスイート・品質レポート

### タスク一覧

- [ ] [TASK-0017: E2Eシナリオ統合テスト](TASK-0017.md) - 8h (TDD) 🟡
- [ ] [TASK-0018: 定期取得動作確認・エラーハンドリングテスト](TASK-0018.md) - 6h (TDD) 🟡

### 依存関係

```
TASK-0015 → TASK-0017
TASK-0016 → TASK-0017
TASK-0012 → TASK-0017
TASK-0008 → TASK-0018
TASK-0005 → TASK-0018
```

---

## 信頼性レベルサマリー

### 全タスク統計

- **総タスク数**: 18件
- 🔵 **青信号**: 13件 (72%)
- 🟡 **黄信号**: 5件 (28%)
- 🔴 **赤信号**: 0件 (0%)

### フェーズ別信頼性

| フェーズ | 🔵 青 | 🟡 黄 | 🔴 赤 | 合計 |
|---------|-------|-------|-------|------|
| Phase 1 | 2 | 1 | 0 | 3 |
| Phase 2 | 8 | 0 | 0 | 8 |
| Phase 3 | 2 | 3 | 0 | 5 |
| Phase 4 | 0 | 2 | 0 | 2 |

**品質評価**: 高品質（バックエンドは青信号100%、フロントエンドUI詳細は確認推奨）

## クリティカルパス

```
TASK-0001 → TASK-0002 → TASK-0004 → TASK-0005 → TASK-0006 → TASK-0009 → TASK-0012 → TASK-0017
```

**クリティカルパス工数**: 54時間（約7日）
**並行作業可能工数**: 60時間

## 次のステップ

タスクを実装するには:
- 全タスク順番に実装: `/tsumiki:kairo-implement`
- 特定タスクを実装: `/tsumiki:kairo-implement TASK-0001`
