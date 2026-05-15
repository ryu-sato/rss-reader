# RSS Reader - Feature Roadmap

This roadmap documents the existing implemented features for spec generation.
All features below are already built and should be documented as-is.

---

## Features

### feed-management
**Description**: RSS/Atom feed subscription management. Users can add feeds by URL, view and edit feed metadata (title, description, memo, favicon), delete feeds, and manually trigger a refresh of all feeds. Feed URLs are validated with SSRF protection before subscription. Up to 500 entries per feed are retained.

**Status**: Implemented
**Dependencies**: none

---

### entry-viewing
**Description**: Browse and read RSS entries with filtering, infinite scroll pagination, and a full-screen article modal. Supports filtering by feed, tag, read status, save-for-later, preference score, and free-text search. Modal supports keyboard shortcuts, swipe navigation on mobile, reading progress indicator, and prefetching of adjacent entries.

**Status**: Implemented
**Dependencies**: feed-management

---

### read-status
**Description**: Track per-entry read/unread status and save-for-later flag. Auto-marks entries as read when opened in modal. Link-based deduplication syncs read status across entries sharing the same URL. Provides a dedicated Read Later view filtered to saved unread items. Unread counts shown in sidebar per feed and in browser badge.

**Status**: Implemented
**Dependencies**: entry-viewing

---

### tag-management
**Description**: User-defined tags for organizing entries. Users can create tags, assign/remove them on individual entries within the article modal, bulk-assign a tag to multiple selected entries, rename tags, and delete tags (with cascade removal). Tag filter in entry list. Tag names are normalized to lowercase.

**Status**: Implemented
**Dependencies**: entry-viewing

---

### preference-recommendations
**Description**: User-defined preference texts (e.g. "machine learning", "Python") used to score and filter entries. Users manage preferences on the Preferences page. A configurable score threshold (0.0–1.0) determines what counts as "preferred". Entry list supports filtering by a single preference or by any preference (OR logic). Dedicated pages show preferred articles per preference or across all preferences.

**Status**: Implemented
**Dependencies**: entry-viewing

---

### digests
**Description**: Create, store, and manage digest documents (AI-generated or hand-written). Each digest has a title and markdown content. Digests are rendered with full markdown support (GFM tables, code blocks) and content sanitization. Supports CRUD operations and a cache-backed detail view. List view shows 50 digests per page.

**Status**: Implemented
**Dependencies**: none

---

### settings
**Description**: Application settings and personalization. Users can configure keyboard shortcuts for article navigation and actions (close modal, previous/next article, toggle read, save for later, open original). Shortcuts are stored in localStorage. A score threshold setting for preference-based filtering is stored server-side (AppSettings). Settings page provides reset-to-defaults for keyboard shortcuts.

**Status**: Implemented
**Dependencies**: preference-recommendations
