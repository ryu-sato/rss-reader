# Gap分析: 実装 vs Requirements（2026-07-25）

> **この文書は 2026-07-25 時点のスナップショットです。**
> 2026-08-17 のドメイン再編（`ab36ef1`〜`394c97a`）でコアドメインを `src/domain/` に一元化し、
> 残っていた再エクスポートシムを全廃したため、本文中のファイルパスは現在の配置と一致しません。
> 現在の配置は `.kiro/steering/structure.md`、ドメインの定義は `.kiro/steering/domain-model.md` を参照してください。
> 調査記録としての正確さを保つため本文は当時のまま残しています。
>
> **本書の指摘のうち解消済みのもの**: Gap 4 の死コード `entry-modal.tsx` と
> レガシーシム `src/components/tag-input.tsx` はいずれも削除済みで、シム撤去の不揃いは解消した。

## 目的

`requirements.md` に対して現行実装（`src/features/tag-management/`, `src/app/api/tags/`, および連携先の `src/components/sidebar.tsx`・`src/features/entry-viewing/components/entry-card-grid.tsx`・`src/features/entry-viewing/components/article-modal.tsx`）がどこまで一致しているかを検証する。本specは既存実装からの逆引きスペック生成（2026-05-15作成、`spec.json` の phase は `tasks-generated`）のため、生成時点でのコード読み取り漏れや、生成後の実装ドリフトがないかの確認が主眼。新規実装の計画ではなく監査結果である。

## Requirement-to-Asset Map

| 要件 | 実装状況 | 対応アセット |
|---|---|---|
| 1. タグ名正規化 | 実装済み | `tag-service.ts`（`upsertTagAndAssign`・`renameTag`）、`batch/route.ts`（ルート内で直接正規化） |
| 2. タグの作成（upsert） | 実装済み | `src/app/api/tags/route.ts`（POST）、`upsertTagAndAssign` |
| 3. タグ一覧取得 | 実装済み | `src/app/api/tags/route.ts`（GET）、`getAllTags`（`react.cache` ラップ確認済み）、`sidebar.tsx` の折りたたみセクション |
| 4. タグのリネーム | 実装済み | `src/app/api/tags/[tagId]/route.ts`（PATCH）、`sidebar.tsx` の `handleRenameTag` |
| 5. タグの削除 | **一部Gapあり（下記Gap 1）** | `src/app/api/tags/[tagId]/route.ts`（DELETE）、`sidebar.tsx` の `handleDeleteTag`、`entry-card-grid.tsx` の空状態削除ボタン |
| 6. 単一エントリーへのタグ付与と除去 | 実装済み | `tag-input.tsx`、`POST /api/tags`、`DELETE /api/tags/:tagId/entries/:entryId` |
| 7. 複数エントリーへの一括タグ付け | **一部Gapあり（下記Gap 2）** | `bulk-tag-bar.tsx`、`entry-card-grid.tsx` の `applyBatchTag`、`POST /api/tags/batch` |
| 8. タグによるエントリーフィルタリング | 実装済み | `sidebar.tsx` の `makeTagLink`、`src/app/api/entries/route.ts`、`entry-service.ts`（`tags: { some: { tagId } }`） |
| 9. エラーハンドリングと非機能要件 | ほぼ実装済み（下記Gap 3は軽微） | 全APIルート、`isLoading` 制御（`tag-input.tsx`・`bulk-tag-bar.tsx`）、`any` 型は未使用（grep確認済み、9.3準拠） |

タグ名正規化（要件9.4）は `tag-service.ts` と `batch/route.ts` の両方で `name.toLowerCase().trim()` が個別に実装されており、一貫性は保たれている（ただし共通関数化されておらずコード重複はある）。

## 検出したGap

### Gap 1: タグ削除フローが2箇所に分岐しており、`tag:deleted` イベント発火が要件と逆の経路にのみ実装されている

