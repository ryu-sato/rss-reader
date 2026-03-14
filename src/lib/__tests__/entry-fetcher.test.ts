import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchEntries } from '../entry-fetcher'

// RSS with items including content:encoded
const RSS_WITH_ITEMS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Test Blog</title>
    <link>https://example.com</link>
    <item>
      <title>Article 1</title>
      <link>https://example.com/article-1</link>
      <guid>https://example.com/article-1#guid</guid>
      <pubDate>Mon, 14 Mar 2026 09:00:00 +0000</pubDate>
      <description>Summary of article 1</description>
      <content:encoded><![CDATA[<p>Full content of <b>article 1</b></p>]]></content:encoded>
    </item>
    <item>
      <title>Article 2</title>
      <link>https://example.com/article-2</link>
      <guid>https://example.com/article-2#guid</guid>
      <pubDate>Sun, 13 Mar 2026 09:00:00 +0000</pubDate>
      <description><![CDATA[<p>Summary of article 2</p>]]></description>
    </item>
  </channel>
</rss>`

// RSS with no content or description
const RSS_MINIMAL_ITEM = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Blog</title>
    <item>
      <link>https://example.com/article-3</link>
    </item>
  </channel>
</rss>`

// RSS with empty title
const RSS_EMPTY_TITLE = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Blog</title>
    <item>
      <title></title>
      <link>https://example.com/article-4</link>
      <guid>guid-4</guid>
    </item>
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

describe('fetchEntries', () => {
  it('returns FetchedEntryData[] from RSS feed with items', async () => {
    mockFetchOk(RSS_WITH_ITEMS)
    const entries = await fetchEntries('https://example.com/feed.xml')

    expect(entries).toHaveLength(2)
    expect(entries[0].title).toBe('Article 1')
    expect(entries[0].link).toBe('https://example.com/article-1')
    expect(entries[0].guid).toBe('https://example.com/article-1#guid')
    expect(entries[0].publishedAt).toBeInstanceOf(Date)
  })

  it('strips HTML from content:encoded', async () => {
    mockFetchOk(RSS_WITH_ITEMS)
    const entries = await fetchEntries('https://example.com/feed.xml')

    expect(entries[0].content).toBe('Full content of article 1')
    expect(entries[0].content).not.toContain('<p>')
    expect(entries[0].content).not.toContain('<b>')
  })

  it('strips HTML from description', async () => {
    mockFetchOk(RSS_WITH_ITEMS)
    const entries = await fetchEntries('https://example.com/feed.xml')

    // Article 2 has no content:encoded, description has HTML
    expect(entries[1].description).toBe('Summary of article 2')
    expect(entries[1].description).not.toContain('<p>')
  })

  it('sets content to null when neither content:encoded nor content exists (EDGE-001)', async () => {
    mockFetchOk(RSS_WITH_ITEMS)
    const entries = await fetchEntries('https://example.com/feed.xml')

    // Article 2 has description but no content:encoded
    expect(entries[1].content).toBeNull()
  })

  it('falls back to link as guid when guid is missing', async () => {
    mockFetchOk(RSS_MINIMAL_ITEM)
    const entries = await fetchEntries('https://example.com/feed.xml')

    expect(entries[0].guid).toBe('https://example.com/article-3')
  })

  it('falls back to link as title when title is empty (EDGE-003)', async () => {
    mockFetchOk(RSS_EMPTY_TITLE)
    const entries = await fetchEntries('https://example.com/feed.xml')

    expect(entries[0].title).toBe('https://example.com/article-4')
  })

  it('sets description and content to null when missing', async () => {
    mockFetchOk(RSS_MINIMAL_ITEM)
    const entries = await fetchEntries('https://example.com/feed.xml')

    expect(entries[0].description).toBeNull()
    expect(entries[0].content).toBeNull()
  })

  it('sets publishedAt to null when pubDate is missing', async () => {
    mockFetchOk(RSS_MINIMAL_ITEM)
    const entries = await fetchEntries('https://example.com/feed.xml')

    expect(entries[0].publishedAt).toBeNull()
  })

  it('throws on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
    await expect(fetchEntries('https://example.com/feed.xml')).rejects.toThrow()
  })

  it('throws on non-ok HTTP response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
    await expect(fetchEntries('https://example.com/feed.xml')).rejects.toThrow()
  })

  it('returns empty array for feed with no items', async () => {
    const RSS_NO_ITEMS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Empty Blog</title>
  </channel>
</rss>`
    mockFetchOk(RSS_NO_ITEMS)
    const entries = await fetchEntries('https://example.com/feed.xml')
    expect(entries).toHaveLength(0)
  })
})
