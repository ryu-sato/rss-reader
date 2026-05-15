# Brief: feed-management

## Problem

RSSフィードを複数ソースから一元管理したいユーザーが、フィードの追加・編集・削除・手動更新を行う手段が必要。

## Current State

実装済み。フィードURLの登録・検証・メタデータ取得・保存・編集・削除・手動リフレッシュが動作している。

## Desired Outcome

ユーザーがフィードURLを登録すると、メタデータ（タイトル・説明・ファビコン）が自動取得され、エントリーが取得・保存される。フィードの編集・削除・リフレッシュも可能。

## Approach

Next.js API Routes + Prisma + rss-parser + ssrf-guard による実装。SSRF保護を通過したURLのみフェッチ許可。

## Scope

- **In**: フィードURL登録・バリデーション、フィードメタデータ取得・保存、フィード一覧・詳細・編集・削除、手動リフレッシュ（全フィード）、エントリー数上限管理（500件/フィード）
- **Out**: 認証、エントリー閲覧UI、定期自動更新スケジューラー（node-cronによる別機能）

## Boundary Candidates

- FeedService（DB操作）
- RssFetcher（フィード取得・パース）
- EntryFetcher（エントリー取得・OG画像抽出）
- SSRF Guard（URLバリデーション）
- Feed API Routes（/api/feeds/*)

## Out of Boundary

- エントリーの閲覧・フィルタリングUI（entry-viewing が担当）
- 認証・認可（better-auth が担当）
- 嗜好スコアリング（外部システム）

## Upstream / Downstream

- **Upstream**: better-auth（認証）、Prisma/LibSQL（DB）
- **Downstream**: entry-viewing、read-status、tag-management、preference-recommendations（いずれも Feed を参照）

## Existing Spec Touchpoints

- **Extends**: なし（独立したコアフィーチャー）
- **Adjacent**: entry-viewing（Feed モデルを共有）

## Constraints

- すべてのフィードURL取得は `ssrf-guard.ts` を経由すること
- フィードあたりのエントリー数は500件を上限とする（超過時は古いものを削除）
- TypeScript strict モード
