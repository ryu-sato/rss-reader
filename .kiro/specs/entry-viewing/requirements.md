# Requirements Document

## Project Description (Input)

RSSフィードリーダーにおけるエントリー閲覧機能。ホーム画面でフィード・タグ・テキスト検索・既読状態・嗜好スコアによるフィルタリングを行い、無限スクロール（20件/ページ、カーソルベースページネーション）でエントリーを一覧表示する。記事モーダル（ArticleModal）で全文を表示し、キーボードショートカット・スワイプジェスチャーで前後ナビゲーションができる。モーダル開封時に自動既読化。同一URLエントリーのURLデデュプリケーションを行う。

## Requirements

---

### 1. エントリー一覧表示

**1.1** The EntryCardGrid shall display RSS entries as a responsive card grid (1–4 columns depending on viewport width), showing each entry's title, feed name, publication date, and thumbnail image.

**1.2** When no entries match the current filter state, the EntryCardGrid shall display an empty-state message appropriate to the active filter (未読なし・あとで読む未登録・記事なし など).

**1.3** The EntryCardGrid shall visually distinguish unread entries from read entries by rendering read entries at reduced opacity and omitting the unread accent stripe.

**1.4** When the entry count is known, the home page header shall display the total number of matching entries.

---

### 2. 無限スクロール・ページネーション

**2.1** While the user scrolls toward the bottom of the entry list, the EntryCardGrid shall automatically fetch the next page of entries (20件/ページ) and append them without page reload.

**2.2** The EntryCardGrid shall use an IntersectionObserver sentinel element placed below the last card, triggering `loadMore` when the sentinel enters the viewport with a 200px root margin.

**2.3** If the fetched next page contains entry IDs already present in the current list, the EntryCardGrid shall deduplicate by ID before appending.

**2.4** While additional entries are loading, the EntryCardGrid shall display a loading spinner below the card grid.

**2.5** When all pages have been fetched (`hasNext === false`), the EntryCardGrid shall not attempt further fetches regardless of scroll position.

---

### 3. エントリー検索

**3.1** When the user types in the title search field, the EntryFilterBar shall update the `search` URL query parameter after a 300ms debounce delay.

**3.2** The EntryFilterBar shall suppress search parameter updates during IME composition (日本語入力中) and apply the debounce only after `compositionend`.

**3.3** When the URL `search` parameter changes due to browser back/forward navigation, the EntryFilterBar shall synchronize the search input field to reflect the current URL state.

**3.4** When the user clicks the clear (×) button in the search field, the EntryFilterBar shall immediately clear the search input and remove the `search` URL query parameter.

---

### 4. エントリーフィルタリング

**4.1** The EntryFilterBar shall provide a feed selector that filters entries to a single feed by setting the `feedId` URL query parameter; selecting "すべてのフィード" removes the parameter.

**4.2** When one or more tags exist, the EntryFilterBar shall provide a tag selector that filters entries by tag using the `tagId` URL query parameter.

**4.3** The home page header shall provide a read-status toggle (未読 / すべて) that sets or removes the `filter` URL query parameter, causing the entry list to show only unread entries or all entries respectively.

**4.4** The home page header shall provide a sort order toggle (新しい順 / 古い順) that sets the `sortOrder` URL query parameter.

**4.5** When any of feedId, tagId, or search filters are active, the EntryFilterBar shall display a "クリア" button that removes all three filter parameters simultaneously.

**4.6** The Entry API shall accept a `userPreferenceId` query parameter and return only entries whose preference score for that preference meets or exceeds the configured threshold (default 0.5).

**4.7** The Entry API shall accept an `isAnyPreferred` query parameter and return only entries that have at least one preference score meeting or exceeding the threshold.

---

### 5. ArticleModal 全文表示

**5.1** When the user clicks an entry card, the EntryCardGrid shall open the ArticleModal for that entry and update the URL with the `entryId` query parameter using `history.pushState` (not Next.js router navigation).

**5.2** The ArticleModal shall be loaded via dynamic import with SSR disabled, so it is not included in the server-rendered HTML.

**5.3** While the entry detail is loading, the ArticleModal shall display a skeleton placeholder that matches the layout of the loaded article (title, metadata, image, body).

**5.4** When entry detail data is available, the ArticleModal shall display the article title (as a link to the original URL), feed name, publication date, thumbnail image (if present), and full article body.

**5.5** The ArticleModal shall render the article body as plain text (using `whitespace-pre-wrap`), displaying `content` if available, otherwise falling back to `description`.

**5.6** The ArticleModal shall display a reading progress bar at the top of the content area that advances as the user scrolls through the article.

**5.7** When the user clicks the backdrop area outside the modal, the ArticleModal shall close and remove the `entryId` URL parameter.

**5.8** When the ArticleModal closes, the EntryCardGrid shall clear the nav snapshot, prefetch cache, and pending navigation state.

**5.9** The ArticleModal shall support opening external article links in the default browser on iOS PWA standalone mode, using `window.open()` instead of `<a target="_blank">`.

---

### 6. モーダルナビゲーション

