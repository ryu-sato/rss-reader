# Requirements Document

## Project Description (Input)

RSSフィードリーダーにおける設定・カスタマイズ機能。ユーザーが /settings ページでキーボードショートカット（モーダルクローズ・前後ナビゲーション・既読トグル・あとで読む・元記事を開く）を設定・リセットできる。ショートカット設定は localStorage に保存され、セッションをまたいで保持される。ArticleModal がこの設定を読み込んでホットキーを適用する。

## Requirements

### 1. キーボードショートカット設定の表示

ユーザーが /settings ページに訪問すると、カスタマイズ可能なキーボードショートカットの一覧を閲覧できる。

**Acceptance Criteria**

- 1.1: When ユーザーが /settings ページを表示したとき, the Settings Page shall 6種類のショートカットアクション（モーダルを閉じる・前の記事へ・次の記事へ・既読/未読を切り替え・あとで読む・元の記事を開く）の一覧を表示する
- 1.2: The Settings Page shall 各ショートカットアクションに対して、アクションのラベルと現在割り当てられているキーを表示する
- 1.3: The Settings Page shall 現在のキー割り当てをユーザーが視覚的に識別できる形式（キーバッジ）で表示する
- 1.4: The Settings Page shall ショートカット設定のデフォルト値を以下のとおり使用する：モーダルを閉じる=Escape、前の記事=ArrowLeft、次の記事=ArrowRight、既読トグル=m、あとで読む=f、元の記事を開く=o

---

### 2. キーボードショートカットのカスタマイズ

ユーザーが特定のアクションに対して任意のキーを割り当てられる。

**Acceptance Criteria**

- 2.1: When ユーザーがショートカットのキーバッジをクリックしたとき, the Settings Page shall そのアクションがキー入力待ち状態であることを視覚的に表示する
- 2.2: While キー入力待ち状態のとき, When ユーザーが任意のキーを押したとき, the Settings Page shall そのキーを当該アクションに割り当てて表示を更新する
- 2.3: While キー入力待ち状態のとき, When ユーザーが Escape キーを押したとき, the Settings Page shall キャプチャをキャンセルしてキー入力待ち状態を解除する（Escape そのものは closeModal アクションとして割り当てない）
- 2.4: When ショートカットのキーが更新されたとき, the Settings Page shall 更新された設定を直ちに localStorage に保存する

---

### 3. デフォルトショートカットへのリセット

ユーザーがすべてのショートカットをデフォルト値に一括リセットできる。

**Acceptance Criteria**

- 3.1: The Settings Page shall デフォルトに戻すボタンを表示する
- 3.2: When ユーザーがデフォルトに戻すボタンをクリックしたとき, the Settings Page shall すべてのショートカットをデフォルト値に戻して表示を更新する
- 3.3: When デフォルトにリセットされたとき, the Settings Page shall リセットされたデフォルト設定を localStorage に保存する

---

### 4. ショートカット設定の永続化（localStorage）

ショートカット設定はブラウザセッションをまたいで保持される。

**Acceptance Criteria**

- 4.1: The Settings System shall ショートカット設定を `rss-reader-hotkeys` キーで localStorage に JSON 形式で保存する
- 4.2: When ページをリロードまたは再訪問したとき, the Settings System shall localStorage から保存済みのショートカット設定を読み込んで適用する
- 4.3: If localStorage に保存済み設定が存在しないとき, the Settings System shall デフォルトのショートカット設定を使用する
- 4.4: If localStorage の読み込みが失敗したとき（JSON パースエラー等）, the Settings System shall デフォルトのショートカット設定にフォールバックする
- 4.5: While サーバーサイドレンダリング（SSR）実行中のとき, the Settings System shall localStorage へのアクセスを行わない

---

### 5. ArticleModal へのショートカット適用

ArticleModal はカスタマイズされたショートカット設定を読み込み、キーボード操作に反映する。

**Acceptance Criteria**

- 5.1: When ArticleModal が表示されたとき, the ArticleModal shall カスタマイズされたショートカット設定を読み込んで適用する
- 5.2: While ArticleModal が表示されている間, When ユーザーがショートカットキーを押したとき, the ArticleModal shall 対応するアクション（モーダルを閉じる・前後ナビゲーション・既読トグル・あとで読む・元記事を開く）を実行する
- 5.3: The ArticleModal shall ツールチップに現在のショートカットキーを表示する（例：「閉じる (ESC)」）
- 5.4: While フォーム入力要素（input・textarea）にフォーカスがある間, the ArticleModal shall キーボードショートカットを無効にする

---

### 6. スコープ境界（スコープ外の明示）

本フィーチャーが担当しない設定機能を明確に除外する。

**Acceptance Criteria**

- 6.1: The Settings Page shall AppSettings.preferredScoreThreshold の表示・編集機能を提供しない（preference-recommendations フィーチャーが /preferences ページで担当する）
- 6.2: The Settings System shall 認証設定・セッション管理機能を提供しない
