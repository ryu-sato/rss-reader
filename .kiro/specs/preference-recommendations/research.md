# Gap分析: 実装 vs Requirements（2026-07-25）

> **この文書は 2026-07-25 時点のスナップショットです。**
> 2026-08-17 のドメイン再編（`ab36ef1`〜`394c97a`）でコアドメインを `src/domain/` に一元化し、
> 残っていた再エクスポートシムを全廃したため、本文中のファイルパスは現在の配置と一致しません。
> 現在の配置は `.kiro/steering/structure.md`、ドメインの定義は `.kiro/steering/domain-model.md` を参照してください。
> 調査記録としての正確さを保つため本文は当時のまま残しています。
>
> **本書の指摘のうち解消済みのもの**: Gap 3（`ScoreThresholdSlider` が feature 配下に未移行）は
> Option A に近い形で解消。ただしシムは残さず、
> `src/features/preference-recommendations/components/score-threshold-slider.tsx` が唯一の実体。

## 目的

`requirements.md` に対して現行実装（`src/features/preference-recommendations/lib/{preference-service.ts, settings-service.ts}`, `src/app/preferences/`, `src/app/preferred/`, `src/app/api/preferences/`, `src/app/api/settings/`）がどこまで一致しているかを検証する。本specは既存実装からの逆引きスペック生成（2026-05-15作成、phase: `tasks-generated`）のため、生成後にコードが変化していないかの確認が主眼。

直近のgit履歴（`72349df`, `1cfbe1d`, `aee28d4`, `ce097bb`, `b6317dc`）で `UserPreference` への `name` カラム追加・自動生成ロジック、および `/preferred` 系ページへの `SortToggle` 統合が入っており、これらがrequirements.mdに反映されているかを重点的に確認した。

## Requirement-to-Asset Map

| 要件 | 実装状況 | 対応アセット |
|---|---|---|
| 1. 嗜好CRUD | 実装済み（ただし下記Gap 1参照） | `preference-service.ts`（`getAllPreferences`/`createPreference`/`updatePreference`/`deletePreference`）, `src/app/api/preferences/route.ts`, `src/app/api/preferences/[id]/route.ts` |
| 2. スコアしきい値設定（AppSettings） | 実装済み・設計と完全一致 | `settings-service.ts`（raw query による `INSERT ... ON CONFLICT` upsert）, `src/app/api/settings/route.ts` |
| 3. 単一嗜好フィルタリング（/preferred/all） | 実装済み（ただし下記Gap 2参照） | `src/app/preferred/all/page.tsx`, `entry-service.ts` |
| 4. 嗜好ごとのフィルタリング（/preferred/[id]） | 実装済み（ただし下記Gap 2参照。フォルダ名は `[preferenceId]`） | `src/app/preferred/[preferenceId]/page.tsx` |
| 5. Entry APIへの嗜好フィルター統合 | 実装済み・設計と完全一致 | `src/app/api/entries/route.ts`（`userPreferenceId`/`isAnyPreferred`/`scoreThreshold`パース）, `src/features/entry-viewing/lib/entry-service.ts`（`PREFRRED_SCORE_THRESHOLD = 0.5` デフォルト） |
| 6. 嗜好管理UI（/preferences） | 実装済み（ただし下記Gap 1参照） | `src/app/preferences/page.tsx`, `src/app/preferences/preferences-client.tsx` |
| 7. サイドバー「お好みの記事」セクション | 実装済み・要件と一致（表示テキストのみ下記Note参照） | `src/components/sidebar.tsx`（266–325行目） |
| 8. /preferredインデックスページ | 実装済み（ただし下記Gap 1参照） | `src/app/preferred/page.tsx` |

エラーコード（`VALIDATION_ERROR`）・レスポンス形式（`{ success, data }` / `{ success, error: { code, message } }`）は要件どおりに実装されていることを各APIルートで確認した。

## 検出したGap（Missing）

### Gap 1: `UserPreference.name`（自動生成される嗜好名）がrequirements.md・design.md・tasks.mdのいずれにも存在しない

