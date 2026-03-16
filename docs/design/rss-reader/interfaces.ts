/**
 * RSS Reader 型定義集約（逆生成）
 * 分析日時: 2026-03-16
 *
 * このファイルはコードベースから逆生成された型定義の集約です。
 * 実際の型定義は以下のファイルに分散して存在します:
 * - src/types/feed.ts
 * - src/types/entry.ts
 * - src/types/digest.ts
 */

// ======================
// エンティティ型定義
// ======================

export interface Feed {
  id: string;
  url: string;
  title: string;
  description: string | null;
  faviconUrl: string | null;
  memo: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastFetchedAt: Date | null;
}

export interface FeedListItem extends Feed {
  unreadCount: number;
  lastEntryPublishedAt: Date | null;
}

export interface Entry {
  id: string;
  feedId: string;
  guid: string;
  title: string;
  link: string;
  description: string | null;
  content: string | null;
  imageUrl: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EntryListItem extends Omit<Entry, "content"> {
  feed: {
    id: string;
    title: string;
    faviconUrl: string | null;
  };
  meta: EntryMeta | null;
  tags: TagOnEntry[];
}

export interface EntryDetail extends EntryListItem {
  content: string | null;
}

export interface EntryMeta {
  id: string;
  entryId: string;
  isRead: boolean;
  isReadLater: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tag {
  id: string;
  name: string; // lowercase正規化済み
  createdAt: Date;
}

export interface TagOnEntry {
  id: string;
  name: string;
}

export interface Digest {
  id: string;
  title: string | null;
  content: string; // Markdownテキスト
  createdAt: Date;
}

export type DigestListItem = Digest;

// ======================
// API リクエスト型
// ======================

export interface CreateFeedRequest {
  url: string;
}

export interface UpdateFeedRequest {
  title?: string;
  description?: string | null;
  memo?: string | null;
}

export interface UpdateEntryMetaRequest {
  isRead?: boolean;
  isReadLater?: boolean;
}

export interface CreateTagRequest {
  name: string;
  entryId: string;
}

export interface RenameTagRequest {
  name: string;
}

export interface CreateDigestRequest {
  title?: string | null;
  content: string;
}

export interface UpdateDigestRequest {
  title?: string | null;
  content?: string;
}

// ======================
// API クエリパラメータ型
// ======================

export interface GetEntriesQuery {
  feedId?: string;
  tagId?: string;
  search?: string;
  page?: number;
  limit?: number;
  afterId?: string;
  beforeId?: string;
  isReadLater?: boolean;
  isUnread?: boolean;
}

export interface GetDigestsQuery {
  page?: number;
  limit?: number;
}

// ======================
// API レスポンス型
// ======================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: Pagination;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export type GetFeedsResponse = ApiResponse<FeedListItem[]>;
export type GetFeedResponse = ApiResponse<Feed>;
export type CreateFeedResponse = ApiResponse<Feed>;
export type UpdateFeedResponse = ApiResponse<Feed>;
export type DeleteFeedResponse = ApiResponse<void>;

export type GetEntriesResponse = ApiResponse<PaginatedResponse<EntryListItem>>;
export type GetEntryResponse = ApiResponse<EntryDetail>;
export type UpdateEntryMetaResponse = ApiResponse<EntryMeta>;

export type GetTagsResponse = ApiResponse<
  (Tag & { _count: { entries: number } })[]
>;
export type CreateTagResponse = ApiResponse<Tag>;

export type GetDigestsResponse = ApiResponse<PaginatedResponse<DigestListItem>>;
export type GetDigestResponse = ApiResponse<Digest>;
export type CreateDigestResponse = ApiResponse<Digest>;
export type UpdateDigestResponse = ApiResponse<Digest>;
export type DeleteDigestResponse = ApiResponse<void>;

// ======================
// エラーコード型
// ======================

export type FeedErrorCode =
  | "INVALID_URL"
  | "SSRF_DETECTED"
  | "INVALID_FEED"
  | "FEED_ALREADY_EXISTS"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "INTERNAL_ERROR";

export type EntryErrorCode =
  | "NOT_FOUND"
  | "ENTRY_NOT_FOUND"
  | "VALIDATION_ERROR"
  | "INTERNAL_ERROR";

export type TagErrorCode =
  | "NOT_FOUND"
  | "TAG_ALREADY_EXISTS"
  | "VALIDATION_ERROR"
  | "INTERNAL_ERROR";

export type DigestErrorCode =
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "INTERNAL_ERROR";

// ======================
// 内部処理型
// ======================

/** rss-parserから取得したフィード情報 */
export interface FetchedFeedInfo {
  title: string;
  description: string | null;
  faviconUrl: string | null;
}

/** rss-parserから取得した記事データ */
export interface FetchedEntryData {
  guid: string;
  title: string;
  link: string;
  description: string | null;
  content: string | null;
  imageUrl: string | null;
  publishedAt: Date | null;
}

/** SSRF検証結果 */
export interface SSRFValidationResult {
  valid: boolean;
  error?: string;
}

/** Prismaへの作成入力型 */
export interface CreateFeedInput {
  url: string;
  title: string;
  description?: string | null;
  faviconUrl?: string | null;
}

export interface UpdateFeedInput {
  title?: string;
  description?: string | null;
  memo?: string | null;
}

export interface CreateEntryInput {
  feedId: string;
  guid: string;
  title: string;
  link: string;
  description?: string | null;
  content?: string | null;
  imageUrl?: string | null;
  publishedAt?: Date | null;
}

export interface UpdateEntryMetaInput {
  isRead?: boolean;
  isReadLater?: boolean;
}

// ======================
// コンポーネント Props 型
// ======================

export interface EntryCardProps {
  entry: EntryListItem;
  onClick?: (entryId: string) => void;
  onMetaUpdate?: (entryId: string, meta: Partial<EntryMeta>) => void;
}

export interface EntryModalProps {
  entryId: string;
  onClose: () => void;
  onNavigate?: (direction: "prev" | "next") => void;
}

export interface FeedFormProps {
  onSuccess?: (feed: Feed) => void;
}

export interface EditFeedFormProps {
  feed: Feed;
  onSuccess?: (feed: Feed) => void;
}

export interface DigestFormProps {
  digest?: Digest;
  onSuccess?: (digest: Digest) => void;
}

export interface TagInputProps {
  entryId: string;
  initialTags: TagOnEntry[];
  onTagsChange?: (tags: TagOnEntry[]) => void;
}

// ======================
// ブラウザカスタムイベント型
// ======================

export interface EntryReadEvent extends CustomEvent {
  detail: {
    entryId: string;
    feedId: string;
  };
}

export interface EntryUpdatedEvent extends CustomEvent {
  detail: {
    entryId: string;
    meta: Partial<EntryMeta>;
  };
}

export interface TagDeletedEvent extends CustomEvent {
  detail: {
    tagId: string;
  };
}

// イベント名定数
export const ENTRY_EVENTS = {
  READ: "entry:read",
  UNREAD: "entry:unread",
  UPDATED: "entry:updated",
} as const;

export const TAG_EVENTS = {
  DELETED: "tag:deleted",
} as const;