- **分類**: Missing（要件未記載の実装）+ Constraint（要件本文と実装の不一致）
- **詳細**:
  - `requirements.md` 5.1・5.4 は「サイドバーのタグ削除操作（ゴミ箱アイコン）→ `DELETE /api/tags/:tagId` → 成功時に `tag:deleted` イベント発火」という単一の経路のみを記述している。
  - しかし実際のコードには **タグ削除の呼び出し口が2箇所** 存在する。
    1. `src/components/sidebar.tsx` の `handleDeleteTag`（166–187行目、要件5.1が指すゴミ箱アイコンの経路）— `DELETE /api/tags/:tagId` 成功後は `setTags(prev.filter(...))` でローカル state を直接更新するのみで、**`tag:deleted` イベントは発火していない**。
    2. `src/features/entry-viewing/components/entry-card-grid.tsx`（456–470行目）— タグフィルター適用中にエントリーが0件のときの空状態に「このタグを削除する」ボタンが存在し、`DELETE /api/tags/:tagId` を呼び出した後に `window.dispatchEvent(new Event('tag:deleted'))` を実行してから `router.push('/')` する。**こちらのみが要件5.4の `tag:deleted` イベントを実際に発火している。**
  - この空状態の削除ボタンは `requirements.md`・`design.md` のどちらにも一切記載がない。`git log` で確認したところ、このボタンとイベント発火は `6dc50b2`（2026-03-16、spec生成日 2026-05-15 より前）で追加されたものであり、**逆引きスペック生成時に見落とされた既存機能**である。
  - 実害としては、サイドバー自身は削除後に自身の state を直接更新するため `tag:deleted` を購読する必要はなく（購読者はSidebar自身のみ）、現状は機能的な不具合を起こしていない。しかし要件5.4の文言「タグ削除が成功したとき、システムは `tag:deleted` イベントを発火する」は削除操作全般に対する記述であり、ゴミ箱アイコン経由の削除（5.1が指す経路）ではこの要件を満たしていない。
- **Research Needed**: (a) `requirements.md`・`design.md` に entry-viewing 側の空状態削除ボタンを追記して境界を明確にするか、(b) `sidebar.tsx` の `handleDeleteTag` にも `tag:deleted` を発火させて2経路の挙動を統一するか、方針確認が必要。

### Gap 2: 一括タグ付け（要件7.6）の「アトミックに処理」が実装で保証されていない

- **分類**: Constraint（要件本文が実装より強い保証を主張）
- **詳細**: `requirements.md` 7.6 は「タグの upsert と EntryTag の一括挿入を**アトミックに処理**し…」と明記している。しかし `src/app/api/tags/batch/route.ts`（18–25行目）は次のように2回の独立した非トランザクション呼び出しで構成されている。
    ```ts
    const tag = await prisma.tag.upsert({ where: { name: normalizedName }, create: { name: normalizedName }, update: {} })
    // ...
    await prisma.$executeRaw`INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES ${Prisma.join(rows)}`
    ```
    `prisma.$transaction` によるラップは存在しない（grep で確認、ヒットなし）。`INSERT OR IGNORE` により重複挿入防止（要件7.6後半）は満たされているが、「アトミック」の字義どおりの保証（2つの操作が全体として不可分に成功/失敗する）はない。実際、`tag.upsert` 成功後に `$executeRaw` 側でプロセスが中断した場合、タグは作成されるが `EntryTag` は0件のまま残る（再実行すれば冪等に復旧はできるが、単一リクエスト内でのアトミック性は担保されない）。
  - `design.md` の Service Layer 節でも `upsertTagAndAssign`（6系フロー）について「2つの upsert はトランザクションではない。競合状態は upsert のべき等性により実用上問題なし」と明記されており、非トランザクションであることを設計時点で認識している。一方で `requirements.md` 7.6 は batch API について「アトミックに処理」と要件レベルで明言しており、design.md 側の実装ノートとも文言が食い違っている。
- **Research Needed**: 要件7.6の「アトミックに処理」を「upsert のべき等性と `INSERT OR IGNORE` により安全に処理する」といった実装に即した表現に修正するか、実際に `prisma.$transaction` でラップして要件どおりの保証を実装するか、方針確認が必要。

### Gap 3（軽微）: テストカバレッジがtasks.mdの要求を満たしていない（要件本文とのドリフトではなく実装完了度の指摘）