- **分類**: Missing（要件追加漏れ／spec更新漏れ）
- **詳細**:
  - `prisma/schema.prisma` の `UserPreference` モデルに `name String @default("")` フィールドが追加済み（164–173行目）。
  - `src/features/preference-recommendations/lib/preference-service.ts` に `truncateName`（20文字超過時に `…` で省略）と `generateUniqueName`（同名が既存の場合 ` (2)`, ` (3)`... を付与して一意化、空文字時は「無題の好み」にフォールバック）が実装されており、`createPreference` / `updatePreference` の両方で `text` から `name` を自動生成して保存している。
  - `name` はUIの3箇所で表示に使われている: `src/app/preferences/preferences-client.tsx`（231行目、カードヘッダーの `#index` バッジ横）、`src/app/preferred/page.tsx`（39行目、嗜好リンク一覧のラベル）、`src/app/preferred/[preferenceId]/page.tsx`（46行目、ページヘッダータイトル）。
  - `requirements.md` / `design.md` / `tasks.md` 全文検索で `name` という語が一切登場しない（design.mdの2件は「pathname」の部分一致のみ）。`UserPreference` のドメインモデル定義（design.md 517–523行目）にも `name` フィールドは記載されていない。
  - APIレスポンス（`POST /api/preferences`, `PATCH /api/preferences/[id]`）にも `name` が含まれて返るが、API Contract表（design.md 384–389行目）は `text` のみを記載。
- **要件との関係**: 要件1.1（作成）・1.4（更新）は「嗜好テキストを受け取り/更新して」としか書かれておらず、名前生成という追加のビジネスロジック（一意性制約・切り詰めルール・重複時のサフィックス付与）は要件からは一切読み取れない。要件6.1（一覧初期表示）も「嗜好テキスト一覧」としか書いておらず、UIが実際には名前をプライマリラベルとして表示していることと乖離している。
- **Research Needed**: この名前自動生成機能は意図的な仕様追加（要件6章に「6.9 嗜好名の自動生成」等を追記すべき）なのか、暫定的な実装なのか未確認。少なくとも `text` と `name` の使い分け（`name`=一覧・サイドバー等の短いラベル、`text`=編集対象の本文）をrequirements.md/design.mdに明文化する必要がある。

### Gap 2: `/preferred/all`・`/preferred/[id]` ページへの `SortToggle`（`sortOrder`）統合がrequirements.md・design.mdに記載なし

- **分類**: Missing / Constraint（要件追加漏れ＋設計境界の未更新）
- **詳細**:
  - `src/app/preferred/all/page.tsx`・`src/app/preferred/[preferenceId]/page.tsx` はいずれも `SortToggle`（`src/components/sort-toggle.tsx`、entry-viewing feature所有）と `sortOrder` URLパラメータを組み込み、`findManyEntries` に `sortOrder` を渡している。
  - `requirements.md` の3章（/preferred/all）・4章（/preferred/[id]）は `ScoreThresholdSlider` と `ReadFilter` の2コンポーネントのみを要件化しており（3.4/3.5, 4.3/4.4）、`SortToggle`/並び替えへの言及がない。
  - `design.md` の「Allowed Dependencies」（49–54行目）は「entry-viewing: `EntryCardGrid`・`ReadFilter` コンポーネントの再利用」とのみ記載しており、`SortToggle` は明示されていない。同様にコンポーネント概要表（275–289行目）にも `SortToggle` の記載がない。
  - `sortOrder` パラメータ自体はEntry API側では `entry-viewing` のrequirements.md（10.1, 4.4）で要件化済みであり、機能自体の要件化漏れではない。しかし「`/preferred/all` ページ」「`/preferred/[id]` ページ」は design.md の Boundary Commitments で本specの所有物と明記されており（28–41行目）、これらのページの構成要素（どのフィルターUIを表示するか）は本specの要件として更新されるべき。
- **Research Needed**: `SortToggle` をpreference-recommendations spec側のAllowed Dependenciesに追記するだけで足りるか、要件3.x/4.xに「並び替えトグルを表示する」という受け入れ基準を追加すべきか、方針確認が必要。

## Note（Gapではないが記録）: サイドバーの嗜好ラベルが `name` ではなく `text` を使用

