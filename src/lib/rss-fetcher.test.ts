import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchFeed } from './rss-fetcher'
import { FeedFetchError, InvalidFeedFormatError } from './errors'

const RSS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Example Blog</title>
    <description>Blog description</description>
    <link>https://example.com</link>
  </channel>
</rss>`

const ATOM_XML = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Blog</title>
  <subtitle>Atom description</subtitle>
</feed>`

const RSS_NO_TITLE = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title></title>
    <description></description>
  </channel>
</rss>`

const RSS_NO_DESCRIPTION = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>My Feed</title>
  </channel>
</rss>`

function mockFetchOk(body: string) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    text: () => Promise.resolve(body),
  }))
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('fetchFeed', () => {
  it('parses valid RSS 2.0 feed', async () => {
    mockFetchOk(RSS_XML)
    const result = await fetchFeed('https://example.com/feed.xml')
    expect(result.title).toBe('Example Blog')
    expect(result.description).toBe('Blog description')
    expect(result.lastFetchedAt).toBeInstanceOf(Date)
  })

  it('parses valid Atom 1.0 feed', async () => {
    mockFetchOk(ATOM_XML)
    const result = await fetchFeed('https://example.com/atom.xml')
    expect(result.title).toBe('Atom Blog')
    expect(result.lastFetchedAt).toBeInstanceOf(Date)
  })

  it('throws FeedFetchError on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
    await expect(fetchFeed('https://example.com/feed')).rejects.toThrow(FeedFetchError)
  })

  it('throws FeedFetchError on AbortError (timeout)', async () => {
    const abortError = new Error('Aborted')
    abortError.name = 'AbortError'
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError))
    await expect(fetchFeed('https://example.com/feed')).rejects.toThrow(FeedFetchError)
  })

  it('throws FeedFetchError on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
    await expect(fetchFeed('https://example.com/feed')).rejects.toThrow(FeedFetchError)
  })

  it('throws InvalidFeedFormatError on non-RSS content', async () => {
    mockFetchOk('<html><body>Not RSS</body></html>')
    await expect(fetchFeed('https://example.com/page')).rejects.toThrow(InvalidFeedFormatError)
  })

  it('falls back to URL when title is empty (EDGE-003)', async () => {
    mockFetchOk(RSS_NO_TITLE)
    const url = 'https://example.com/feed.xml'
    const result = await fetchFeed(url)
    expect(result.title).toBe(url)
  })

  it('returns null description when missing', async () => {
    mockFetchOk(RSS_NO_DESCRIPTION)
    const result = await fetchFeed('https://example.com/feed.xml')
    expect(result.description).toBeNull()
  })
})
