# Technology Stack

## Architecture

Full-stack Next.js application using the App Router pattern. Server Components handle data fetching; Client Components handle interactivity. コアドメイン層 `/src/domain/` と機能モジュール `/src/features/<機能>/lib/` がデータベースアクセスとビジネスロジックを担い、ルートハンドラとコンポーネントは薄く保つ。ドメインの定義は `domain-model.md`、ディレクトリ規約は `structure.md` を参照。

## Core Technologies

- **Language**: TypeScript (strict mode, no `any`)
- **Framework**: Next.js 16 with React 19 (App Router)
- **Runtime**: Node.js with standalone output
- **Database**: Prisma 7 ORM with LibSQL (Turso-compatible SQLite)
- **Auth**: better-auth with OIDC/OAuth support
- **Styling**: Tailwind CSS 4 + shadcn/ui component system

## Key Libraries

- **Validation**: 専用ライブラリは入れていない。境界での検証は素の TypeScript で書く（下記 Development Standards 参照）
- **RSS**: rss-parser for feed fetching and parsing
- **Content**: react-markdown + rehype-sanitize for safe rendering
- **Scheduling**: node-cron for periodic feed updates
- **PWA**: Serwist (Service Worker) for offline support
- **Environment**: dotenvx for multi-environment config management

## Development Standards

### Type Safety
- TypeScript strict mode enabled — all strict checks active
- Path alias `@/*` → `./src/*` for all non-relative imports
- 実行時検証は API ルートハンドラでの明示的な `typeof` / 空文字チェックで行う。Zod・react-hook-form は依存に含めていないので、新規実装で前提にしない

### Code Quality
- ESLint with Next.js core-web-vitals + TypeScript configs (flat config format)
- No `any` — use `unknown` and narrow types explicitly

### Testing
- **Framework**: Vitest 4 with jsdom environment and React Testing Library
- **Pattern**: テストスイート全体の実行前に一度だけ DB をリセットする（`vitest.setup.ts` の `beforeAll` で `prisma migrate reset`）。テストごとのリセットは CLI プロセス起動が件数分走って重いため行わない
- Tests co-located with source using `.test.tsx` / `.test.ts` suffix
- Run: `npm test` / `npm run test:coverage`

## Development Environment

### Common Commands
```bash
# Dev:   npm run dev
# Build: npm run build
# Test:  npm test
# DB:    npx prisma migrate dev
```

## Key Technical Decisions

- **App Router only**: No Pages Router — all routing via `/src/app/`
- **Server Components で初回取得、変更は API ルート経由**: 一覧などの初回データは Server Component が直接サービス層を呼ぶ。更新系は Server Actions ではなく `/api/*` のルートハンドラに `fetch` する（Server Actions は現時点で使っていない）
- **SSRF protection mandatory**: 外部 URL を取得する前に必ず `@/domain/shared/ssrf-guard` の `validateUrl()` を通す
- **Content sanitization**: All external HTML/Markdown rendered through rehype-sanitize — never use `dangerouslySetInnerHTML` with unsanitized content
- **File-based module cache**: Next.js memory cache disabled; file-based cache only (configured in `next.config.ts`)
- **Standalone + Cloudflare Tunnel**: `output: "standalone"` でビルドし、`docker-compose/compose.yaml` の app と cloudflared の 2 コンテナで公開する（リバースプロキシに nginx は使っていない）
- **スコアリングは外部プロセス**: 嗜好スコアは Python (`scripts/scoring/score_entries.py`) が算出して `EntryPreferenceScore` に書き込む。アプリ側はスコアを読むだけで、算出ロジックを持たない
- **`@types/node` tracks the devcontainer's Node major**: `.devcontainer/devcontainer.json`'s image tag pins the Node major (e.g. `typescript-node:4-24-trixie` → Node 24); `@types/node`'s major in `package.json` must match, per DefinitelyTyped's own guidance. Bumping the devcontainer image's Node major requires bumping `@types/node` too — it won't happen automatically.

---
_Document standards and patterns, not every dependency_