- `src/components/sidebar.tsx`（320行目）の「お好みの記事」サブリンクは `pref.text`（原文）をそのまま表示しており、`preferences-client.tsx` / `preferred/page.tsx` / `preferred/[preferenceId]/page.tsx` が使う `pref.name`（切り詰め・一意化済みの短いラベル）とは異なるフィールドを表示している。長い嗜好テキストを登録した場合、サイドバーの表示だけが折り返されずに切れる可能性がある。requirements.md 7.2 は「各嗜好テキストへのリンク」としか書いておらず、`name`/`text` のどちらを表示すべきかの規定がないため直ちに要件違反ではないが、Gap 1の解消と合わせて統一を検討すべき。

## Note（Gapではないが記録）: フォルダ名 `[preferenceId]` と design.md記載の `[id]` の不一致

- design.md のFile Structure Plan（156行目）は `preferred/[id]/page.tsx`（「実装済みか確認要」との注記あり）としているが、実装では `src/app/preferred/[preferenceId]/page.tsx` というルートパラメータ名になっている。動作上の問題はないが、ドキュメントと実装の軽微な乖離。

## Note（Gapではないが記録）: テストが一切存在しない

- `tasks.md` 8.1〜8.3 は `preference-service.test.ts` / `settings-service.test.ts` / API統合テスト / EntryService嗜好フィルターのユニットテストを求めているが、リポジトリ全体を検索しても `preference-recommendations` 関連のテストファイルは1つも存在しない（`find` で0件）。これは要件とコードの乖離というよりtasks.mdの未消化項目だが、監査対象として記録する。

## Implementation Approach Options（Gap 1・Gap 2への対応）

### Option A: requirements.md / design.mdを実装に合わせて更新（ドキュメント側を追従）
- **対応内容**:
  - 要件6章に「6.9 嗜好作成・更新時に一意な表示名（`name`）をテキストから自動生成する」等の受け入れ基準を追加
  - design.mdのドメインモデル・API Contract表に `name` フィールドを追記
  - Allowed Dependenciesに `SortToggle`（entry-viewing）を追記、要件3.x/4.xに並び替えトグルの受け入れ基準を追加
- ✅ 実装は既に安定稼働しており、ユーザー体験を変更しないためリグレッションリスクがない
- ✅ 監査対象のspecが実態を正しく反映するようになり、以後のgap検出が正確になる
- ❌ ドキュメント作業のみでコード改善は伴わない

### Option B: 実装をrequirements.mdの記述範囲に戻す（name機能・SortToggle統合を除去またはフィーチャーフラグ化）
- ✅ specの原則（要件にないものは実装しない）に厳密に従う
- ❌ 既に本番相当のUIとして定着している機能（名前ラベル表示、並び替え）を後退させることになり、ユーザー体験を損なう
- ❌ 直近のコミット履歴が示す通り意図的な機能追加であり、後退させる合理的理由がない

### Option C: 現状維持（記録のみ、次回spec更新サイクルで反映）
- ✅ 低リスク、機能自体は正しく動作している
- ❌ ドキュメントと実装の乖離が残り続け、次回このspecを参照する開発者・エージェントを誤誘導するリスクがある

## Effort & Risk

- **Effort**: S（1–3日）— Gap 1・Gap 2ともに要件・設計ドキュメントの追記のみで、対象箇所は明確（requirements.md 1章・6章・3章・4章、design.md ドメインモデル・API Contract・Allowed Dependencies）
- **Risk**: Low — コード変更を伴わないドキュメント更新であり、機能自体は既に安定稼働中

## Recommendations

- **Option Aを推奨**: 実装（name自動生成・SortToggle統合）はいずれも安定して動作しており後退させる理由がないため、requirements.md/design.mdを実態に合わせて更新するのが最も低リスク。
- Gap 1（name自動生成）を優先的に反映: ユーザー向け機能として3箇所のUIで既に露出しており、仕様として明文化する価値が高い。特に「一意性制約」「切り詰めルール（20文字）」「重複時のサフィックス付与」というビジネスロジックはEARS形式の受け入れ基準として要件化すべき。
- Gap 2（SortToggle統合）はentry-viewing spec側で既に`sortOrder`自体は要件化済みのため、preference-recommendations側では「Allowed Dependenciesへの追記」+「該当ページの受け入れ基準に並び替えUIの存在を追加」程度の軽微な更新で足りる。
- サイドバーの `text`/`name` 不統一（Note参照）は、Gap 1の要件化と合わせてどちらを正とするか意思決定が必要。
- テスト未整備（Note参照）はrequirements.mdとのgapではないため本レポートの主対象外だが、`/kiro-impl` 再実行時にtasks.md 8.1–8.3の消化状況として別途フォローすべき。

