# Product Overview

Self-hosted RSS feed reader web application that aggregates and presents RSS content through a modern, secure interface. Built for individual users who want a centralized, privacy-respecting feed reader.

## Core Capabilities

- **Feed Management**: Register, edit, and delete RSS feed URLs with validation and SSRF protection
- **Content Aggregation**: Parse and store RSS entries from registered feeds with scheduled updates
- **Secure Authentication**: OAuth/OIDC-based authentication via better-auth
- **Rich Reading Experience**: Markdown rendering with sanitization, dark mode, responsive layout
- **Organizing**: ユーザー定義タグでの分類、既読 / あとで読むの管理、嗜好テキストとスコアしきい値による「好みの記事」の絞り込み
- **Self-Hosted Deployment**: Docker Compose（アプリ + cloudflared トンネル）でのデプロイ。フィード取得は毎正時、嗜好スコアリングは毎時 30 分に cron で自動実行

## Target Use Cases

- Personal RSS aggregation from multiple sources in one place
- Self-hosted alternative to cloud RSS services with full data ownership
- Digest-style reading with organized feed browsing

## Value Proposition

Security-first self-hosted RSS reader: SSRF guards on feed URLs, sanitized content rendering, and OIDC authentication make it suitable for production deployment without trusting external services.

---
_Focus on patterns and purpose, not exhaustive feature lists_
