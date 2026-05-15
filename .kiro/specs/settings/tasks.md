# Implementation Plan

- [ ] 1. ホットキー設定ユーティリティの実装（hotkey-config.ts）
- [ ] 1.1 HotkeyAction 型・定数・デフォルト値の定義
  - `HotkeyAction` union 型（readLater / toggleRead / closeModal / prevArticle / nextArticle / openOriginal）を定義する
  - `DEFAULT_HOTKEYS`（6 アクション分のデフォルトキー文字列）を定義する
  - `HOTKEY_LABELS`（日本語アクションラベル）と `HOTKEY_ACTIONS`（表示順序配列）を定義する
  - TypeScript strict モードでコンパイルエラーなし・全アクションが `Record<HotkeyAction, string>` として型安全に扱えること
  - _Requirements: 1.4_
  - _Boundary: hotkey-config.ts_

- [ ] 1.2 localStorage 読み書きユーティリティの実装
  - `loadHotkeyConfig()`: `typeof window === 'undefined'` ガードで SSR 時は `DEFAULT_HOTKEYS` を返す
  - `loadHotkeyConfig()`: localStorage から `rss-reader-hotkeys` キーで JSON 読み込みし、`{ ...DEFAULT_HOTKEYS, ...parsed }` でマージする
  - `loadHotkeyConfig()`: JSON パースエラー時は `DEFAULT_HOTKEYS` にサイレントフォールバックする
  - `saveHotkeyConfig(config)`: SSR ガード後に `localStorage.setItem('rss-reader-hotkeys', JSON.stringify(config))` を実行する
  - `formatKeyDisplay(key)`: Escape→Esc・ArrowLeft→←・ArrowRight→→ 等の特殊キーを表示形式に変換する
  - `loadHotkeyConfig` が常に全 HotkeyAction キーを含む完全なオブジェクトを返すこと
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - _Boundary: hotkey-config.ts_

- [ ] 2. useHotkeyConfig フックと Settings ページの実装
- [ ] 2.1 useHotkeyConfig カスタムフックの実装
  - `'use client'` ディレクティブを付与する
  - `useState<Record<HotkeyAction, string>>(DEFAULT_HOTKEYS)` で初期化する（SSR セーフ）
  - `useEffect` でマウント後に `loadHotkeyConfig()` を呼び、`setConfig` で上書きする
  - `updateHotkey(action, key)`: `setConfig` で指定アクションを更新し `saveHotkeyConfig` を呼ぶ（`useCallback` でメモ化）
  - `resetHotkeys()`: `DEFAULT_HOTKEYS` を `setConfig` にセットし `saveHotkeyConfig` を呼ぶ（`useCallback` でメモ化）
  - マウント後に `config` が localStorage の値（またはデフォルト値）になっていること
  - _Requirements: 2.2, 2.4, 3.2, 3.3, 4.2_
  - _Boundary: useHotkeyConfig_

- [ ] 2.2 /settings ページの UI 実装
  - `useHotkeyConfig` から `config`, `updateHotkey`, `resetHotkeys` を取得する
  - `listening: HotkeyAction | null` ローカル状態を定義する
  - `HOTKEY_ACTIONS` をイテレートして各アクションのラベルと現在割り当てキーをリスト表示する
  - キーバッジをクリックすると `setListening(action)` が呼ばれ、バッジが `animate-pulse` で点滅してキー入力待ち状態を表示する
  - `useEffect` で `window.addEventListener('keydown', handler)` を登録し、入力待ち中に任意のキーを捕捉して `updateHotkey` を呼ぶ
  - 入力待ち中に Escape キーを押すと `setListening(null)` でキャプチャをキャンセルし、`closeModal` には割り当てない
  - デフォルトに戻すボタンをクリックすると `resetHotkeys()` が呼ばれ全バッジが DEFAULT_HOTKEYS 表示に更新されること
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2_
  - _Boundary: Settings Page_

- [ ] 3. ArticleModal への useHotkeyConfig 統合の確認と適用
- [ ] 3.1 ArticleModal でのホットキー設定の読み込みと適用
  - `ArticleModal` が `useHotkeyConfig` をインポートして `const { config } = useHotkeyConfig()` で設定を読み込む
  - `useEffect` 内の `keydown` ハンドラーで `e.key === config.closeModal` 等の比較によりカスタマイズされたキーでアクションが実行されること
  - フォーム要素（input・textarea）にフォーカスがある場合はショートカットハンドラーが早期リターンすること
  - ツールチップの `TooltipContent` に `config.toggleRead.toUpperCase()` 等、現在のショートカットキーが表示されること
  - ArticleModal が表示された状態でカスタマイズされたキーを押すと対応するアクション（閉じる・前後ナビ・既読トグル・あとで読む・元記事を開く）が実行されること
  - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - _Boundary: ArticleModal_

- [ ] 4. ユニットテスト・統合テストの実装
- [ ] 4.1 hotkey-config.ts のユニットテスト実装
  - `loadHotkeyConfig`: localStorage が空の場合に `DEFAULT_HOTKEYS` を返すテスト
  - `loadHotkeyConfig`: 有効な JSON が存在する場合にデフォルト値とマージされたオブジェクトを返すテスト
  - `loadHotkeyConfig`: JSON パースエラー時に `DEFAULT_HOTKEYS` にフォールバックするテスト
  - `saveHotkeyConfig`: `localStorage.setItem` が正しいキーと JSON 値で呼ばれることを検証するテスト
  - `formatKeyDisplay`: `Escape`→`Esc`・`ArrowLeft`→`←`・通常文字→大文字変換を検証するテスト
  - すべてのテストが `npm test` で green になること
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - _Boundary: hotkey-config.ts_

- [ ] 4.2 useHotkeyConfig フックの統合テスト実装
  - `useHotkeyConfig`: 初期レンダリング時に `DEFAULT_HOTKEYS` で初期化されること
  - `useHotkeyConfig`: マウント後に localStorage の値で `config` が上書きされること
  - `updateHotkey` 呼び出し後に `config` が更新され `saveHotkeyConfig` が呼ばれること
  - `resetHotkeys` 呼び出し後に `config` が `DEFAULT_HOTKEYS` に戻り `saveHotkeyConfig` が呼ばれること
  - すべてのテストが `npm test` で green になること
  - _Requirements: 2.2, 2.4, 3.2, 3.3, 4.2_
  - _Boundary: useHotkeyConfig_
