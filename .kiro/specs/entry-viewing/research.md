# Gap分析: 実装 vs Requirements（2026-07-25）

## 目的

`requirements.md`（2026-05-15作成、既存実装からの逆引き生成）に対して現行実装（`src/features/entry-viewing/`, `src/app/page.tsx`, `src/app/api/entries/`, `src/app/preferred/`）がどこまで一致しているかを検証する。直近のgit履歴で `feat(preferred-page): ... SortToggle ... sortOrder` 系のコミットが多いため、ソート順機能（4.4）を重点確認した。

## Requirement-to-Asset Map

| 要件 | 実装状況 | 対応アセット |
|---|---|---|
| 1.1 カードグリッド表示 | 実装済み | `entry-card.tsx`, `entry-card-grid.tsx` |
| 1.2 空状態メッセージ | 実装済み（4パターン: 未読/あとで読む/お好み/記事なし） | `entry-card-grid.tsx:438-473` |
| 1.3 既読/未読の視覚区別 | 実装済み・**ただし要件に無い例外あり**（下記Gap 2） | `entry-card.tsx:24-27` |
| 1.4 件数表示 | 実装済み | `page.tsx:48-51` |
| 2.1–2.5 無限スクロール | 実装済み（IntersectionObserver, rootMargin 200px, limit+1判定） | `entry-card-grid.tsx:253-344` |
| 3.1–3.4 テキスト検索・IME・URL同期 | 実装済み | `entry-filter-bar.tsx:40-81` |
| 4.1, 4.2, 4.5 フィード/タグ/クリア | 実装済み | `entry-filter-bar.tsx:109-174` |
| 4.3 既読フィルタトグル | 実装済み（**コンポーネントは read-status feature 配下**、下記Gap 4） | `src/features/read-status/components/read-filter.tsx` |
| 4.4 ソート順トグル | **実装済み・要件と完全一致、Gapなし** | `entry-viewing/components/sort-toggle.tsx`, `entry-service.ts` の `sortOrder` 全経路 |
| 4.6 userPreferenceId フィルタ | 実装済み・**feedId併用時に不具合**（下記Gap 1） | `entry-service.ts:31`, `:119` |
| 4.7 isAnyPreferred フィルタ | 実装済み | `entry-service.ts:32`, `:120` |
| 5.1–5.9 ArticleModal全文表示 | 実装済み（progress bar は motion ライブラリ実装、iOS PWA standalone 判定含む） | `article-modal.tsx` |
| 6.1–6.8 モーダルナビゲーション | 実装済み・**7.2との関係で要件外の挙動追加**（下記Gap 3） | `entry-card-grid.tsx:88-378` |
| 7.1–7.3 自動既読化 | 実装済み | `article-modal.tsx:188,206-207` |
| 8.1–8.3 URLデデュプリケーション | 実装済み | `entry-service.ts:97-173`, `entry-sync-service.ts:34-41` |
| 9.1–9.4 隣接プリフェッチ | 実装済み | `entry-card-grid.tsx:346-360, 173, 191, 218` |
| 10.1–10.5 Entry API | 実装済み | `api/entries/route.ts`, `api/entries/[id]/route.ts` |
| 11.1–11.3 一括タグ付け | 実装済み | `entry-card-grid.tsx:380-406`, `BulkTagBar`（tag-management feature） |

**ソート順機能（4.4）の結論**: `feat(entries): add sorting functionality for entries based on sortOrder parameter`（コミット `feaf199`, 2026-04-11）は spec生成日（2026-05-15）より前に導入されており、requirements.md 4.4 / design.md / tasks.md 5.2 に正しく記載済み。client（`entry-card-grid.tsx` の `loadMore`/`loadNavMore`）→ API（`route.ts`）→ service（`findManyEntries`/`findManyEntriesDedup` の `orderBy`）まで一貫して配線されており、Gapなし。本日（2026-07-25）の `feat(preferred-page)` 系コミットは `SortToggle`/`ReadFilter` を `/preferred/*` ページ（preference-recommendations feature の管轄）で再利用する変更であり、entry-viewing 自体の実装・要件には影響しない。

## 検出したGap

### Gap 1: `userPreferenceId` + `feedId` を同時指定した場合のフィルタが壊れている（Missing/Constraint）

