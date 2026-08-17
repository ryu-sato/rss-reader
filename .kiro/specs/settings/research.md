# Gap分析: 実装 vs Requirements（2026-07-25）

> **この文書は 2026-07-25 時点のスナップショットです。**
> 2026-08-17 のドメイン再編（`ab36ef1`〜`394c97a`）でコアドメインを `src/domain/` に一元化し、
> 残っていた再エクスポートシムを全廃したため、本文中のファイルパスは現在の配置と一致しません。
> 現在の配置は `.kiro/steering/structure.md`、ドメインの定義は `.kiro/steering/domain-model.md` を参照してください。
> 調査記録としての正確さを保つため本文は当時のまま残しています。
>
> **本書の指摘のうち解消済みのもの**: `/src/features/settings/` は作成済みで、`hotkey-config.ts` と
> `use-hotkey-config.ts` の両方がその `lib/` 配下に実体として存在する。`src/hooks/` のシムパターン
> 非対応という問題は、シムを置かず参照元を直接書き換える方針にしたため発生しない。

## 目的

`requirements.md` に対して現行実装（`src/lib/hotkey-config.ts`, `src/hooks/use-hotkey-config.ts`, `src/app/settings/page.tsx`, `src/features/entry-viewing/components/article-modal.tsx`）がどこまで一致しているかを検証する。本specは既存実装からの逆引きスペック生成（2026-05-15作成、spec.jsonのphaseは"tasks-generated"）のため、作成後にコードが変化していないか・実装漏れがないかの確認が主眼。新規実装計画ではない。

## Requirement-to-Asset Map

| 要件 | 実装状況 | 対応アセット |
|---|---|---|
| 1.1–1.4 ショートカット一覧表示・デフォルト値 | 実装済み・一致 | `src/app/settings/page.tsx`（`HOTKEY_ACTIONS.map`）, `src/lib/hotkey-config.ts`（`DEFAULT_HOTKEYS`: readLater='f', toggleRead='m', closeModal='Escape', prevArticle='ArrowLeft', nextArticle='ArrowRight', openOriginal='o' — 要件1.4と完全一致） |
| 2.1 キー入力待ち状態の視覚表示 | 実装済み・一致 | `page.tsx` L64-74（`setListening(action)` → `animate-pulse` + 「キー入力待ち…」表示） |
| 2.2 任意キーでの割り当て更新 | 実装済み・一致 | `page.tsx` L17-30（`keydown` handler → `updateHotkey(listening, e.key)`） |
| 2.3 Escapeでキャプチャキャンセル | 実装済み・一致（挙動はやや広め、Gap扱いせず） | `page.tsx` L21-24（`e.key === 'Escape'` で常に `setListening(null)`、`closeModal` への割り当てを含め一切のアクションへのEscape割り当てを防止） |
| 2.4 更新時にlocalStorage保存 | 実装済み・一致 | `use-hotkey-config.ts` L18-24（`updateHotkey` が同期的に `saveHotkeyConfig` を呼ぶ） |
| 3.1–3.3 デフォルトリセット | 実装済み・一致 | `page.tsx` L46-52（リセットボタン）, `use-hotkey-config.ts` L26-30（`resetHotkeys`） |
| 4.1 `rss-reader-hotkeys`キーでJSON保存 | 実装済み・一致 | `hotkey-config.ts` L36, L50-53（`STORAGE_KEY = 'rss-reader-hotkeys'`） |
| 4.2 リロード時読み込み | 実装済み・一致 | `use-hotkey-config.ts` L14-16（マウント時`useEffect`で`loadHotkeyConfig()`） |
| 4.3 未保存時はデフォルト使用 | 実装済み・一致 | `hotkey-config.ts` L38-48 |
| 4.4 パースエラー時フォールバック | 実装済み・一致 | `hotkey-config.ts` L40-47（`try/catch`でサイレントフォールバック） |
| 4.5 SSR時はlocalStorage非アクセス | 実装済み・一致 | `hotkey-config.ts` L39, L51（`typeof window === 'undefined'` ガード） |
| 5.1 ArticleModalでの設定読み込み | 実装済み・一致 | `article-modal.tsx` L48（`const { config } = useHotkeyConfig()`） |
| 5.2 ショートカットキーでのアクション実行 | 実装済み・一致 | `article-modal.tsx` L239-251（6アクション全て`config.*`で比較・実行： closeModal→onClose, prevArticle→onPrev, nextArticle→onNext, readLater→toggleReadLater, toggleRead→toggleRead, openOriginal→window.open） |
| 5.3 ツールチップにキー表示 | 実装済み（下記Gap 1参照） | `article-modal.tsx` L379, L400, L420, L439（`config.{action}.toUpperCase()`） |
| 5.4 フォーム入力中は無効化 | 実装済み・一致（設計より広いガード） | `article-modal.tsx` L241（`HTMLInputElement \|\| HTMLTextAreaElement`の両方をガード） |
| 6.1 preferredScoreThresholdを扱わない | 実装済み・一致 | `src/app/settings/page.tsx`に該当コードなし（grep確認済み）。`/api/settings`ルートは存在するが本ページからは未参照（設計のOut of Boundaryどおり、preference-recommendations担当） |
| 6.2 認証・セッション管理を提供しない | 実装済み・一致 | `page.tsx`に該当コードなし |

