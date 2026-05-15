# Project Structure

## Organization Philosophy

Hybrid approach: **folder-by-type** at the top level (`components/`, `lib/`, `types/`), **folder-by-feature** within the App Router (`app/feeds/`, `app/digests/`, `app/preferences/`). Business logic lives exclusively in the service layer; components and route handlers are kept thin.

## Directory Patterns

### App Router Pages & API
**Location**: `/src/app/`  
**Purpose**: Route segments, layouts, page components, and API route handlers  
**Pattern**: Feature folders contain `page.tsx`, `layout.tsx`, and optionally `route.ts`  
**Example**: `/src/app/feeds/page.tsx` (feed list page), `/src/app/api/feeds/route.ts` (REST endpoint)

### React Components
**Location**: `/src/components/`  
**Purpose**: All React components, split into primitives and feature components  
**Sub-patterns**:
- `/components/ui/` — design-system primitives (shadcn-based, no business logic)
- `/components/` root — feature components that may use services or context

### Service & Business Logic Layer
**Location**: `/src/lib/`  
**Purpose**: All data access, external API calls, and complex business logic  
**Pattern**: Files use `kebab-case` with `-service` suffix for data services, plain names for utilities  
**Example**: `feed-service.ts`, `entry-service.ts`, `ssrf-guard.ts`, `rss-fetcher.ts`

### Shared Types
**Location**: `/src/types/`  
**Purpose**: TypeScript interfaces and types shared across layers  
**Example**: `feed.ts`, `entry.ts` — define domain entities used by both service layer and components

### Generated Code
**Location**: `/src/generated/`  
**Purpose**: Auto-generated files (Prisma client) — never edit manually

## Naming Conventions

- **Component files**: PascalCase (`EntryCardGrid.tsx`, `SidebarProvider.tsx`)
- **Service/utility files**: kebab-case (`feed-service.ts`, `ssrf-guard.ts`)
- **API route files**: always `route.ts` within feature folder
- **Type files**: kebab-case matching domain noun (`feed.ts`, `entry.ts`)
- **Test files**: same name as source + `.test.tsx` / `.test.ts` suffix, co-located

## Import Organization

```typescript
// Always use path alias for cross-directory imports
import { FeedService } from '@/lib/feed-service'
import { Button } from '@/components/ui/button'
import type { Feed } from '@/types/feed'

// Relative imports only within the same directory
import { helper } from './helper'
```

**Path Aliases**:
- `@/` → `./src/` (configured in `tsconfig.json`)

## Code Organization Principles

- **Thin route handlers**: API routes in `/app/api/` delegate immediately to service functions
- **No business logic in components**: Components call services or server actions, never query DB directly
- **Service layer owns DB**: Only `/lib/*-service.ts` files import from Prisma client
- **Zod at boundaries**: Validate external input (API request bodies, form data) with Zod schemas before passing to services

---
_Document patterns, not file trees. New files following patterns shouldn't require updates_