`src/features/entry-viewing/lib/entry-service.ts:31`（`findManyEntries`, feedId指定時の非dedupパス）:

```ts
if (userPreferenceId) baseWhere.scores = { and: [{ userPreferenceId }, { score: { gte: threshold } }] };
```

これは2点で誤り:
- Prisma の論理結合子は大文字 `AND` であり、小文字 `and` は認識されない。
- `EntryPreferenceScore` リレーションの実フィールド名は `preferenceId`（`prisma/schema.prisma:186`）であり、クエリパラメータ名の `userPreferenceId` をそのままフィールド名として使っている。

同ファイル119行目の dedup パス（`findManyEntriesDedup`）では正しく `{ some: { preferenceId: userPreferenceId, score: { gte: scoreThreshold } } }` と実装されており、非dedupパスだけが壊れている。`baseWhere` が `Record<string, any>` 型のため TypeScript のチェックをすり抜けており、実行時に Prisma が unknown argument エラーを返す可能性が高い。

要件4.6は「Entry API は `userPreferenceId` を受け付け、閾値以上のエントリーのみ返す」とのみ規定しており、`feedId` との併用を除外していない。現状 `/preferred/[preferenceId]/page.tsx` や `EntryCardGrid` は `feedId` を渡さずに `userPreferenceId` を使うため dedup パス（正しい実装）にしか到達せず、UI からこの不具合は再現しない（デッドコードパス）。しかし将来 feed × 嗜好フィルタの組み合わせUIを追加すると即座に破綻する。

### Gap 2: 既読状態の視覚表現に `isReadLater` の例外があり、要件1.3に記載がない（Constraint/未文書化仕様）

`src/features/entry-viewing/components/entry-card.tsx:26-27`:

```ts
// あとで読むに登録された記事は既読でも未読と同じ見た目にする
const showAsRead = isRead && !isReadLater
```

コミット `1045791 fix(entry-card): update read status handling for better visual distinction between read and unread articles` で導入。要件1.3は「read entries を reduced opacity で表示し、unread accent stripe を省く」とだけ規定しており、「あとで読む」登録済みの既読記事を意図的に未読と同じ見た目にする例外には触れていない。機能的には合理的な仕様（あとで読むリストに戻ってきたときに読んだことを忘れないようにする配慮）だが、requirements.md に反映されていない。

### Gap 3: モーダル表示中の背後リスト更新が「保留→クローズ時にまとめて反映＋再フィルタ」される挙動が未文書化（Constraint/未文書化仕様）

`src/features/entry-viewing/components/entry-card-grid.tsx` の `isModalOpenRef` / `pendingMetaPatchesRef` / `pendingAppendEntriesRef`（コミット `d1f23b2`, 2026-07-19、spec作成日 2026-05-15 より後）:

- モーダルが開いている間、`entry:read` / `entry:unread` / `entry:updated` イベントによる `entries` state への反映は `pendingMetaPatchesRef` に退避され、即時には適用されない（172-251行目）。
- モーダルを閉じたタイミングで、退避しておいた既読/あとで読む変更をまとめて `entries` に適用し、さらに現在のフィルタ（`isUnread`/`isReadLater`）で再フィルタする（148-164行目）。これにより、未読フィルタ表示中にモーダル内で既読化した記事は、モーダルを閉じた瞬間にリストから消える。

要件7.2は「エントリーが既読になったとき、EntryCardGridは該当カードの視覚的既読状態を更新する」と規定するのみで、更新タイミングがモーダルクローズまで遅延されること、および未読フィルタ中は既読化された記事がリストから除去されることには触れていない。UXとしては合理的（モーダル閲覧中に背後グリッドが再配置されて視覚的に乱れるのを防ぐ）が、design.md/tasks.md にも記載がない。

### Gap 4（design.mdドリフト、要件には影響なし）: `ReadFilter` の所属が design.md の「This Spec Owns」と食い違う

