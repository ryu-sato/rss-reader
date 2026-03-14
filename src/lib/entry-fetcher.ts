import Parser from 'rss-parser'
import type { FetchedEntryData } from '@/types/entry'

const FETCH_TIMEOUT_MS = 30_000

type RSSItem = Parser.Item & {
  contentEncoded?: string
  'media:content'?: { $: { url?: string; medium?: string } }[]
  'media:thumbnail'?: { $: { url?: string } }[]
  'itunes:image'?: { $: { href?: string } }
}

const parser = new Parser<Record<string, unknown>, RSSItem>({
  customFields: {
    item: [
      ['content:encoded', 'contentEncoded'],
      ['media:content', 'media:content', { keepArray: true }],
      ['media:thumbnail', 'media:thumbnail', { keepArray: true }],
      ['itunes:image', 'itunes:image'],
    ],
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

function extractFirstImageUrl(html: string): string | null {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  return match?.[1] ?? null
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function extractMetaContent(html: string, property: string): string | null {
  // Match <meta property="..." content="..."> in either attribute order
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:/g, ':')
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["']`, 'i'),
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return decodeHtmlEntities(match[1])
  }
  return null
}

async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5_000)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RSSReader/1.0)',
        Accept: 'text/html',
      },
    })
    clearTimeout(timeoutId)
    if (!res.ok) return null
    const html = await res.text()
    return (
      extractMetaContent(html, 'og:image') ??
      extractMetaContent(html, 'og:image:url') ??
      extractMetaContent(html, 'twitter:image') ??
      extractMetaContent(html, 'twitter:image:src') ??
      null
    )
  } catch {
    return null
  }
}

function extractImageUrl(item: RSSItem, rawContent: string | null, rawDescription: string | null): string | null {
  // 1. RSS 2.0 enclosure
  if (item.enclosure?.url) {
    const type = item.enclosure.type ?? ''
    const url = item.enclosure.url
    // Accept if type is image/* or if URL looks like an image
    if (type.startsWith('image/') || /\.(jpe?g|png|gif|webp|svg)(\?|$)/i.test(url)) {
      return url
    }
  }

  // 2. media:content (Media RSS)
  const mediaContent = item['media:content']
  if (mediaContent) {
    const imageMedia = mediaContent.find(
      (m) => m.$.url && (!m.$.medium || m.$.medium === 'image')
    )
    if (imageMedia?.$.url) return imageMedia.$.url
  }

  // 3. media:thumbnail
  const mediaThumbnail = item['media:thumbnail']
  if (mediaThumbnail?.[0]?.$.url) {
    return mediaThumbnail[0].$.url
  }

  // 4. itunes:image
  if (item['itunes:image']?.$.href) {
    return item['itunes:image'].$.href
  }

  // 5. First <img> in content or description
  if (rawContent) {
    const url = extractFirstImageUrl(rawContent)
    if (url) return url
  }
  if (rawDescription) {
    const url = extractFirstImageUrl(rawDescription)
    if (url) return url
  }

  return null
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

  const entries = (feed.items ?? []).map((item) => {
    const rawContent = item.contentEncoded ?? null
    const rawDescription = item.content ?? null

    return {
      guid: item.guid ?? item.link ?? item.title ?? '',
      title: item.title?.trim() || item.link || '',
      link: item.link ?? '',
      description: rawDescription ? stripHtml(rawDescription) : null,
      content: rawContent ? stripHtml(rawContent) : null,
      imageUrl: extractImageUrl(item, rawContent, rawDescription),
      publishedAt: item.pubDate ? new Date(item.pubDate) : null,
    }
  })

  // Fetch OGP images for entries that have no image from the RSS feed
  const noImageEntries = entries.filter((e) => !e.imageUrl && e.link)
  const BATCH_SIZE = 5
  for (let i = 0; i < noImageEntries.length; i += BATCH_SIZE) {
    const batch = noImageEntries.slice(i, i + BATCH_SIZE)
    const results = await Promise.allSettled(batch.map((e) => fetchOgImage(e.link)))
    results.forEach((result, idx) => {
      if (result.status === 'fulfilled' && result.value) {
        noImageEntries[i + idx].imageUrl = result.value
      }
    })
  }

  return entries
}
