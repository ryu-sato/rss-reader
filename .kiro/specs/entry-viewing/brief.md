# Brief: entry-viewing

## Problem

複数フィードからのRSSエントリーを効率よく閲覧・フィルタリングしたい。記事を素早くスキャンし、興味あるものをモーダルで全文読みたい。

## Current State

実装済み。エントリー一覧（無限スクロール）・フィルタリング・モーダル閲覧・キーボードショートカット・スワイプナビゲーションが動作している。

## Desired Outcome

ホーム画面でフィード・タグ・テキスト検索・既読状態でエントリーをフィルタリングし、カード一覧から記事モーダルを開いて全文閲覧・前後ナビゲーションができる。

## Approach

React Server Components + Client Components。EntryCardGrid でカーソルベースページネーション（20件/ページ）、ArticleModal で前後エントリープリフェッチ。

## Scope

- **In**: エントリー一覧API・UI（フィルタリング・ページネーション・検索）、ArticleModal（全文表示・前後ナビ・スワイプ）、キーボードショートカット、読み込み進捗バー、URLデデュプリケーション、モーダル開封時の自動既読化
- **Out**: 既読フラグ管理のビジネスロジック（read-status が担当）、タグ割り当てUI（tag-management が担当）

## Boundary Candidates

- EntryService（DB操作・カーソルページネーション）
- Entry API Routes（/api/entries/*)
- EntryCardGrid コンポーネント
- EntryCard コンポーネント
- ArticleModal コンポーネント
- EntryFilterBar コンポーネント

## Out of Boundary

- EntryMeta の isRead/isReadLater フラグ更新（read-status が担当）
- タグの割り当て・管理（tag-management が担当）
- 嗜好スコアによるフィルタリングロジック（preference-recommendations が担当）

## Upstream / Downstream

- **Upstream**: feed-management（Feed・Entry モデル）
- **Downstream**: read-status、tag-management、preference-recommendations（いずれもエントリー表示を前提とする）

## Existing Spec Touchpoints

- **Extends**: feed-management（Entry は Feed に属する）
- **Adjacent**: read-status（EntryMeta を共有）、tag-management（EntryTag を共有）

## Constraints

- カーソルベースページネーションでモーダルナビゲーションの安定性を維持すること
- モーダルは動的インポート（SSRなし）
- TypeScript strict モード
