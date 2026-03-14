import Parser from 'rss-parser'
import type { FetchedEntryData } from '@/types/entry'

const FETCH_TIMEOUT_MS = 30_000

type RSSItem = Parser.Item & {
  contentEncoded?: string
}

const parser = new Parser<Record<string, unknown>, RSSItem>({
  customFields: {
    item: [['content:encoded', 'contentEncoded']],
  },
})

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function fetchEntries(feedUrl: string): Promise<FetchedEntryData[]> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(feedUrl, { signal: controller.signal })
  } catch (err) {
    throw new Error(`Failed to fetch entries from ${feedUrl}: ${err}`)
  } finally {
    clearTimeout(timeoutId)
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch entries: HTTP ${response.status}`)
  }

  const text = await response.text()
  const feed = await parser.parseString(text)

  return (feed.items ?? []).map((item) => {
    // item.content はRSS 2.0では description と同じになるため、contentEncoded のみを使用
    // rss-parser: RSS 2.0の<description>はitem.contentにマッピングされる
    // content:encodedはcustomFieldsでitem.contentEncodedにマッピング
    const rawContent = item.contentEncoded ?? null
    const rawDescription = item.content ?? null

    return {
      guid: item.guid ?? item.link ?? item.title ?? '',
      title: item.title?.trim() || item.link || '',
      link: item.link ?? '',
      description: rawDescription ? stripHtml(rawDescription) : null,
      content: rawContent ? stripHtml(rawContent) : null,
      publishedAt: item.pubDate ? new Date(item.pubDate) : null,
    }
  })
}
