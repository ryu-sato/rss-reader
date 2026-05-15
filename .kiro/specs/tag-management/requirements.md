# Requirements Document

## Project Description (Input)

RSSフィードリーダーにおけるタグ管理機能。ユーザー定義のタグでエントリーを分類・整理する。記事モーダル内でタグを付与/除去でき、選択モードで複数エントリーへの一括タグ付けも可能。タグはリネーム・削除（カスケード削除）ができ、サイドバーとエントリーリストでタグによるフィルタリングができる。タグ名は小文字に正規化される。

## Requirements

### 1. タグ名正規化

1.1. When ユーザーがタグ名を入力したとき、the Tag Management システム shall タグ名を保存前に小文字化（toLowerCase）とトリム（trim）によって正規化する。

1.2. The Tag Management システム shall 正規化されたタグ名をユニーク制約のキーとして使用し、大文字小文字を問わず同一名称のタグが重複して作成されないようにする。

---

### 2. タグの作成（upsert）

2.1. When ユーザーが特定のエントリーに新しいタグ名を入力して追加操作を行ったとき、the Tag Management システム shall 同名タグが既存でなければ新規作成し、既存であればそのタグを返す（upsert）。

2.2. When タグが作成またはエントリーへの割り当てが行われたとき、the Tag Management システム shall `POST /api/tags` を呼び出し、成功時にそのタグを呼び出し元に返す。

2.3. If `POST /api/tags` のリクエストボディに `name` または `entryId` が含まれていないとき、the Tag Management システム shall `VALIDATION_ERROR` コードと HTTP 400 を返す。

2.4. If `POST /api/tags` で指定された `entryId` に対応するエントリーが存在しないとき、the Tag Management システム shall `ENTRY_NOT_FOUND` コードと HTTP 404 を返す。

---

### 3. タグ一覧取得

3.1. When タグ一覧の取得が要求されたとき、the Tag Management システム shall `GET /api/tags` を通じてすべてのタグを名前の昇順で返す。

3.2. The Tag Management システム shall サイドバーが初期表示されたときに `GET /api/tags` を呼び出し、タグリストをサイドバーに表示する。

3.3. While サイドバーにタグが存在するとき、the Tag Management システム shall タグを折りたたみ可能なセクションに一覧表示する。

---

### 4. タグのリネーム

4.1. When ユーザーがサイドバーのタグのリネーム操作（鉛筆アイコンクリック、または Enterキー確定）を実行したとき、the Tag Management システム shall `PATCH /api/tags/:tagId` を呼び出し、タグ名を更新する。

4.2. When タグリネームが成功したとき、the Tag Management システム shall サイドバーのタグリストに更新された名前を反映する。

4.3. If リネーム時に `name` が空文字またはホワイトスペースのみのとき、the Tag Management システム shall `VALIDATION_ERROR` コードと HTTP 400 を返す。

---

### 5. タグの削除

5.1. When ユーザーがサイドバーのタグの削除操作（ゴミ箱アイコンクリック）を実行したとき、the Tag Management システム shall `DELETE /api/tags/:tagId` を呼び出し、タグおよび関連するすべての `EntryTag` レコードを削除する（カスケード削除）。

5.2. When タグ削除が成功したとき、the Tag Management システム shall サイドバーのタグリストから当該タグを除去する。

5.3. When ユーザーが現在フィルタリング中のタグが削除されたとき、the Tag Management システム shall ホーム画面（`/`）にリダイレクトする。

5.4. When タグ削除が成功したとき、the Tag Management システム shall `tag:deleted` カスタムイベントを発火し、他のコンポーネントがタグリストを更新できるようにする。

---

### 6. 単一エントリーへのタグ付与と除去

6.1. When ユーザーが記事モーダル内の TagInput コンポーネントでタグ名を入力して Enter キーを押すか「Add」ボタンをクリックしたとき、the Tag Management システム shall `POST /api/tags` を呼び出してタグをエントリーに付与する。

6.2. When タグが正常に付与されたとき、the Tag Management システム shall TagInput の表示タグリストを即座に更新し、入力フィールドをクリアする。

6.3. When ユーザーが TagInput で入力中のとき、the Tag Management システム shall 入力文字列に部分一致する既存タグのサジェスト一覧を表示する（未割り当てタグのみ）。

6.4. When ユーザーがサジェストからタグを選択したとき、the Tag Management システム shall そのタグをエントリーに付与する。