---

# Gap分析（再検証）: 2026-07-26時点での差分確認

## 目的

本specは `ready_for_implementation: true`（requirements/design/tasks すべて承認済み）のため、今回の分析は「前回分析（上記、`a5bc288` コミットで追加、2026-07-25）以降にコードベースが変化し、既存の前提を無効化していないか」の再検証に主眼を置く。あわせて、前回分析ではlib層のみを対象としていた `/src/features/preference-recommendations/` のディレクトリ構成を、コンポーネント層まで含めて再確認した。

## 1. Current State Investigation（差分確認）

- 前回分析（`a5bc288`, 2026-07-25 14:37 UTC）から本分析時点（2026-07-26）までの新規コミットは `93f0a6f`（`feat(entry-sync): optimize entry saving and read status inheritance logic`）の1件のみ。
- `93f0a6f` の変更内容を確認: `src/features/feed-management/lib/entry-sync-service.ts` の既読連動ロジックをN+1クエリからバッチクエリに最適化したもの。加えて `src/components/ui/{badge,dialog,scroll-area,sonner}.tsx` ・`empty-panel.tsx` 等の未使用UIプリミティブ削除、`package.json`/`pnpm-lock.yaml` の依存整理を含む。
- `preference-recommendations` フィーチャーへの影響を確認: `entry-sync-service.ts` はエントリー取り込み時の既読連動処理であり、`EntryPreferenceScore` ・嗜好フィルタリングロジック（`entry-service.ts` の `findManyEntries`）とは無関係。削除されたUIプリミティブ（badge/dialog/scroll-area/sonner）は `grep` で `src/features/preference-recommendations/` ・`src/app/preferences/` ・`src/app/preferred/` のいずれからも参照されていないことを確認済み。**→ 本フィーチャーへの機能的影響なし。**
- `.kiro/specs/preference-recommendations/` 配下のファイル（requirements.md / design.md / tasks.md）に対するコミットは `a5bc288`（前回gap分析追加）以降存在しない。**→ 前回検出したGap 1・Gap 2は未解消のまま。**
- `prisma/schema.prisma` の `UserPreference` / `AppSettings` / `EntryPreferenceScore` モデル定義は前回分析時点から変更なし（`name String @default("")` を含め同一）。
- `src/features/preference-recommendations/lib/preference-service.ts` の `truncateName` / `generateUniqueName` ロジックも前回記述のとおりで変更なし。
- `src/app/preferred/all/page.tsx` ・`src/app/preferred/[preferenceId]/page.tsx` を実装レベルで再読し、`ScoreThresholdSlider` ・`ReadFilter` ・`SortToggle` の3コンポーネントが横並びで表示され、`sortOrder` が `findManyEntries` に渡っていることを直接確認した（前回分析の記述と一致）。
- `scripts/scoring/score_entries.py`（外部スコアリングエンジン）の存在を確認。design.mdのNon-Goals「エントリースコアリングロジックは対象外」と整合している。

## 2. 新規検出Gap

### Gap 3: `ScoreThresholdSlider` コンポーネントが `/src/features/preference-recommendations/` 配下に移行されておらず、他の移行済みフィーチャーと構成が一致しない

- **分類**: Constraint / Missing（構造規約からの逸脱）
- **詳細**:
  - `.kiro/steering/structure.md` の「Feature Modules」節は、移行済みフィーチャーは `components/`, `lib/`, `types/` を feature フォルダ配下に持ち、legacy パスは re-export shim になると規定している。「Migrated so far」リストに `preference-recommendations` が無条件で含まれている。
  - 実際には `src/features/preference-recommendations/` には `lib/`（`preference-service.ts`, `settings-service.ts`）のみが存在し、`components/` サブフォルダが存在しない。
  - 一方、design.mdの「This Spec Owns」は `ScoreThresholdSlider` コンポーネントを本specの所有物として明記している（`ScoreThresholdSlider` はrequirements 3.4/4.3/6.6で要求される嗜好フィルタリング専用のビジネスコンポーネントであり、shadcn/uiのような汎用プリミティブではない）。しかし実体は `src/components/score-threshold-slider.tsx` に置かれたままで、`src/features/preference-recommendations/components/score-threshold-slider.tsx` への実体移動も re-export shim も存在しない。
  - 比較として、他の移行済みフィーチャー（`entry-viewing`, `feed-management`, `read-status`, `tag-management`）はすべて `components/` サブフォルダを持つ（`find /src/features -maxdepth 2 -type d` で確認）。`preference-recommendations` のみ `lib/` のみの部分移行状態になっている。
