# Gap分析: 実装 vs Requirements（2026-07-25）

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
