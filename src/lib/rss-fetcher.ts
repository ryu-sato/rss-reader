import Parser from 'rss-parser'
import { FeedFetchError, InvalidFeedFormatError } from './errors'
import type { FetchedFeedInfo } from '@/types/feed'

const FETCH_TIMEOUT_MS = 30_000
const parser = new Parser()

export async function fetchFeed(url: string): Promise<FetchedFeedInfo> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(url, { signal: controller.signal })
  } catch {
    throw new FeedFetchError('Failed to fetch the feed URL')
  } finally {
    clearTimeout(timeoutId)
  }

  if (!response.ok) {
    throw new FeedFetchError('Failed to fetch the feed URL')
  }

  const text = await response.text()

  let feed: Parser.Output<Record<string, unknown>>
  try {
    feed = await parser.parseString(text)
  } catch {
    throw new InvalidFeedFormatError('URL is not a valid RSS/Atom feed')
  }

  const title = feed.title?.trim() || url
  const description = feed.description?.trim() || null

  return {
    title,
    description,
    lastFetchedAt: new Date(),
  }
}
