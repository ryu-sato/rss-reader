# Requirements Document

## Project Description (Input)

RSSフィードリーダーにおけるダイジェスト管理機能。AIが生成した、またはユーザーが手動で作成したRSS記事の要約文書（ダイジェスト）を、Markdown形式で作成・閲覧・編集・削除できる。GFMテーブル・コードブロックを含むリッチなMarkdownを、サニタイズされた状態でレンダリングする。一覧は50件/ページ表示。

## Requirements

### 1. ダイジェスト一覧

- 1.1: When ユーザーが `/digests` にアクセスする, the Digest機能 shall 作成日時の降順でダイジェストを最大50件表示する
- 1.2: When ダイジェストにタイトルが設定されている場合, the Digest機能 shall タイトルを一覧に表示し、その下に作成日時を表示する
- 1.3: When ダイジェストにタイトルが設定されていない場合, the Digest機能 shall 作成日時をタイトルの代わりに表示する
- 1.4: When ダイジェストが1件も存在しない場合, the Digest機能 shall 空状態メッセージと説明文を表示する
- 1.5: The Digest機能 shall 一覧ページのヘッダーにダイジェストの総件数と新規作成リンクを表示する

### 2. ダイジェスト作成

- 2.1: When ユーザーが作成フォームを送信する, the Digest機能 shall Markdownの本文（content）を必須フィールドとしてバリデーションする
- 2.2: When 本文が空の場合, the Digest機能 shall エラーメッセージをフォームに表示し、送信を中止する
- 2.3: When ダイジェストの作成が成功した場合, the Digest機能 shall 作成されたダイジェストの詳細ページへリダイレクトする
- 2.4: The Digest機能 shall タイトル（title）は任意フィールドとして扱い、未入力でも作成を許可する
- 2.5: When 作成中にサーバーエラーが発生した場合, the Digest機能 shall エラーメッセージをフォームに表示する

### 3. ダイジェスト詳細閲覧

- 3.1: When ユーザーが `/digests/:id` にアクセスする, the Digest機能 shall Markdownをレンダリングした詳細コンテンツを表示する
- 3.2: The Digest機能 shall GFM（GitHub Flavored Markdown）に準拠し、テーブル・コードブロック・チェックリストをレンダリングする
- 3.3: The Digest機能 shall すべてのMarkdownコンテンツをrehype-sanitizeでサニタイズしてからレンダリングする
- 3.4: When 指定されたIDのダイジェストが存在しない場合, the Digest機能 shall 404ページを返す
- 3.5: The Digest機能 shall 詳細ページのヘッダーに一覧へ戻るリンク・編集リンク・削除ボタンを表示する
- 3.6: The Digest機能 shall ダイジェストの詳細データをNext.jsのタグベースキャッシュで保持し、更新・削除時にキャッシュを無効化する

### 4. ダイジェスト編集

- 4.1: When ユーザーが編集フォームを送信する, the Digest機能 shall 変更された本文およびタイトルをDBに保存する
- 4.2: When 編集対象のダイジェストが存在しない場合, the Digest機能 shall 404ページを返す
- 4.3: When ダイジェストの編集が成功した場合, the Digest機能 shall 編集後のダイジェスト詳細ページへリダイレクトする
- 4.4: When 編集フォームを開く, the Digest機能 shall 既存のタイトルと本文を初期値としてフォームに表示する
- 4.5: When 編集が成功した場合, the Digest機能 shall 対象ダイジェストのキャッシュを無効化する

### 5. ダイジェスト削除

- 5.1: When ユーザーが削除ボタンをクリックする, the Digest機能 shall 確認ダイアログを表示する
- 5.2: When ユーザーが削除を確認した場合, the Digest機能 shall ダイジェストをDBから削除しダイジェスト一覧へリダイレクトする
- 5.3: When 削除対象のダイジェストが存在しない場合, the Digest機能 shall 404エラーを返す
- 5.4: When 削除が成功した場合, the Digest機能 shall 対象ダイジェストのキャッシュを無効化する

### 6. REST API

- 6.1: The Digest機能 shall `GET /api/digests` でページネーション付きのダイジェスト一覧を返す
- 6.2: The Digest機能 shall `POST /api/digests` で新しいダイジェストを作成し、201ステータスと作成データを返す
- 6.3: The Digest機能 shall `GET /api/digests/:id` で指定したダイジェストの詳細を返す
- 6.4: The Digest機能 shall `PATCH /api/digests/:id` でダイジェストを部分更新し、更新データを返す
- 6.5: The Digest機能 shall `DELETE /api/digests/:id` でダイジェストを削除し、successレスポンスを返す
- 6.6: If バリデーションエラーが発生した場合, the Digest機能 shall エラーコードとメッセージを含む400レスポンスを返す
- 6.7: If 対象リソースが存在しない場合, the Digest機能 shall 404レスポンスを返す