- **分類**: 参考情報（Requirements-vs-Code のGapではなく、tasks.mdとの整合性の指摘）
- **詳細**:
  - `tasks.md` 9.1 は `renameTag`・`deleteTag` のユニットテスト（大文字→小文字正規化確認、カスケード削除確認）を要求しているが、`src/lib/__tests__/tag-service.test.ts` には `upsertTagAndAssign`・`removeTagFromEntry`・`getAllTags` のテストのみが存在し、**`renameTag`・`deleteTag` のテストが1件もない**。
  - `tasks.md` 9.2 は `src/app/api/tags/batch/route.test.ts` の作成を明示しているが、当該ファイルは存在しない。`src/app/api/tags/[tagId]/route.ts`（PATCH・DELETE）の統合テストファイルも存在しない。
  - また `DELETE /api/tags/:tagId/entries/:entryId` のハンドラー（`src/app/api/tags/[tagId]/entries/[entryId]/route.ts`）は catch ブロックであらゆる例外を一律 404 `TAG_NOT_FOUND` として返しており、真の500系エラー（DB接続断など）も404にマスクされる。`design.md` のAPI Contractは404と500の両方を列挙しているが、実装上500が返るケースが存在しない。
- **Research Needed**: なし。次にtag-managementのテストを触る際にrenameTag/deleteTagのユニットテストとbatch/[tagId]の統合テストを追加するかどうかの判断のみ。

## Implementation Approach Options

### Gap 1・Gap 2 に共通する前提

本specは「既存実装からの逆引き生成」であるため、多くの場合は **コードを直すのではなく `requirements.md`/`design.md` を実態に合わせて修正する** ことが第一選択になる。以下はGap 1・Gap 2それぞれについて、要件修正／実装修正の両面でオプションを提示する。

### Option A: `requirements.md` / `design.md` を実装に合わせて修正する
- Gap 1: 5.1に「エントリー一覧の空状態（タグフィルター0件時）からの削除操作」を追加経路として明記し、5.4の主語を「entry-viewing の空状態削除ボタン経由の削除」に限定する。あるいはSidebar側にもイベント発火を追加した上で「削除操作全般」に文言を統一する（Option Bと併用）。
  - Gap 2: 7.6の「アトミックに処理」を「upsert のべき等性と `INSERT OR IGNORE` による安全な重複回避」に書き換える。
- ✅ 実装への変更ゼロ、リグレッションリスクなし
- ✅ 逆引きスペックの本来の目的（現状の正確な文書化）に合致
- ❌ 実装側の設計上の弱点（非アトミック性、イベント発火の不整合）はそのまま残る

### Option B: 実装を要件の字義どおりに修正する
- Gap 1: `sidebar.tsx` の `handleDeleteTag` 成功時にも `window.dispatchEvent(new Event('tag:deleted'))` を追加し、2つの削除経路の挙動を統一する（Sidebar自身は購読側でもあるため、自己発火であっても実害はない）。
- Gap 2: `prisma.$transaction` で `tag.upsert` と `$executeRaw` をラップし、要件7.6の「アトミック」を文字通り満たす。
- ✅ 要件文言と実装が完全一致する、将来的な堅牢性向上（Gap 2は部分障害時のデータ不整合リスクを解消）
- ❌ 変更範囲が2ファイルに及び、`$transaction` 化はLibSQL/Prisma 7でのトランザクション挙動の検証が別途必要（既存の動作するコードへの変更のためリグレッションリスクは中程度）

### Option C: 現状維持（記録のみ）
- ✅ 低リスク、機能的な不具合は現状ない（Sidebar自身はイベント購読者かつ発火者を兼ねる必要がないため実害なし。バッチのアトミック性欠如も `upsert`/`INSERT OR IGNORE` のべき等性により実用上のデータ破損は起きにくい）
- ❌ 要件文書と実装の乖離が記録として残り続け、将来の担当者が誤解するリスクがある

## Effort & Risk

- **Gap 1**: Effort S（1日未満、要件修正のみなら文書更新のみ／実装修正でも1関数への1行追加）。Risk Low（Sidebar自身が唯一の購読者であるため、イベント追加による副作用はほぼない）。
- **Gap 2**: Effort S〜M（要件修正なら文書更新のみでS。`$transaction`化する場合はLibSQL上のトランザクション動作確認が必要なためM寄り）。Risk Low〜Medium（`$transaction`化は既存の動作するバッチAPIへの変更のため、他機能（entry-card-gridの`applyBatchTag`）への影響を回帰テストで確認する必要がある）。
- **Gap 3**: Effort S（テスト追加のみ、1〜2ファイル）。Risk Low（テスト追加のみで本番コードへの変更なし）。

