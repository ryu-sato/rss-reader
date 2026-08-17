# Gap分析: 実装 vs Requirements（2026-07-25）

> **この文書は 2026-07-25 時点のスナップショットです。**
> 2026-08-17 のドメイン再編（`ab36ef1`〜`394c97a`）でコアドメインを `src/domain/` に一元化し、
> 残っていた再エクスポートシムを全廃したため、本文中のファイルパスは現在の配置と一致しません。
> 現在の配置は `.kiro/steering/structure.md`、ドメインの定義は `.kiro/steering/domain-model.md` を参照してください。
> 調査記録としての正確さを保つため本文は当時のまま残しています。
>
> **本書の指摘のうち解消済みのもの**: Gap 2（`edit-feed-form.tsx` 未移行）は
> `src/features/feed-management/components/` へ移動して解消。Gap 3（`ssrf-guard.ts` 未移行）は
> Option B の方針を採り、feature 配下ではなくドメイン共有層 `src/domain/shared/ssrf-guard.ts` に
> 横断ユーティリティとして置くことで決着した。

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

---

# Gap分析（追補）: 実装 vs Requirements（2026-07-26）

## 目的

approvals（requirements/design/tasks）が全て承認済み・`ready_for_implementation: true` の状態から、直近のコミット（特に `93f0a6f feat(entry-sync): optimize entry saving and read status inheritance logic`）を含むコードベースの変化が本specの前提を無効化していないかを再検証する。2026-07-25付の既存Gap分析（本ファイル上部）で指摘済みのGap 1・Gap 2は再調査の上、現時点でも有効であることを確認した（詳細は後述）。新規に発見した論点はSSRF Guardの未移行およびテスト基盤の変化。

## Current State Investigation（差分ハイライト）

- `git log` 確認範囲：`ce097bb`〜`93f0a6f`（直近15コミット）。feed-management本体に直接関わるのは `93f0a6f` のみで、他は `preferred-page`（並び替え・既読フィルタUI）、`read-status`/`settings`/`tag-management` のGap分析追加、`structure.md` 更新など他フィーチャー領域。
- `93f0a6f` の実体は `src/features/feed-management/lib/entry-sync-service.ts` の `saveEntries` 内で行っていた既読連動判定（エントリごとに `findUnique`→`findFirst`→`create` を最大3クエリ×エントリ件数で発行）を、全エントリ保存後にバッチ化した `inheritReadStatusByLink()` に置き換えたリファクタリング。ロジック等価性を確認：
  - 旧実装は候補ごとに「自分自身を除外した」既読兄弟の有無を判定していたが、新実装は自分を除外していない。ただし判定対象（`candidates`）は「まだ `EntryMeta` を持たないエントリ」に限定されるため、`readMetas`（`isRead: true` を持つエントリ）に自分自身が混入することは原理的にない。→ **要件3.5（既読リンクと同一URLの新規エントリを自動既読化）との整合は維持されている**。
  - `enforceEntryLimit`（500件上限、要件3.4）・`fetchAllFeedsEntries` のSSRF再検証（要件9.1/8.1）・`lastFetchedAt` 更新（要件3.6）ロジックは本コミットで変更なし。
  - 対応テスト `src/lib/__tests__/entry-service-save.test.ts` もモック構造（`findUnique`/`findFirst`/`create` → `findMany`/`createMany`）に追従して更新済み。差分レビュー上、アサーション対象（既読連動の可否）自体に変更はない。
- **本サンドボックス環境では `npx vitest run` を実行すると全テストファイルが `Unknown Error: 1` で失敗しテストが `skipped` 扱いになった**。原因は `vitest.setup.ts` の `beforeAll` が `prisma migrate reset --force` を子プロセスで起動する構成になっており（旧来は `beforeEach` だったものを、テストごとのCLI起動コストを避けるため直近で `beforeAll` に変更済みと推測される）、本サンドボックスのファイル/プロセス制約下でこれが失敗するため。コード側のロジック等価性はdiffレビューで確認したが、**実行によるグリーン確認はこの環境では取れなかった**（Research Needed／実装フェーズでのCI実行環境での確認を推奨）。
- 副次的に気づいた点：`tech.md` は「Database reset before each test（`beforeEach` in `vitest.setup.ts`）」と記載しているが、実装は既に `beforeAll` に変わっている。feed-management固有ではないためこのGap分析の対象外とするが、steering更新時に合わせて修正候補として記録。

## Requirement-to-Asset Map（更新差分のみ）

