# Gap分析: 実装 vs Requirements（2026-07-25）

## 目的

`requirements.md` に対して現行実装（`src/features/feed-management/`, `src/app/feeds/`, `src/app/api/feeds/`）がどこまで一致しているかを検証する。本specは既存実装からの逆引きスペック生成（2026-05-15作成）のため、作成後にコードが変化していないかの確認が主眼。

## Requirement-to-Asset Map

| 要件 | 実装状況 | 対応アセット |
|---|---|---|
| 1. フィードURL登録 | 実装済み | `src/app/api/feeds/route.ts`, `feed-service.ts` |
| 2. メタデータ取得 | 実装済み | `rss-fetcher.ts` |
| 3. エントリー取得・保存（500件上限・重複排除・既読連動含む） | 実装済み | `entry-sync-service.ts`（`MAX_ENTRIES_PER_FEED = 500` で要件3.4と一致） |
| 4. フィード一覧表示 | 実装済み | `feed-service.ts`, `src/app/feeds/page.tsx` |
| 5. フィード詳細取得 | 実装済み | `src/app/api/feeds/[id]/route.ts` |
| 6. フィード編集 | 実装済み | `src/app/feeds/[id]/edit/page.tsx`, `src/components/edit-feed-form.tsx` |
| 7. フィード削除 | 実装済み | `src/app/api/feeds/[id]/route.ts`（カスケード削除） |
| 8. 手動リフレッシュ | 実装済み | `src/app/api/feeds/refresh/route.ts`、UIトリガーは `src/components/sidebar.tsx` |
| 9. SSRF保護 | 実装済み | `src/lib/ssrf-guard.ts`（IPv4/IPv6プライベートレンジ判定含む） |
| 10. フィード管理UI | 実装済み（ただし下記Gap参照） | `src/app/feeds/page.tsx` |

エラーコード（`FEED_ALREADY_EXISTS` / `FEED_NOT_FOUND` / `URL_NOT_ALLOWED` / `FEED_FETCH_FAILED` / `INVALID_FEED_FORMAT`）は `src/lib/errors.ts` と `types/feed.ts` の型定義・APIテストで要件どおりに確認できた。

## 検出したGap（Missing / Constraint）

### Gap 1: `src/features/feed-management/components/feed-list.tsx` と `delete-confirm-dialog.tsx` が未使用（デッドコード）
- **分類**: Constraint（実装と設計意図の乖離）
- **詳細**: `src/app/feeds/page.tsx` は `'use client'` の自己完結コンポーネントで、フィード一覧描画・スケルトンローディング・空状態・削除確認をすべてページ内にインライン実装している。`FeedList` / `DeleteConfirmDialog`（featureフォルダのコンポーネント）はどこからも import されていない。唯一の参照元は後方互換用のre-exportシム（`src/components/feed-list.tsx`, `src/components/delete-confirm-dialog.tsx`）自身のみ。
- **要件10.4との関係**: 「確認ダイアログを表示した後に削除APIを呼び出す」は満たしているが、実装は shadcn の `DeleteConfirmDialog` ではなくブラウザネイティブの `confirm()` を使っている。機能要件は満たすが、`structure.md` が示す「shadcn/uiベースのコンポーネント再利用」パターンからは外れている。
- **Research Needed**: `FeedList` / `DeleteConfirmDialog` は意図的に温存された未来の再利用候補なのか、単なる移行し忘れの残骸なのか不明。削除するか、`page.tsx` 側をこれらのコンポーネントを使う形にリファクタリングするか、方針確認が必要。

### Gap 2: `edit-feed-form.tsx` が feature フォルダに未移行
- **分類**: Constraint（軽微、構造ドリフト）
- **詳細**: `feed-form.tsx` / `feed-list.tsx` / `delete-confirm-dialog.tsx` は `src/features/feed-management/components/` に移行済みだが、`edit-feed-form.tsx` のみ `src/components/` に残ったまま（シムなし、実体がここにある）。`structure.md`（今回のsteering syncで追記した Feature Modules パターン）に照らすと feed-management フィーチャーの移行が部分的。
- **Research Needed**: なし。次に feed-management 配下を触る際に `src/features/feed-management/components/edit-feed-form.tsx` へ移すかどうかの判断のみ。

## Implementation Approach Options（Gap 1への対応）

### Option A: `page.tsx` を `FeedList`/`DeleteConfirmDialog` を使う形にリファクタリング
- ✅ 設計意図（コンポーネント再利用）に整合、`confirm()` から shadcn ダイアログへ統一
- ❌ 既存の動作するUIへの変更となるため、リグレッションリスクがある

### Option B: 未使用コンポーネントを削除
- ✅ デッドコード解消、シンプル
- ❌ 将来的な再利用（例: 他ページでの一覧表示）の可能性を潰す

### Option C: 現状維持（記録のみ）
- ✅ 低リスク、機能要件は満たしている
- ❌ デッドコードとドリフトが残り続ける

## Effort & Risk

- **Effort**: S（1-3日）— 対象範囲が2ファイルのUIリファクタ or 削除のみ
- **Risk**: Low — 既存テスト（`route.test.ts`等）はAPI層のみを見ておりUI変更の影響は限定的だが、UIの手動確認は必要

## Recommendations

- 機能要件（1〜9）は実装・仕様が完全に一致しており、追加対応不要。
- Gap 1（デッドコード）はユーザー/チームに次のアクションを確認：削除するか、`page.tsx` をリファクタして再利用するか。
- Gap 2は優先度低、feature移行の全体清掃タイミングでまとめて対応で良い。
