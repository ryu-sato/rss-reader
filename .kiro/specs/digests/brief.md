# Brief: digests

## Problem

AIが生成した、またはユーザーが手動で作成したRSS記事の要約文書を保存・閲覧・管理したい。

## Current State

実装済み。ダイジェストのCRUD（作成・一覧・詳細・編集・削除）が動作している。Markdownレンダリングとサニタイズも実装済み。

## Desired Outcome

ユーザーがMarkdown形式でダイジェストを作成・編集・削除でき、GFMテーブル・コードブロックを含むリッチな文書をサニタイズされた状態で閲覧できる。

## Approach

Next.js Pages + Server Actions + Prisma の Digest モデル。react-markdown + remark-gfm + rehype-sanitize でレンダリング。

## Scope

- **In**: ダイジェスト作成・一覧（50件/ページ）・詳細閲覧・編集・削除、Markdownレンダリング（GFM対応）、コンテンツサニタイズ、キャッシュ対応詳細取得
- **Out**: AIによる自動生成ロジック、エントリーとの関連付け

## Boundary Candidates

- DigestService（DB操作・キャッシュ）
- Digest API/Pages（/digests/*)
- DigestForm コンポーネント
- DeleteDigestButton コンポーネント

## Out of Boundary

- AIスコアリング・要約生成（外部システム）
- フィードエントリーとの直接リンク

## Upstream / Downstream

- **Upstream**: Prisma/LibSQL（DB）
- **Downstream**: なし（独立した文書機能）

## Existing Spec Touchpoints

- **Extends**: なし
- **Adjacent**: なし（feed-management とは独立）

## Constraints

- すべてのMarkdown表示は rehype-sanitize を通じてサニタイズすること
- TypeScript strict モード
