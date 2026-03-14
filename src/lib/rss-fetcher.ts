import Parser from 'rss-parser'
import { FeedFetchError, InvalidFeedFormatError } from './errors'
import type { FetchedFeedInfo } from '@/types/feed'

const FETCH_TIMEOUT_MS = 30_000

type FeedOutput = Parser.Output<Record<string, unknown>> & {
  icon?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const parser = new Parser<FeedOutput>({
  customFields: {
    feed: [['icon', 'icon']] as any,
  },
})

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

  let feed: FeedOutput
  try {
    feed = await parser.parseString(text)
  } catch {
    throw new InvalidFeedFormatError('URL is not a valid RSS/Atom feed')
  }

  const title = feed.title?.trim() || url
  const description = feed.description?.trim() || null
  // RSS 2.0: feed.image?.url, Atom: feed.icon
  const faviconUrl = feed.image?.url ?? feed.icon ?? null

  return {
    title,
    description,
    faviconUrl,
    lastFetchedAt: new Date(),
  }
}
