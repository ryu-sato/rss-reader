# Brief: tag-management

## Problem

RSSエントリーをユーザー定義のタグで分類・整理したい。個別記事へのタグ付け、複数記事への一括タグ付け、タグによるフィルタリングが必要。

## Current State

実装済み。Tag・EntryTag モデルでタグ管理。単一エントリーへのタグ追加/削除、複数エントリーへの一括タグ付け、タグのリネーム・削除が動作。タグ名は小文字正規化。

## Desired Outcome

ユーザーがタグを作成し、記事モーダル内でタグを付与/除去できる。選択モードで複数記事を選んで一括タグ付けできる。タグでエントリーリストをフィルタリングできる。サイドバーでタグのリネーム・削除ができる。

## Approach

TagService + EntryTag 結合テーブル。`/api/tags/*` エンドポイント群。ArticleModal の TagInput コンポーネント、選択モードの BulkTagBar コンポーネント。

## Scope

- **In**: タグ作成（upsert）・一覧取得・リネーム・削除（カスケード）、単一エントリーへのタグ付与/除去、複数エントリーへの一括タグ付け（/api/tags/batch）、タグによるエントリーフィルタリング、タグ名の小文字正規化
- **Out**: エントリー閲覧モーダル全体（entry-viewing が担当）

## Boundary Candidates

- TagService（DB操作）
- Tag API Routes（/api/tags/*, /api/tags/batch）
- TagInput コンポーネント（モーダル内タグ編集UI）
- BulkTagBar コンポーネント（一括タグ付けツールバー）
- サイドバーのタグリスト（リネーム・削除UI）

## Out of Boundary

- エントリーリストUI・モーダル本体（entry-viewing が担当）
- 認証（better-auth が担当）

## Upstream / Downstream

- **Upstream**: entry-viewing（ArticleModal・EntryCardGrid を前提とする）
- **Downstream**: なし

## Existing Spec Touchpoints

- **Extends**: entry-viewing（ArticleModal にタグUI、EntryCardGrid に選択モード）
- **Adjacent**: entry-viewing（EntryTag モデルを共有）

## Constraints

- タグ名は保存前に小文字・トリム正規化すること
- タグ削除時は EntryTag も一緒に削除（カスケード）
- TypeScript strict モード