design.md 38行目・152行目（File Structure Plan）は `ReadFilter` を entry-viewing の所有コンポーネントとし、`src/components/read-filter.tsx` に実体があると想定している。しかし実際は `src/features/read-status/components/read-filter.tsx` に実体が移動しており、`src/components/read-filter.tsx` は `export * from '@/features/read-status/components/read-filter'` という re-export shim のみ。requirements.md の Boundary Notes は「isRead/isReadLaterのビジネスロジックはread-status featureが担当」としており、コンポーネントの移動先はこの境界と整合する。design.md の記述が実態を追えていないだけで、要件4.3（機能）自体は満たされている。

### Gap 5（design.mdドリフト、軽微）: dedup モードのカーソル対応に関する design.md の記述が古い

design.md 328行目の Implementation Notes は「`findManyEntriesDedup` はカーソルパラメータとの組み合わせは非対応（feedId 未指定・初期ロード専用）」としているが、実際のコード（`entry-service.ts:130-149`, コミット `318cf5e fix(entries): use cursor-based pagination to stop skipping unread articles`）は `afterId` カーソルを dedup モードでもサポートしている（`loadMore`/`loadNavMore` が2ページ目以降で使用）。一方 `beforeId` は dedup モードの関数シグネチャにすら存在せず、`findManyEntries` から dedup パスへ委譲する際に握りつぶされる（`entry-service.ts:21`）。もっとも、クライアントコード全体を検索しても `beforeId` を送信する呼び出しは存在しない（`afterId` のみ使用）ため、実害はない。

### 補足（Gapとしては計上せず）: tasks.md のチェックボックスが全て未チェック

本specは既存実装からの逆引き生成のため、`tasks.md` の全タスクが `[ ]`（未完了）のままだが、実装自体は上記の通りほぼ完了している。これはプロセス上のメタデータの古さであり、コードとrequirements.mdの整合性問題ではない。

## Implementation Approach Options（Gap 1への対応）

### Option A: 非dedupパスの `scores` フィルタを dedup パスと同じ形に修正
- ✅ 1行の修正（`and` → `some`, `userPreferenceId` → `preferenceId`）で完結
- ✅ 将来 feedId × 嗜好フィルタの組み合わせUIを追加してもすぐ機能する
- ❌ 現状どのUIからも到達しないパスのため、テストが無いと再度壊れるリスクが残る

### Option B: 現状維持（記録のみ）
- ✅ 現在のUIフローに実害はなく、緊急対応は不要
- ❌ デッドコードにバグが眠り続け、将来の機能追加時に気付かれにくい

### Option C: `GetEntriesQuery` の型を強化し `Record<string, any>` を排除して同種のミスを型チェックで検出できるようにする
- ✅ Gap 1のような「文字列キーのタイプミスがすり抜ける」問題を構造的に防止
- ❌ `baseWhere` の動的構築ロジック全体の型設計が必要になり、スコープが本Gapより大きくなる

## Effort & Risk

- **Effort**: S（1日未満）— Gap 1 の修正自体は2行程度。Gap 2〜5 はドキュメント更新（requirements.md/design.mdへの反映）のみで実装変更不要。
- **Risk**: Low — Gap 1 は現在未到達のデッドコードパスであるため実装修正してもリグレッションリスクは低い。Gap 2・3 は既存の意図的な仕様のため「直す」対象ではなく、requirements.md 側への追記が適切。

## Recommendations

- **ソート順機能（4.4）は実装・要件が完全に一致しており追加対応不要** — 今回の調査の主眼だったが、Gapなしと確認できた。
- Gap 1（`userPreferenceId`+`feedId`併用時の不具合）は軽微な修正を推奨。修正コストが低く、将来の機能拡張（フィード別お好みフィルタなど）で踏み抜くのを防げる。あわせて `findManyEntries`/`findManyEntriesDedup` の統合テストに feedId+userPreferenceId 併用ケースを追加すると良い。
- Gap 2・3 は「壊れている」のではなく「requirements.mdに書かれていない意図的な仕様」。次回 requirements.md を更新する機会（`/kiro-spec-requirements` の再実行等）に、1.3への `isReadLater` 例外の追記、7.2へのモーダルクローズ時再フィルタ挙動の追記を行うことを推奨。
- Gap 4・5 は design.md のみの記述ズレ。次回design更新時に「ReadFilterはread-status feature配下」「dedupモードはafterIdカーソル対応・beforeId非対応」に修正するとよい。実装変更は不要。