**結論**: 機能要件（1〜6のAcceptance Criteria）はすべてコードと一致しており、挙動レベルの逆引きドリフトはない。feed-managementのgap分析と同様の「機能要件は完全一致」という結果になった。

## 検出したGap

### Gap 1: ArticleModalのツールチップが `formatKeyDisplay` を経由せず、Settingsページと表示形式が食い違う
- **分類**: Constraint（軽微な内部不整合）
- **詳細**: `hotkey-config.ts` の `formatKeyDisplay()` は `Escape→Esc`, `ArrowLeft→←`, `ArrowRight→→` 等の特殊キーをユーザー表示用に変換するために設計されている（design.md L236, L355 記載）。実際に呼び出しているのは `src/app/settings/page.tsx` L73 のみで、`formatKeyDisplay` の唯一の呼び出し元であることをgrepで確認した。一方 `article-modal.tsx` のツールチップ（L379, L400, L420, L439）は `config.{action}.toUpperCase()` という別ロジックで表示文字列を生成している。デフォルト設定では `closeModal='Escape'` のため、Settingsページでは「Esc」と表示されるが、ArticleModalのツールチップでは「ESCAPE」と表示され、同一設定値が画面によって異なる文字列で表示される。さらに、ユーザーが `toggleRead` 等を矢印キーやSpaceに再割り当てした場合、Settingsページでは `↑` 等の記号に変換されるが、ArticleModalのツールチップでは `ARROWUP` のような生の文字列がそのまま表示され、視覚的一貫性が崩れる。
- **付随事項**: `prevArticle` / `nextArticle` に対応するツールチップ自体が存在しない（前後ボタンは `aria-label` のみで `Tooltip`/`TooltipContent` を使っていない）。要件5.3は「ツールチップに現在のショートカットキーを表示する」という一般的な記述であり6アクション全てへの適用を明示していないため、これ単体はGapに数えないが、根本原因（`formatKeyDisplay`がModal側に一切配線されていない）は上記と同一のため付随事項として記録する。
- **Research Needed**: なし。`article-modal.tsx` のツールチップ表示ロジックを `formatKeyDisplay(config.{action})` に置き換えるだけの軽微な修正で解消可能。

### Gap 2: hotkey-config.ts / useHotkeyConfig / ArticleModalのホットキー統合に対するテストが一件も存在しない
- **分類**: Missing（requirements driftではなく、design.md Testing Strategy / tasks.md §4 で計画されたテストの未着手項目）
- **詳細**: `design.md` の Testing Strategy には `loadHotkeyConfig`/`saveHotkeyConfig`/`formatKeyDisplay` のユニットテスト、`useHotkeyConfig` の統合テストが明記されており、`tasks.md` にも タスク4.1・4.2として同内容が記載されている。しかし `find` で該当ファイルを検索した結果、`*hotkey*test*` に一致するテストファイルは存在せず、`entry-modal.test.tsx`（ArticleModalとは別の旧コンポーネント）にも hotkey/config への参照はなかった。他フィーチャー（feed-management, entry-viewing等）は `feed-service.test.ts`, `entry-service.test.ts` 等広範なテストを持つのに対し、settingsフィーチャーのみテストカバレッジがゼロという状態。
- **重要な注記**: これは requirements.md（EARS受け入れ基準）自体にはテスト要件が含まれておらず、`tasks.md` の該当チェックボックス（4.1, 4.2）も未チェック（`[ ]`）のままであるため、**「実装が仕様からドリフトした」のではなく「設計・タスクで計画されたテストが未着手」という進捗上のギャップ**である。挙動面のrequirements drift（Gap 1）とは性質が異なる点に注意。

