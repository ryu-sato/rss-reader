import { describe, it, expect } from 'vitest'
import {
  AppError,
  ConflictError,
  NotFoundError,
  FeedFetchError,
  InvalidFeedFormatError,
  SSRFError,
} from './errors'

describe('AppError subclasses', () => {
  it('ConflictError has correct code and statusCode', () => {
    const error = new ConflictError('Feed already exists')
    expect(error.code).toBe('FEED_ALREADY_EXISTS')
    expect(error.statusCode).toBe(409)
    expect(error).toBeInstanceOf(AppError)
  })

  it('NotFoundError has correct code and statusCode', () => {
    const error = new NotFoundError('Feed not found')
    expect(error.code).toBe('FEED_NOT_FOUND')
    expect(error.statusCode).toBe(404)
  })

  it('FeedFetchError has correct code and statusCode', () => {
    const error = new FeedFetchError('Failed to fetch')
    expect(error.code).toBe('FEED_FETCH_FAILED')
    expect(error.statusCode).toBe(422)
  })

  it('InvalidFeedFormatError has correct code and statusCode', () => {
    const error = new InvalidFeedFormatError('Invalid format')
    expect(error.code).toBe('INVALID_FEED_FORMAT')
    expect(error.statusCode).toBe(422)
  })

  it('SSRFError has correct code and statusCode', () => {
    const error = new SSRFError('URL not allowed')
    expect(error.code).toBe('URL_NOT_ALLOWED')
    expect(error.statusCode).toBe(400)
  })
})