## Recommendations

- 要件1〜4、6、8、9（9.3含む）は実装と完全に一致しており、追加対応不要。
- **Gap 1**（削除経路の分岐とイベント発火の不整合）は、まず `requirements.md` 5.1/5.4 に空状態からの削除経路を追記して現状を正確に文書化することを推奨する（Option A）。実装統一（Option B）は優先度中で良い。
- **Gap 2**（バッチAPIの「アトミック」表現）は、要件文言を実装に即した表現へ修正することを推奨する（Option A）。真にアトミックな処理が必要かどうかはプロダクト要件次第であり、現状の `upsert` + `INSERT OR IGNORE` のべき等性で実用上のデータ不整合が問題になっていないなら、`$transaction` 化（Option B）の優先度は低い。
- **Gap 3**（テストカバレッジ）はtasks.mdとの整合性の問題であり、requirements.mdとのGapではない。次にtag-management配下を触るタイミングでrenameTag/deleteTagのユニットテストとbatch/[tagId]の統合テストを追加することを推奨する。

---

# Gap分析 追補: 2026-07-26 時点の再検証

## 目的・スコープ

本追補は、`spec.json` の `ready_for_implementation: true`（requirements/design/tasks すべて承認済み）を踏まえ、上記の2026-07-25付Gap分析からコミット1件分（約17時間）の間にコードベースへ変更が入っていないか、また前回分析時点で見落とされていた既存アセットがないかを再点検したものである。前回分析の内容（Gap 1〜3）を上書き・削除するものではなく、差分のみを報告する。

## 1. Current State Investigation（差分確認）

- 前回分析のコミット（`a5bc288`, 2026-07-25 14:37 UTC）以降、`main` には `93f0a6f`（2026-07-26 07:10 UTC, `feat(entry-sync): optimize entry saving and read status inheritance logic`）が1件のみ追加されている。このコミットは主目的が `entry-sync-service.ts` の最適化だが、副次的にリポジトリ全体の不要ファイル整理も含んでいた。
- `tag-management` に直接関係する差分として、レガシー re-export シム（構造steeringが言う「移行済み機能は旧パスを1行シムとして残す」パターン）のうち以下2点が **削除された**:
  - `src/components/bulk-tag-bar.tsx`（`export * from '@/features/tag-management/components/bulk-tag-bar'` のみの1行シム）
  - `src/components/article-modal.tsx`（entry-viewing側のシムだが、`entry-card-grid.tsx` からのBulkTagBar/ArticleModal参照経路に関わるため確認対象に含めた）
  - 削除後に旧パス（`@/components/bulk-tag-bar`, `@/components/article-modal`）を参照している箇所がないかを `grep` で確認済み（ヒットなし）。`entry-card-grid.tsx` は既に `@/features/tag-management/components/bulk-tag-bar` を直接importしており、影響はない。
- `src/features/tag-management/lib/tag-service.ts`・`src/features/tag-management/components/tag-input.tsx`・`src/features/tag-management/components/bulk-tag-bar.tsx`・`src/app/api/tags/**`・`prisma/schema.prisma`（`Tag`・`EntryTag` モデル、`onDelete: Cascade` 設定含む）は前回分析時点から**変更なし**であることをファイル内容・`git log` の両方で確認した。前回報告した Gap 1（削除イベント発火の経路不整合）・Gap 2（batch APIの非アトミック性）・Gap 3（テストカバレッジ不足）はいずれも**現状のまま**であり、新たな解消や悪化は発生していない。

## 2. 新規検出: Gap 4（軽微）— 死コード `entry-modal.tsx` がレガシーシム `tag-input.tsx` の完全撤去を妨げている