## Implementation Approach Options（Gap 1への対応）

### Option A: `article-modal.tsx` のツールチップを `formatKeyDisplay(config.{action})` に置き換える
- ✅ 表示ロジックを一元化でき、Settingsページとの表示一貫性が取れる
- ✅ 変更範囲は4箇所のJSX（L379, L400, L420, L439）のみで影響範囲が小さい
- ❌ `formatKeyDisplay` は `Escape→Esc` のように小文字/大文字混在の表示になるため、既存の `.toUpperCase()` 統一表示（「M」「F」「O」等）から見た目が変わる（例: 'm' → formatKeyDisplayでは 'M'のまま変化なしだが、'Escape' → 'Esc' に変わる）。UI上の見た目変更を許容するか確認が必要

### Option B: 現状維持（記録のみ）
- ✅ 低リスク、要件5.3の字面（「ツールチップにショートカットキーを表示する」）は技術的に満たしている
- ❌ 内部的な表示ロジックの重複・不整合が残り続ける

## Effort & Risk

- **Effort**: S（1日未満）— Gap 1はJSX 4箇所の呼び出し変更のみ。Gap 2（テスト追加）を含めてもS〜M（design.mdのTesting Strategy範囲で1〜2日）
- **Risk**: Low — Gap 1はUI表示文字列のみの変更でロジック分岐に影響なし。Gap 2はテスト追加のみで既存動作に影響しない

## Recommendations

- 機能要件（1〜6のAcceptance Criteria）はコードと完全に一致しており、挙動レベルでの追加対応は不要（feed-managementの先行gap分析と同じ「機能要件は完全一致」という結論）。
- Gap 1（ツールチップ表示ロジックの不整合）はユーザー影響が軽微だが、`formatKeyDisplay` を作った設計意図（表示の一元化）から外れているため、次にArticleModalを触るタイミングでの解消を推奨。Option A（`formatKeyDisplay`への置き換え）が妥当。
- Gap 2（テスト未着手）はrequirements.mdの受け入れ基準には影響しないが、`tasks.md` §4を完了させる形で `/kiro-impl settings 4` 等により着手することを推奨。

---

# Gap分析（追補）: structure.md ドキュメント整合性の検証と実装再確認（2026-07-26）

## 目的

2026-07-25付けの既存Gap分析（本ファイル上部）は機能要件（Acceptance Criteria 1〜6）の実装一致を検証済みである。本追補では、依頼された以下2点に絞って再検証する。

1. `.kiro/steering/structure.md` の Feature Modules（migrated / not-yet-migrated リスト）が、`settings` フィーチャーの実装配置と整合しているか
2. 2026-07-25の分析以降にコード側で変化がないか（差分の再確認）

新規実装計画ではなく、ドキュメントと実コードの照合が主眼。

## 1. Current State Investigation

- **コード差分の再確認**: `git log --since="2026-07-25"` を `src/app/settings/`, `src/lib/hotkey-config.ts`, `src/hooks/use-hotkey-config.ts`, `src/features/entry-viewing/components/article-modal.tsx` に対して実行した結果、該当コミットはゼロ件。`hotkey-config.ts` / `use-hotkey-config.ts` / `page.tsx` の最終変更は2026-05-01時点のままであり、`article-modal.tsx` 側の直近コミット（`b9c04d2`, `099b673`, `c763d3e`）もモーション対応・TagInputのkey付与等でホットキーロジックには無関係。**既存Gap分析（Gap 1: ツールチップ表示ロジック不整合、Gap 2: テストカバレッジ ゼロ）は両方とも現時点でも未解消のまま**であることを確認した。
- **`/src/features/settings/` の不存在確認**: `ls src/features` の結果は `entry-viewing`, `feed-management`, `preference-recommendations`, `read-status`, `tag-management` の5件のみ。`settings` フォルダは存在しない。
- **実装配置の実態**: `settings` フィーチャーの実コードは以下の“レガシー”folder-by-typeパスに直接存在する（re-exportシムを介さず、これ自体が実体）。
  - `src/app/settings/page.tsx`（UIページ）
  - `src/lib/hotkey-config.ts`（型・デフォルト値・localStorage I/O・`formatKeyDisplay`）
  - `src/hooks/use-hotkey-config.ts`（`'use client'` カスタムフック）
  - 統合先: `src/features/entry-viewing/components/article-modal.tsx`（migrated済みフィーチャーから `@/hooks/use-hotkey-config` を直接import）
