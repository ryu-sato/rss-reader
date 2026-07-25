# Gap分析: 実装 vs Requirements（2026-07-25）

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