**6.1** When the ArticleModal is open, the EntryCardGrid shall snapshot the current entry list into a separate navigation list (`navEntries`) that remains stable regardless of subsequent read/unread state changes.

**6.2** When the ArticleModal is open and a previous entry exists in navEntries, the ArticleModal shall display a "前の記事" (previous) button; when a next entry exists or more pages are available, it shall display a "次の記事" (next) button.

**6.3** When the user activates the previous or next navigation, the ArticleModal shall update the displayed entry and push the new `entryId` to the browser history.

**6.4** When the user presses the browser back or forward button, the EntryCardGrid shall detect the `popstate` event and update the displayed entry to match the `entryId` URL parameter.

**6.5** When navigating to the last entry in navEntries and more pages exist, the EntryCardGrid shall proactively fetch the next navigation page (`loadNavMore`) and set a pending flag to navigate automatically when the fetch completes.

**6.6** The ArticleModal shall support swipe-left (next) and swipe-right (previous) gestures with a 60px threshold; the panel shall translate horizontally during the swipe and snap back with a 200ms ease transition upon release.

**6.7** The swipe gesture detection shall distinguish horizontal swipes from vertical scrolls and shall not activate when the pointer originates from an interactive element (button, link, input, textarea).

**6.8** The ArticleModal shall support the following keyboard shortcuts (configurable via hotkey settings): Escape (close), ArrowLeft (previous), ArrowRight (next), F (あとで読む toggle), M (既読/未読 toggle), O (open original URL).

---

### 7. 自動既読化

**7.1** When the ArticleModal loads an entry that is not yet marked as read, the system shall automatically call `PUT /api/entries/:id/meta` with `{ isRead: true }` and dispatch a `entry:read` custom event on the window.

**7.2** When an entry is marked as read (either by auto-read or user action in the modal), the EntryCardGrid shall update the visual read state of the corresponding card in the entry list.

**7.3** When an entry is marked as unread from the modal toolbar, the EntryCardGrid shall update the visual unread state of the corresponding card.

---

### 8. URLデデュプリケーション

**8.1** When the entry list is fetched without a `feedId` filter and without cursor-based pagination parameters, the Entry Service shall return entries deduplicated by `link` URL, selecting the most representative entry per unique link.

**8.2** The Entry Service shall use the `effectedDate` field for sort ordering in deduplicated mode to ensure stable ordering.

**8.3** If a newly saved entry shares a `link` URL with an existing entry that already has `isRead: true` in its EntryMeta, the Entry Service shall automatically create an EntryMeta record for the new entry with `isRead: true`.

---

### 9. 隣接エントリープリフェッチ

**9.1** While the ArticleModal is open, the EntryCardGrid shall proactively fetch `/api/entries/:id` for the immediately preceding and following entries in navEntries and store the responses in a prefetch cache.

**9.2** When the ArticleModal navigates to an entry whose detail is already in the prefetch cache, the modal shall use the cached data instead of making a new API request.

**9.3** If an entry's tags are updated (via `entry:tags-updated` event), the EntryCardGrid shall invalidate that entry's prefetch cache entry so the next navigation fetches fresh data.

**9.4** When the ArticleModal closes, the EntryCardGrid shall clear the entire prefetch cache.

---

### 10. エントリー詳細 API

**10.1** The Entry API shall expose `GET /api/entries` accepting query parameters: `feedId`, `tagId`, `search`, `page`, `limit`, `afterId`, `beforeId`, `isReadLater`, `isUnread`, `userPreferenceId`, `isAnyPreferred`, `sortOrder`, `scoreThreshold`.

**10.2** If the `page` query parameter is present but not a positive integer, the Entry API shall return HTTP 400 with error code `VALIDATION_ERROR`.

**10.3** The Entry API shall expose `GET /api/entries/:id` returning the full entry detail including feed name, meta (isRead, isReadLater), and associated tags.

**10.4** If the requested entry ID does not exist, `GET /api/entries/:id` shall return HTTP 404 with error code `ENTRY_NOT_FOUND`.

**10.5** The Entry API response for list endpoints shall include a `pagination` object with `page`, `limit`, `total`, `hasNext`, and `hasPrev` fields.

---

### 11. 一括タグ付け

**11.1** The EntryCardGrid shall provide a "一括タグ付け" (batch tag) mode toggle button. When activated, clicking an entry card shall toggle that entry's selection state instead of opening the modal.

**11.2** While in batch tag mode, the EntryCardGrid shall display a BulkTagBar at the bottom of the screen showing the count of selected entries, a tag input, and controls to select all, clear selection, or exit the mode.

**11.3** When the user applies a tag in batch mode, the system shall call `POST /api/tags/batch` with the selected entry IDs and dispatch an `entry:tags-updated` event.

---

## Boundary Notes

本フィーチャーは以下を**スコープ外**とする：
- `isRead` / `isReadLater` フラグのビジネスロジック（read-status フィーチャーが担当）
- タグの作成・削除・一覧管理（tag-management フィーチャーが担当）
- 嗜好スコアの計算・更新（preference-recommendations フィーチャーが担当）
- フィードの登録・削除・更新（feed-management フィーチャーが担当）