| 要件 | 前回(07-25)時点 | 今回(07-26)確認結果 | 差分 |
|---|---|---|---|
| 3. エントリー取得・保存 | 実装済み（`entry-sync-service.ts`） | 実装済み・**ロジックがバッチ化にリファクタ済み**（`inheritReadStatusByLink`）、要件3.4/3.5/3.6の充足は維持 | 実装詳細変更のみ、要件充足への影響なし |
| 9. SSRF保護 | 実装済み（`src/lib/ssrf-guard.ts`） | 実装済み・**ただし `src/features/feed-management/` 配下に未移行のまま**（re-exportシムも存在せず、`src/lib/ssrf-guard.ts` が実体） | 新規Gap（下記Gap 3） |
| 10. フィード管理UI（Gap 1: `FeedList`/`DeleteConfirmDialog`未使用） | Constraint | **変化なし、現在も未使用のまま**（`src/app/feeds/page.tsx` は123行の自己完結クライアントコンポーネントで `confirm()` を直接使用） | 再確認のみ、Gapは継続 |
| 6. フィード編集（Gap 2: `edit-feed-form.tsx`未移行） | Constraint | **変化なし**、`src/components/edit-feed-form.tsx` は実体のまま（142行、シムではない） | 再確認のみ、Gapは継続 |

## 新規検出Gap

### Gap 3: `ssrf-guard.ts` が feature-module移行の対象から外れている
- **分類**: Constraint（steering記載との不整合）
- **詳細**: `.kiro/steering/structure.md` は「Migrated so far: feed-management, ...」「A feature migrated to this layout owns its real implementation here」と明記しているが、実際には `src/lib/ssrf-guard.ts`（および対応する `src/lib/ssrf-guard.test.ts`）が実体のまま `src/features/feed-management/` 配下には存在しない。re-exportシムすら置かれていない＝「未移行のlib直下ファイル」として残存している状態。要件9（SSRF保護）自体の機能は満たしているため機能Gapではないが、構造ドリフトとしては前回指摘のGap 2（`edit-feed-form.tsx`）と同種であり、feed-management featureの移行は「完了」ではなく「部分的」と評価するのがより正確。
- **要件への影響**: なし（要件9.1〜9.5はすべて `validateUrl`/`isPrivateIP` の実装で充足済み、呼び出し元 `feed-service.ts`・`entry-sync-service.ts`・APIルートからのimportパスも一貫して `@/lib/ssrf-guard` を使用しており動作上の問題はない）。
- **Research Needed**: `ssrf-guard.ts` は feed-management 専用ではなく将来的に他機能（例: OGP画像取得、外部リンク検証等）からも共有される可能性があるユーティリティであるため、feature配下へ移すべきか、意図的に `src/lib/` 直下の横断ユーティリティとして残すべきか方針確認が必要。design/tasksフェーズで扱うより、steering（structure.md）側の記載精度を見直す論点に近い。

## Implementation Approach Options（Gap 3への対応）

### Option A: `src/features/feed-management/lib/ssrf-guard.ts` へ実体を移動し `src/lib/ssrf-guard.ts` をシム化
- ✅ structure.mdの記載（feed-management完全移行）と実装を一致させられる
- ✅ 既存の他Gap（Gap 2）と合わせて一括対応すれば移行コストは低い
- ❌ SSRFガードは概念上「フィード管理専用」ではなく汎用のURL安全性検証ユーティリティであるため、feature配下に置くと将来的な他機能からの再利用時に依存方向が歪む可能性

### Option B: `src/lib/ssrf-guard.ts` を横断ユーティリティとして現状維持し、structure.mdの記載を「feed-managementの機能コードは移行済みだが、共有ユーティリティであるssrf-guard.tsは対象外」と明確化
- ✅ 実装変更が不要、リスクゼロ
- ✅ SSRFガードの汎用性を素直に表現できる
- ❌ 「移行済み」の定義があいまいになり、他フィーチャーのGap分析でも同様の判断が都度必要になる

### Option C: 現状維持（記録のみ、方針は次回のsteering syncで決定）
- ✅ 本specのスコープ外（design/tasksは既承認済み）に手を入れずに済む
- ❌ 判断の先送りになる

## Effort & Risk

- **Effort**: S（1-3日）— Gap 1〜3のいずれも対象範囲が数ファイルの整理・移動にとどまる。Gap 3はOption Aを選んでも移動+import更新のみ
- **Risk**: Low — 要件充足（機能面）には影響しない構造的Gapのみ。ただし本環境でテストグリーンを直接確認できなかった点（`vitest.setup.ts` の `beforeAll` 化）は実装フェーズ着手前にCI環境等で必ず再確認すべき

## Recommendations（追補）

- 直近の `entry-sync-service.ts` リファクタ（93f0a6f）はロジック等価性をdiffレビューで確認済み。要件3.4/3.5/3.6を含む機能要件1〜9の充足状況は前回Gap分析（07-25）の結論から変化なし。設計・タスクの前提を覆す変更ではないため、design/tasksの再承認は不要と判断する。
- Gap 1・Gap 2（前回指摘）は今回の再調査でも解消されておらず、引き続き対応要否の意思決定待ち。
- 新規のGap 3（ssrf-guard.ts未移行）はGap 2と同種の構造ドリフトであり、まとめて対応するのが効率的。ただしssrf-guard.tsの汎用ユーティリティ的性格を踏まえ、feature配下へ移すかsteering側の記載を修正するかは要方針確認（Research Needed）。
- テスト実行確認：本サンドボックスでは `vitest.setup.ts` の `prisma migrate reset --force` 起動が失敗し全テストがskip扱いとなったため、実装フェーズ開始前にCI/開発環境で `npm test` のグリーンを別途確認すること。
