import type { ErrorCode } from '@/types/feed'

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
