# RSS Reader - Specification Roadmap

## Overview

セルフホスト型RSSフィードリーダーの既存実装をスペックとして文書化するプロジェクト。
Next.js 16 App Router + TypeScript strict + Prisma/LibSQL で構築されており、セキュリティ（SSRF保護・コンテンツサニタイズ・OIDC認証）を重視した設計。

## Approach Decision

- **Chosen**: 既存実装からの逆引きスペック生成
- **Why**: 実装済みの機能を構造化されたスペックとして記録し、今後の機能追加・保守の基盤とする
- **Rejected alternatives**: 新規フィーチャーからのグリーンフィールド設計（実装済みのため不要）

## Scope

- **In**: フィード管理、エントリー閲覧、既読管理、タグ管理、設定、ダイジェスト、嗜好レコメンデーション
- **Out**: 認証システム（better-auth に委譲）、スコアリングエンジン（外部システム）、デプロイインフラ

## Constraints

- TypeScript strict モード必須
- すべてのフィードURL取得は `ssrf-guard.ts` を経由すること
- コンテンツレンダリングは rehype-sanitize によるサニタイズ必須
- `@/*` パスエイリアス（`./src/*` へのマッピング）を使用

## Boundary Strategy

- **Why this split**: ドメインごとの責務が明確に分離されており、各フィーチャーは独立したサービス層・API・UIを持つ
- **Shared seams to watch**: EntryMeta（read-status と entry-viewing の境界）、AppSettings（settings と preference-recommendations の境界）

## Specs (dependency order)

- [x] feed-management -- RSSフィードの購読・管理・更新機能。Dependencies: none
- [x] digests -- ダイジェスト（要約文書）のCRUD管理機能。Dependencies: none
- [x] entry-viewing -- エントリー一覧・フィルタリング・モーダル閲覧機能。Dependencies: feed-management
- [x] read-status -- 既読/未読管理とあとで読む機能。Dependencies: entry-viewing
- [x] tag-management -- タグの作成・割り当て・フィルタリング機能。Dependencies: entry-viewing
- [x] preference-recommendations -- 嗜好定義とスコアベースのレコメンデーション機能。Dependencies: entry-viewing
- [x] settings -- キーボードショートカット設定とアプリ設定管理機能。Dependencies: preference-recommendations
