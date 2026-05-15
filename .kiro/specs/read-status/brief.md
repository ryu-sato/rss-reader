# Brief: read-status

## Problem

RSSエントリーの既読/未読状態を管理し、あとで読むリストを持ちたい。同じURLのエントリーが複数フィードに存在する場合も一元管理したい。

## Current State

実装済み。EntryMeta モデルで isRead/isReadLater フラグを管理。リンクベースのデデュプリケーションで同一URL記事の既読状態を同期。

## Desired Outcome

モーダルで記事を開くと自動的に既読化される。手動で既読/未読を切り替えられる。あとで読むフラグのトグルができる。同じURLの記事は既読状態が同期される。専用の「あとで読む」ページがある。

## Approach

EntryMeta テーブルによるフラグ管理。`/api/entries/[id]/meta` PUT エンドポイント。リンクベースシブリング同期。

## Scope

- **In**: isRead/isReadLater フラグの更新API・UI、モーダル開封時自動既読化、リンクベースシブリング同期、あとで読む一覧ページ、サイドバーの未読数バッジ、ブラウザ/PWAバッジ通知
- **Out**: エントリー一覧の表示・フィルタリングUI（entry-viewing が担当）、フィードごとの未読カウント表示（entry-viewing が担当）

## Boundary Candidates

- EntryService.updateEntryMeta（リンクベース同期を含む）
- `/api/entries/[id]/meta` PUT エンドポイント
- `/api/entries/read-later-unread-count` GET エンドポイント
- ArticleModal の既読トグルUI
- `/read-later` ページ

## Out of Boundary

- エントリー閲覧モーダル全体（entry-viewing が担当）
- タグ管理（tag-management が担当）

## Upstream / Downstream

- **Upstream**: entry-viewing（Article Modal から呼び出される）
- **Downstream**: sidebar（未読数カウント表示）

## Existing Spec Touchpoints

- **Extends**: entry-viewing（ArticleModal のツールバーにUIを追加）
- **Adjacent**: entry-viewing（EntryMeta モデルを共有）

## Constraints

- isRead 更新時は同一リンクを持つ全エントリーに伝播すること
- TypeScript strict モード