6.5. When ユーザーが TagInput で付与済みタグの削除ボタン（×）をクリックしたとき、the Tag Management システム shall `DELETE /api/tags/:tagId/entries/:entryId` を呼び出してエントリーからタグを除去する。

6.6. When タグの付与または除去が完了したとき、the Tag Management システム shall `entry:tags-updated` カスタムイベントを発火し、プリフェッチキャッシュを無効化する。

---

### 7. 複数エントリーへの一括タグ付け

7.1. When ユーザーがエントリーカードグリッドで選択モードに入り、複数のエントリーを選択したとき、the Tag Management システム shall 画面下部に BulkTagBar を表示する。

7.2. While BulkTagBar が表示されているとき、the Tag Management システム shall 選択中のエントリー件数、タグ名入力フィールド、既存タグのサジェスト一覧、および「タグを付ける」ボタンを提供する。

7.3. When ユーザーが BulkTagBar でタグ名を入力して「タグを付ける」ボタンをクリックしたとき、the Tag Management システム shall `POST /api/tags/batch` を呼び出し、選択されたすべてのエントリーに一括でタグを付与する。

7.4. When `POST /api/tags/batch` が成功したとき、the Tag Management システム shall `entry:tags-updated` カスタムイベントを発火してプリフェッチキャッシュを無効化し、適用完了のフィードバックを 2.5 秒間表示する。

7.5. If `POST /api/tags/batch` のリクエストボディに `name` が空または `entryIds` が空配列のとき、the Tag Management システム shall `VALIDATION_ERROR` コードと HTTP 400 を返す。

7.6. When 一括タグ付けが実行されるとき、the Tag Management システム shall タグの upsert と EntryTag の一括挿入をアトミックに処理し、既に付与済みのエントリーには重複して追加しない（`INSERT OR IGNORE`）。

7.7. While BulkTagBar が表示されているとき、the Tag Management システム shall 全選択・選択解除・選択モード終了の操作を提供する。

---

### 8. タグによるエントリーフィルタリング

8.1. When ユーザーがサイドバーのタグをクリックしたとき、the Tag Management システム shall URLの `tagId` クエリパラメータを更新してそのタグでフィルタリングされたエントリー一覧を表示する。

8.2. When `tagId` クエリパラメータが指定されたエントリー一覧取得要求に対して、the Tag Management システム shall 指定されたタグが付与されたエントリーのみを返す。

8.3. While タグフィルターが適用されているとき、the Tag Management システム shall サイドバーのそのタグ項目をアクティブ状態（ハイライト表示）にする。

8.4. When タグフィルター適用中にエントリーが存在しないとき、the Tag Management システム shall 空状態のメッセージを表示する（エントリー閲覧機能の空状態表示と連携）。

---

### 9. エラーハンドリングと非機能要件

9.1. If タグ操作（付与・除去・一括付与）中に API エラーが発生したとき、the Tag Management システム shall ローディング状態を解除し、操作前の表示状態を維持する。

9.2. While タグ操作の API 呼び出しが進行中のとき、the Tag Management システム shall 対象の TagInput または BulkTagBar の入力を無効化（disabled）する。

9.3. The Tag Management システム shall TypeScript strict モードに準拠し、`any` 型を使用しない。

9.4. The Tag Management システム shall タグ名の正規化（要件 1.1）をサービス層とバッチ API の両方で一貫して適用する。

---

### 境界の明確化

**このスペックが所有する機能**:
- TagService（DB操作: upsert・remove・getAll・rename・delete）
- `/api/tags` API ルート群（GET・POST）
- `/api/tags/:tagId` API ルート（PATCH・DELETE）
- `/api/tags/:tagId/entries/:entryId` API ルート（DELETE）
- `/api/tags/batch` API ルート（POST）
- TagInput コンポーネント（記事モーダル内タグ編集UI）
- BulkTagBar コンポーネント（一括タグ付けツールバー）
- サイドバーのタグリスト表示・リネーム・削除UI（`Sidebar` コンポーネント内タグセクション）

**このスペックが所有しない機能**:
- EntryCardGrid の選択モード UI（entry-viewing が担当。BulkTagBar の呼び出し側）
- ArticleModal の本体UI（entry-viewing が担当。TagInput の呼び出し側）
- `GET /api/entries?tagId=...` のフィルタリングロジック（entry-viewing が担当）
- 認証・認可（better-auth が担当）