- **structure.mdとの突合（本題）**: `.kiro/steering/structure.md` の "Feature Modules" セクションは次のように記述している。
  > **Migrated so far**: `feed-management`, `entry-viewing`, `read-status`, `tag-management`, `preference-recommendations`
  > **Not yet migrated**: `digests` — still implemented directly under `/src/lib/` and `/src/components/`

  `settings` はこの両リストのいずれにも含まれていない。しかし `.kiro/specs/settings/spec.json` は `phase: "tasks-generated"`, `ready_for_implementation: true` の承認済みspecであり、実装は2026-05-01頃から存在する。実装配置を見る限り、`settings` は現状「folder-by-typeのレガシーパスに直接実装され、`/src/features/` への移行が未実施」という点で `digests` と同じカテゴリに属するが、structure.mdはそれを明記していない。**これはコード側の不整合ではなく、steeringドキュメントの記載漏れ（stale documentation）である**。design.md/tasks.mdが承認された時点（2026-05-15作成）でこの記述整合を取る機会があったと推測されるが、反映されていない。
- **`src/hooks/` のシムパターン非対応**: structure.mdのFeature Modulesパターン説明は、移行済みフィーチャーが持つレガシーシムの対象として `/src/lib/<name>.ts`, `/src/components/<name>.tsx`, `/src/types/<name>.ts` のみを明記しており、`/src/hooks/` については一切言及がない。実際 `src/hooks/` には `use-hotkey-config.ts` と `use-media-preference.ts` の2ファイルのみが存在し、いずれも実コードそのもの（re-exportシムではない）。既存5フィーチャーの `src/features/*/` 配下にも `hooks/` サブディレクトリは1つも存在しない（`components/`, `lib/`, `types/` のみ）。つまり、仮に `settings` を `/src/features/settings/` へ移行する場合、`useHotkeyConfig` フックを新パターンでどこに配置し、どうシムするかという規約がstructure.mdに存在しない。**Research Needed**: フィーチャー固有フックの配置規約（例: `src/features/<feature>/hooks/`）をstructure.mdに追加するか、既存の `src/hooks/` に据え置くかは設計フェーズでの決定事項として持ち越す。
- **AppSettings/マイグレーションとの境界再確認**: `prisma/schema.prisma` の `AppSettings` モデル（`preferredScoreThreshold` のみを保持、migration `20260412000000_add_app_settings`）は `src/lib/settings-service.ts`（`export * from '@/features/preference-recommendations/lib/settings-service'` のシム）経由でpreference-recommendationsフィーチャーが専有している。`/api/settings` ルート（`src/app/api/settings/route.ts`）もこのサービスのみを呼び出しており、`src/app/settings/page.tsx`（本specの対象）からは一切参照されていない。要件6.1（`preferredScoreThreshold` の表示・編集を提供しない）は引き続き満たされている。直近の migration `20260725000000_add_name_to_user_preferences`（`user_preferences.name` カラム追加）も同様にpreference-recommendations側の関心事であり、本spec（キーボードショートカット設定）のスコープに新たな影響を与えるものではない。

## 2. Requirements Feasibility Analysis

- 機能要件（Acceptance Criteria 1〜6）はコードと完全一致した状態が継続しており、新規の機能ギャップはない（2026-07-25分析の結論を再確認）。
- 新たに識別されたのはアーキテクチャ／ドキュメント上のギャップのみ:
  - **Missing**: `/src/features/settings/` ディレクトリ（folder-by-featureパターンへの未移行）
  - **Missing**: `.kiro/steering/structure.md` のFeature Modulesリストへの `settings` の記載（migrated/not-yet-migratedいずれか）
  - **Unknown（Research Needed）**: フィーチャー固有カスタムフックの配置規約（`src/hooks/` に据え置くか `src/features/<feature>/hooks/` を新設するか）がstructure.mdに未定義
  - **Constraint**: 既にArticleModal（entry-viewingフィーチャー、migrated済み）が `@/hooks/use-hotkey-config` を直接importしているため、移行時はクロスフィーチャー依存を壊さないようシムを維持する必要がある

