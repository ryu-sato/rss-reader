/**
 * アプリケーション共通のエラー表現。
 *
 * ErrorCode は API レスポンスの `error.code` としてそのまま外に出るため、
 * 機能側の型ファイルではなくドメイン共有層に置き、定義を 1 か所に保つ。
 */
export type ErrorCode =
  | 'FEED_ALREADY_EXISTS'
  | 'FEED_NOT_FOUND'
  | 'INVALID_URL_FORMAT'
  | 'URL_NOT_ALLOWED'
  | 'FEED_FETCH_FAILED'
  | 'INVALID_FEED_FORMAT'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_SERVER_ERROR'
  | 'ENTRY_NOT_FOUND'
  | 'TAG_NOT_FOUND'
  | 'DIGEST_NOT_FOUND'

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly statusCode: number = 400
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('FEED_ALREADY_EXISTS', message, 409)
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super('FEED_NOT_FOUND', message, 404)
  }
}

export class FeedFetchError extends AppError {
  constructor(message: string) {
    super('FEED_FETCH_FAILED', message, 422)
  }
}

export class InvalidFeedFormatError extends AppError {
  constructor(message: string) {
    super('INVALID_FEED_FORMAT', message, 422)
  }
}

export class SSRFError extends AppError {
  constructor(message: string) {
    super('URL_NOT_ALLOWED', message, 400)
  }
}
