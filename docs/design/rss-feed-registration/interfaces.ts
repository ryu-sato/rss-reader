/**
 * RSSシードの登録 型定義
 *
 * 作成日: 2026-03-13
 * 関連設計: architecture.md
 *
 * 信頼性レベル:
 * - 🔵 青信号: EARS要件定義書・設計文書・ユーザヒアリングを参考にした確実な型定義
 * - 🟡 黄信号: EARS要件定義書・設計文書・ユーザヒアリングから妥当な推測による型定義
 * - 🔴 赤信号: EARS要件定義書・設計文書・ユーザヒアリングにない推測による型定義
 */

// ========================================
// エンティティ定義
// ========================================

/**
 * RSSフィードエンティティ
 * 🔵 信頼性: 要件定義 データモデル・ヒアリングQ5（保存情報選択）より
 */
export interface Feed {
  id: string; // 🔵 UUIDプライマリキー（DBスキーマより）
  url: string; // 🔵 RSSフィードURL（REQ-001, REQ-401）
  title: string; // 🔵 フィードタイトル自動取得（REQ-102）
  description: string | null; // 🔵 フィード説明自動取得（ヒアリングQ5）
  memo: string | null; // 🔵 ユーザー定義メモ（REQ-004, ヒアリングQ5）
  createdAt: Date; // 🔵 登録日時（REQ-003）
  updatedAt: Date; // 🔵 最終更新日時（REQ-003）
  lastFetchedAt: Date | null; // 🔵 最終フェッチ日時（note.mdデータモデルより）
}

/**
 * フィード一覧表示用 DTO
 * 🔵 信頼性: REQ-003（一覧表示項目）・ヒアリングQ7より
 */
export interface FeedListItem {
  id: string; // 🔵 操作用ID
  title: string; // 🔵 REQ-003より
  url: string; // 🔵 URLの表示（省略表示用）
  createdAt: Date; // 🔵 REQ-003: 登録日時
  updatedAt: Date; // 🔵 REQ-003: 最終更新日時
}

// ========================================
// APIリクエスト/レスポンス
// ========================================

/**
 * フィード登録リクエスト
 * 🔵 信頼性: REQ-001（URL入力フォーム）・API仕様より
 */
export interface CreateFeedRequest {
  url: string; // 🔵 登録するRSSフィードURL（2048文字以内）
}

/**
 * フィード更新リクエスト
 * 🔵 信頼性: REQ-104（フィード編集）・ヒアリングQ1より
 */
export interface UpdateFeedRequest {
  title?: string; // 🔵 更新するタイトル（省略可）
  description?: string | null; // 🔵 更新する説明（省略可、1000文字以内）
  memo?: string | null; // 🔵 更新するメモ（省略可、1000文字以内）
}

/**
 * フィード登録レスポンス
 * 🔵 信頼性: API仕様設計・REQ-102より
 */
export interface CreateFeedResponse {
  success: true;
  data: Feed;
}

/**
 * フィード一覧取得レスポンス
 * 🔵 信頼性: REQ-002（一覧表示）より
 */
export interface GetFeedsResponse {
  success: true;
  data: FeedListItem[];
}

/**
 * フィード単体取得レスポンス
 * 🔵 信頼性: API仕様設計より
 */
export interface GetFeedResponse {
  success: true;
  data: Feed;
}

/**
 * フィード更新レスポンス
 * 🔵 信頼性: REQ-104（編集）より
 */
export interface UpdateFeedResponse {
  success: true;
  data: Feed;
}

/**
 * フィード削除レスポンス
 * 🔵 信頼性: REQ-105（削除）より
 */
export interface DeleteFeedResponse {
  success: true;
}

/**
 * エラーレスポンス共通フォーマット
 * 🔵 信頼性: API設計・ヒアリングQ7（英語エラーメッセージ）より
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode; // 🔵 エラー種別コード
    message: string; // 🔵 英語エラーメッセージ（ヒアリングQ7）
  };
}

// ========================================
// エラーコード
// ========================================

/**
 * APIエラーコード一覧
 * 🔵 信頼性: 要件定義 REQ-103, REQ-106, REQ-107, EDGE-001・API設計より
 */
export type ErrorCode =
  | "FEED_ALREADY_EXISTS" // 🔵 REQ-103: 重複URL
  | "FEED_NOT_FOUND" // 🔵 404エラー
  | "INVALID_URL_FORMAT" // 🔵 REQ-402: URL形式エラー
  | "URL_NOT_ALLOWED" // 🔵 NFR-101: SSRF対策
  | "FEED_FETCH_FAILED" // 🔵 REQ-106: HTTP取得失敗
  | "INVALID_FEED_FORMAT" // 🔵 REQ-107: RSS/Atom形式エラー
  | "VALIDATION_ERROR" // 🟡 汎用バリデーションエラー
  | "INTERNAL_SERVER_ERROR"; // 🟡 サーバー内部エラー

// ========================================
// フォーム状態
// ========================================

/**
 * フィード登録フォームの状態
 * 🟡 信頼性: REQ-201（ローディング表示）・UX設計から推測
 */
export interface FeedFormState {
  isSubmitting: boolean; // 🔵 REQ-201: 送信中フラグ（ローディング表示用）
  error: string | null; // 🔵 エラーメッセージ表示用
  success: boolean; // 🟡 成功フラグ
}

// ========================================
// RSSフェッチャー内部型
// ========================================

/**
 * RSSフェッチャーの結果
 * 🔵 信頼性: REQ-102（フィード情報自動取得）・ヒアリングQ1より
 */
export interface FetchedFeedInfo {
  title: string; // 🔵 フィードタイトル（空の場合はURLをフォールバック: EDGE-003）
  description: string | null; // 🔵 フィード説明（存在しない場合null）
  lastFetchedAt: Date; // 🔵 取得日時
}

/**
 * SSRF検証結果
 * 🔵 信頼性: NFR-101（SSRF対策）・ヒアリングQ6より
 */
export interface SSRFValidationResult {
  isAllowed: boolean; // 🔵 アクセス許可フラグ
  reason?: string; // 🔵 拒否理由（isAllowed=falseの場合）
}

// ========================================
// Prisma関連の入力型（参考）
// ========================================

/**
 * Feed作成入力（Prisma createに渡す）
 * 🔵 信頼性: DBスキーマ・Prisma設計より
 */
export type CreateFeedInput = Omit<Feed, "id" | "createdAt" | "updatedAt">;

/**
 * Feed更新入力（Prisma updateに渡す）
 * 🔵 信頼性: DBスキーマ・REQ-104より
 */
export type UpdateFeedInput = Partial<
  Pick<Feed, "title" | "description" | "memo" | "lastFetchedAt">
>;

// ========================================
// 信頼性レベルサマリー
// ========================================
/**
 * - 🔵 青信号: 28件 (85%)
 * - 🟡 黄信号: 5件 (15%)
 * - 🔴 赤信号: 0件 (0%)
 *
 * 品質評価: 高品質
 */