## 3. Implementation Approach Options

### Option A: `settings` を `/src/features/settings/` へ正式移行する
- **対象ファイル**: `src/lib/hotkey-config.ts` → `src/features/settings/lib/hotkey-config.ts`（実体）+ `src/lib/hotkey-config.ts`（シム）、`src/app/settings/page.tsx` はそのまま（App Router規約上、pageはlib/componentsをimportする側なので移動不要）、`use-hotkey-config.ts` の配置は上記Research Needed次第
- ✅ 他の5フィーチャーと同じ構造に統一され、structure.mdの目標アーキテクチャに追従できる
- ✅ 将来的な`settings`機能拡張（テーマ設定など）が発生した場合の受け皿になる
- ❌ フック配置規約が未定義のため、先にstructure.mdの更新（規約策定）が必要
- ❌ 移行自体は要件を1つも満たさない「純粋なリファクタリング」であり、ビジネス価値がない状態でのコスト投下になる

### Option B: 現状維持し、structure.mdの記載のみ是正する
- **対応**: structure.mdの "Not yet migrated" に `settings` を追記する（`digests` と同様の扱いとして明記）、または新たに "Feature Modules pending" のような区分を設ける
- ✅ 低コスト・低リスクでドキュメントの正確性を回復できる
- ✅ コード変更を伴わないため既存動作への影響ゼロ
- ❌ `/src/features/` への統一という設計方針そのものは未達成のまま残る

### Option C: ハイブリッド — structure.md是正を先行し、`/src/features/settings/` 移行はGap 1/Gap 2の解消とセットで次期タスクとして計画する
- **段階戦略**: (1) 即時: structure.mdに `settings` を追記して記載漏れを解消 (2) 中期: design.md改訂時にフック配置規約を策定した上で、Gap 1（ツールチップ表示統一）・Gap 2（テスト追加）と同時に `/src/features/settings/` へ移行
- ✅ ドキュメント修正は即座に、構造移行はリスクの低いタイミング（他の改修と合わせて）に実施できる
- ✅ フック配置規約という未決事項を先送りせず、design phaseで明示的に決定できる
- ❌ 計画のフェーズ分けが増え、追跡すべきタスクが分散する

## 4. Effort & Risk

- **structure.md記載是正のみ（Option B）**: Effort S（1日未満、ドキュメント更新のみ）／Risk Low（コード変更なし）
- **`/src/features/settings/` への移行（Option A/Cの移行部分）**: Effort S〜M（既存の再エクスポートシムパターンを踏襲すれば1〜3日程度。フック配置規約が未決の場合はdesign phaseでの意思決定が前提条件になるため、規約策定込みでM寄り）／Risk Low〜Medium（ロジック変更を伴わない移動的リファクタリングのためLowだが、ArticleModal側のimportパス変更を伴うため回帰テストの裏付けが必要でMedium寄りの側面もある。特にGap 2で指摘済みの通りテストが皆無のため、移行時に挙動保証する自動テストが存在しない点がリスクを押し上げる）

## 5. Recommendations（design phaseへの申し送り）

- **最優先**: `.kiro/steering/structure.md` のFeature Modules節に `settings` を追記し、現状（`/src/lib/` + `/src/hooks/` + `/src/app/settings/` に実装、`/src/features/` 未移行）を正確に反映する。これはコード変更を伴わない低リスクな是正であり、design phase着手前に済ませておくことを推奨。
- `/src/features/settings/` への正式移行を行うか否かはdesign phaseでの意思決定事項とし、行う場合はOption Cの段階戦略（是正→フック配置規約策定→Gap 1/Gap 2解消と合わせて移行）を推奨する。
- **Research Needed（持ち越し）**: フィーチャー固有カスタムフック（`use-*.ts`）の配置規約がstructure.mdに存在しない。既存5フィーチャーはいずれも`hooks/`サブディレクトリを持たないため、`settings`を移行する際に新規パターンを作るのか、`src/hooks/`に据え置いたまま`lib/`のみ移行するのかを明確にする必要がある。
- 2026-07-25分析で指摘済みのGap 1（ArticleModalツールチップの`formatKeyDisplay`不整合）・Gap 2（テストカバレッジ ゼロ）は本追補時点でも未解消であり、変わらず有効。両者は本追補の新規スコープ外だが、設計フェーズで構造移行を検討する場合は同時解消が効率的である旨を改めて申し送る。