- **分類**: Missing（前回分析で見落とされていた既存アセット）
- **詳細**:
  - `src/components/entry-modal.tsx`（207行）は、`src/features/entry-viewing/components/article-modal.tsx`（現行の記事モーダル実装）以前に存在していたと見られる旧実装で、`TagInput` を `@/components/tag-input`（tag-managementのレガシーシム）経由でimportしている（8行目: `import { TagInput } from '@/components/tag-input'`）。
  - `grep` で全文検索した結果、`entry-modal.tsx` は自身のテストファイル `src/components/entry-modal.test.tsx` 以外のどこからも参照されていない（`/src/app/` 配下のページ・レイアウトからの参照もゼロ）。実質的に**未使用の死コード**である。
  - 今回のコミット `93f0a6f` で `src/components/bulk-tag-bar.tsx`・`src/components/article-modal.tsx` のシムが削除されたのに対し、`src/components/tag-input.tsx` のシムだけが削除されずに残っている。その唯一の理由が、この死コード `entry-modal.tsx` が今も同シムをimportし続けているためと考えられる。
  - tag-management自体の機能・要件充足には影響しない（`entry-modal.tsx` はどのルートからも到達不可能）。ただし、構造steering（`structure.md`）が明記する「移行済み機能はシムを経由せず実体を直接参照する」という設計方針の完全な達成、および将来的な `src/components/tag-input.tsx` シム撤去の妨げになっている。
- **Research Needed**: `entry-modal.tsx`／`entry-modal.test.tsx` の削除は tag-management の所有範囲外（entry-viewing、あるいは横断的なクリーンアップ作業の担当領域）である可能性が高い。削除の実行主体をどちらのspecとするか、または独立したクリーンアップタスクとして扱うかの方針確認が必要。

## Requirement-to-Asset Map（追補分）

| 項目 | 状態 | 対応アセット |
|---|---|---|
| レガシーシム整理（要件本文には非記載、構造steeringの移行方針に基づく） | 一部完了 | `src/components/bulk-tag-bar.tsx`・`src/components/article-modal.tsx` は削除済み。`src/components/tag-input.tsx` は `entry-modal.tsx`（死コード）が唯一の参照元として残存 |

## Implementation Approach Options（Gap 4）

### Option A: 現状維持（記録のみ、tag-management specの対応範囲外として扱う）
- ✅ `entry-modal.tsx` は entry-viewing 側の遺物であり、tag-managementのrequirements/designが所有する境界（「境界の明確化」節）に含まれない。tag-management側から手を出さないのが最も安全。
- ❌ `src/components/tag-input.tsx` シムが不要に残り続け、`bulk-tag-bar.tsx`/`article-modal.tsx` と扱いが不揃いになる。

### Option B: tag-management側で `entry-modal.tsx`・`entry-modal.test.tsx` を削除し、`tag-input.tsx` シムも合わせて撤去する
- ✅ 死コード削除とシム撤去を1コミットで完結でき、`bulk-tag-bar.tsx`/`article-modal.tsx` の扱いと整合する。
- ✅ 影響範囲はgrep確認済みでゼロ（テストのみが参照元）。
- ❌ `entry-modal.tsx` はentry-viewingの実装物であり、tag-managementのrequirements.mdが定める所有範囲（TagService/APIルート/TagInput/BulkTagBar/サイドバーのタグUI）を超える。spec境界を越えた変更となるため、独断で実施すべきではない。

### Option C: 横断的なクリーンアップタスクとして別枠で扱う（entry-viewing側 or 独立タスクとして提案）
- ✅ spec境界を尊重しつつ、死コード除去自体は実施できる。
- ✅ 次回entry-viewingのgap分析・design更新時に合わせて対応すれば、責任範囲が明確になる。
- ❌ 対応が先送りされ、しばらく死コードとシムが残り続ける。

## Effort & Risk（Gap 4）

- **Effort**: S（削除対象は2ファイル、参照ゼロを確認済みのため調査コストも低い）。
- **Risk**: Low（`entry-modal.tsx`・`entry-modal.test.tsx` を除き外部参照が存在しないことをgrepで確認済み。削除してもビルド・テストへの影響はないと推定されるが、実施前にビルド確認は必要）。

## Recommendations（追補分）

- 前回分析（2026-07-25付）のGap 1・Gap 2・Gap 3の推奨事項に変更はない。実装は1日の間で変化しておらず、design phaseへの示唆はそのまま有効。
- 新規のGap 4は**tag-management spec自体の要件充足には影響しない**軽微な発見であり、design phaseでの必須対応事項ではない。ただし、シム撤去の一貫性という観点で、design.mdまたは次のクリーンアップ作業時に「`entry-modal.tsx` の削除是非をentry-viewing側と確認する」という申し送り事項として記録することを推奨する（Option C寄り）。
- 全体として、tag-managementの実装は前回分析時点から安定しており、承認済みrequirements/design/tasksを覆すような新事実は今回の再検証では検出されなかった。