- **要件との関係**: requirements.md自体には直接の記載はないが、design.mdの「This Spec Owns: `ScoreThresholdSlider` コンポーネント」という記述と、steering（structure.md）が定める移行規約との間に矛盾がある。将来 `/kiro-impl` を本specに対して再実行する際、「どこにファイルを置くか」の判断を誤らせるリスクがある。
- **Research Needed**: 意図的に `components/` 移行を見送ったのか（例: 単一コンポーネントのみで移行コストに見合わない）、あるいは移行漏れなのかは不明。`preferences-client.tsx` はルート直下（`src/app/preferences/`）にコロケートされたクライアントコンポーネントであり、feature-common ではないためこちらは移行対象外で妥当と判断できる。

## 3. Implementation Approach Options（Gap 3への対応）

### Option A: `score-threshold-slider.tsx` を `src/features/preference-recommendations/components/` に実体移動し、`src/components/score-threshold-slider.tsx` をre-export shimに変更
- ✅ 他フィーチャーとの構成一貫性が取れ、structure.mdの記述と実態が一致する
- ✅ import元（`src/app/preferred/all/page.tsx` 等）は `@/components/score-threshold-slider` のまま変更不要（shim経由）
- ❌ ファイル移動そのものはコード変更を伴うため、Gap 1/2（ドキュメントのみの更新）より若干作業が増える

### Option B: structure.mdの「Migrated so far」からpreference-recommendationsの完全移行済み扱いを修正し、「lib層のみ移行、componentsは移行対象外/未着手」と明記する
- ✅ コード変更ゼロで整合性を回復できる
- ❌ 単一コンポーネントのみが legacy パスに残る変則的な状態が固定化され、次の機能追加時にも同じ判断コストが発生する

### Option C: 現状維持（次回この機能に手を入れるタイミングでまとめて移行）
- ✅ 独立した価値を生まない小規模移動に今すぐ工数を割かない
- ❌ Gap 1・Gap 2の解消（設計文書更新）と同時にやらないと、再度「後回し」になりやすい

## 4. Effort & Risk（Gap 3）

- **Effort**: S（1日未満）— 対象は単一ファイルの移動とimportパスの整理のみ。他フィーチャーで確立済みのshimパターンをそのまま踏襲できる。
- **Risk**: Low — `@/components/score-threshold-slider` のpublic importパスをshim経由で維持すれば、呼び出し側（`preferred/all`, `preferred/[preferenceId]`）の変更は不要。

## 5. Recommendations（design phase向け）

- 前回分析のGap 1（`name`自動生成の未文書化）・Gap 2（`SortToggle`統合の未文書化）は本分析時点でも解消されておらず、引き続き有効。次回この機能に対して `/kiro-spec-design` 等でドキュメント更新を行う際は、本分析のGap 3と合わせて一括対応するのが効率的（同じ「実装が先行し仕様書が追従していない」という性質のGapであるため）。
- Gap 3については Option A（実体移動 + shim化）を軽く推奨: 移行コストがS（1日未満）と小さく、他フィーチャーとの構成一貫性という steering 上の明確な便益があるため。ただし機能的な影響はゼロであり優先度はGap 1・2より低い。
- 直近コミット（`93f0a6f`）は本フィーチャーの要件・実装のいずれにも影響しないことを確認済み。次回このgap分析を再実行する際は、`git log -- .kiro/specs/preference-recommendations/` と `git log --since=<前回分析日>` の差分のみを追えば十分（今回と同様の再検証アプローチで効率化できる）。
- Research Needed（持ち越し）: Gap 3のcomponents未移行が意図的判断か移行漏れか、実装者・仕様オーナーへの確認が必要。

