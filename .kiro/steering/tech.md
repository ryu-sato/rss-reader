# Technology Stack

## Architecture

Full-stack Next.js application using the App Router pattern. Server Components handle data fetching; Client Components handle interactivity. A service layer in `/src/lib/` encapsulates all database and business logic, keeping route handlers and components thin.

## Core Technologies

- **Language**: TypeScript (strict mode, no `any`)
- **Framework**: Next.js 16 with React 19 (App Router)
- **Runtime**: Node.js with standalone output
- **Database**: Prisma 7 ORM with LibSQL (Turso-compatible SQLite)
- **Auth**: better-auth with OIDC/OAuth support
- **Styling**: Tailwind CSS 4 + shadcn/ui component system

## Key Libraries

- **Validation**: Zod 4 + react-hook-form for all form inputs
- **RSS**: rss-parser for feed fetching and parsing
- **Content**: react-markdown + rehype-sanitize for safe rendering
- **Scheduling**: node-cron for periodic feed updates
- **PWA**: Serwist (Service Worker) for offline support
- **Environment**: dotenvx for multi-environment config management

## Development Standards

### Type Safety
- TypeScript strict mode enabled — all strict checks active
- Path alias `@/*` → `./src/*` for all non-relative imports
- Zod schemas are the source of truth for runtime validation

### Code Quality
- ESLint with Next.js core-web-vitals + TypeScript configs (flat config format)
- No `any` — use `unknown` and narrow types explicitly

### Testing
- **Framework**: Vitest 4 with jsdom environment and React Testing Library
- **Pattern**: Database reset before each test (`beforeEach` in `vitest.setup.ts`)
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
- **Server-first data fetching**: Prefer Server Components + server actions over client-side fetch where possible
- **SSRF protection mandatory**: All feed URL fetches pass through `ssrf-guard.ts` before making HTTP requests
- **Content sanitization**: All external HTML/Markdown rendered through rehype-sanitize — never use `dangerouslySetInnerHTML` with unsanitized content
- **File-based module cache**: Next.js memory cache disabled; file-based cache only (configured in `next.config.ts`)

---
_Document standards and patterns, not every dependency_
