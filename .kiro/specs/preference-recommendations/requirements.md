# Requirements Document

## Project Description (Input)

RSSフィードリーダーにおける嗜好ベースレコメンデーション機能。ユーザーが関心トピックを嗜好テキスト（例：「機械学習」「Python」）として登録・管理し、外部スコアリングエンジンが算出した EntryPreferenceScore を元に、スコアしきい値（0.0〜1.0）を超えた記事を「好みの記事」としてフィルタリング・閲覧できる。単一嗜好・全嗜好OR条件でのフィルタリングページを提供する。

## Requirements

### 1. 嗜好の作成・一覧・更新・削除（CRUD）

**1.1** The Preference API shall 嗜好テキスト（非空文字列）を受け取り、新しい UserPreference レコードを作成して返す。

**1.2** When 嗜好テキストが空文字または未指定の場合, the Preference API shall HTTP 400 レスポンスと `VALIDATION_ERROR` コードを返す。

**1.3** The Preference API shall 登録済みの全嗜好を作成日時昇順で返す。

**1.4** When 指定 ID の嗜好が存在する場合, the Preference API shall 嗜好テキストを更新して最新レコードを返す。

**1.5** When 嗜好テキストが空文字または未指定で更新が要求された場合, the Preference API shall HTTP 400 レスポンスと `VALIDATION_ERROR` コードを返す。

**1.6** When 指定 ID の嗜好が存在する場合, the Preference API shall その嗜好を削除して成功レスポンスを返す。

**スコープ注記**: スコアリング（EntryPreferenceScore の作成・更新）は外部スコアリングエンジンが担当し、このフィーチャーの対象外とする。

---

### 2. スコアしきい値の設定・取得（AppSettings）

**2.1** The Settings API shall 現在の `preferredScoreThreshold` を含む AppSettings を返す。

**2.2** When `preferredScoreThreshold` が 0.0〜1.0 の数値で送信された場合, the Settings API shall その値を AppSettings に保存して更新後の設定を返す。

**2.3** If `preferredScoreThreshold` が数値でない、または 0.0〜1.0 の範囲外の場合, the Settings API shall HTTP 400 レスポンスと `VALIDATION_ERROR` コードを返す。

**2.4** The Settings Service shall AppSettings が未初期化の場合に `preferredScoreThreshold` のデフォルト値として 0.5 を返す。

**スコープ注記**: AppSettings モデルは settings フィーチャーと共有されるが、`preferredScoreThreshold` フィールドの管理はこのフィーチャーが担当する。

---

### 3. 単一嗜好によるエントリーフィルタリング（/preferred/all）

**3.1** While `isAnyPreferred=true` が指定されている場合, the Entry API shall 少なくとも1つの嗜好スコアが `scoreThreshold` 以上のエントリーのみを返す。

**3.2** The preferred-all page shall `scoreThreshold` クエリパラメータが指定された場合、そのスコアをフィルタリングしきい値として使用する。

**3.3** When `scoreThreshold` クエリパラメータが指定されない場合, the preferred-all page shall AppSettings の `preferredScoreThreshold` をデフォルトしきい値として使用する。

**3.4** The preferred-all page shall `ScoreThresholdSlider` コンポーネントでスコアしきい値をページ内リアルタイムに調整できる。

**3.5** The preferred-all page shall `ReadFilter` コンポーネントで既読/未読フィルタリングができる。

---

### 4. 嗜好ごとのエントリーフィルタリング（/preferred/[id]）

**4.1** While `userPreferenceId` が指定されている場合, the Entry API shall 指定嗜好のスコアが `scoreThreshold` 以上のエントリーのみを返す。

**4.2** The preferred-[id] page shall 指定嗜好の `userPreferenceId` を使ってエントリーをフィルタリングする。

**4.3** The preferred-[id] page shall `ScoreThresholdSlider` コンポーネントでスコアしきい値をリアルタイムに調整できる。

**4.4** The preferred-[id] page shall `ReadFilter` コンポーネントで既読/未読フィルタリングができる。

**スコープ注記**: エントリー閲覧モーダル（ArticleModal）は entry-viewing フィーチャーが担当し、このフィーチャーでは EntryCardGrid を再利用して表示する。

---

### 5. エントリーAPIへの嗜好フィルター統合

**5.1** The Entry API shall `userPreferenceId` クエリパラメータを受け取り、指定嗜好に対してスコアフィルタリングを適用する。

**5.2** The Entry API shall `isAnyPreferred` クエリパラメータを受け取り、いずれかの嗜好スコアがしきい値以上のエントリーをフィルタリングする。

**5.3** The Entry API shall `scoreThreshold` クエリパラメータを受け取り、フィルタリングの数値しきい値として使用する。

**5.4** When `scoreThreshold` が未指定の場合, the Entry Service shall デフォルト値 0.5 を適用する。

---

### 6. 嗜好管理UI（/preferences ページ）

**6.1** The preferences page shall 登録済みの嗜好テキスト一覧と現在の `preferredScoreThreshold` を初期表示する。

**6.2** When ユーザーが「好みを追加」ボタンをクリックした場合, the preferences page shall テキスト入力フォームを表示し、テキスト入力後に嗜好を作成できる。

**6.3** When 嗜好テキストが空の状態で保存が試みられた場合, the preferences page shall エラーメッセージを表示する。

**6.4** When ユーザーが既存の嗜好の編集アイコンをクリックした場合, the preferences page shall その嗜好をインライン編集できるテキストエリアを表示する。

**6.5** When ユーザーが既存の嗜好の削除アイコンをクリックした場合, the preferences page shall その嗜好を削除してリストを更新する。

**6.6** The preferences page shall `preferredScoreThreshold` をスライダー（0.0〜1.0、ステップ 0.05）で調整し、「デフォルトとして保存」ボタンで AppSettings に永続化できる。

**6.7** While API リクエストが処理中の場合, the preferences page shall ローディングインジケータを表示して操作ボタンを無効化する。

**6.8** If API リクエストが失敗した場合, the preferences page shall エラーメッセージを表示する。

---

### 7. サイドバーの「お好みの記事」セクション

**7.1** The sidebar shall 「お好みの記事」セクションに `/preferred` へのリンクを常に表示する。

**7.2** When 嗜好が1件以上登録されている場合, the sidebar shall 「すべての好みに合う記事」（/preferred/all）と各嗜好テキストへのリンク（/preferred/[id]）を展開可能なリストとして表示する。

**7.3** When 嗜好が0件の場合, the sidebar shall 嗜好ごとのサブリンクを表示しない。

**7.4** The sidebar shall ページ読み込み時に `/api/preferences` から嗜好一覧を取得してセクションを構築する。

**7.5** The sidebar shall 現在のパスに対応するナビゲーションリンクをアクティブ状態で表示する。

---

### 8. /preferred インデックスページ

**8.1** The preferred-index page shall 登録済みの嗜好一覧を取得して、各嗜好へのリンクを表示する。

**8.2** When 嗜好が0件の場合, the preferred-index page shall /preferences ページへの誘導メッセージを表示する。

**8.3** When 嗜好が1件以上の場合, the preferred-index page shall 「すべての好みに合う記事」（/preferred/all）へのリンクと各嗜好ごとのリンクを表示する。
