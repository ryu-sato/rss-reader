import { prisma } from '@/lib/db'
import { validateUrl } from '@/lib/ssrf-guard'
import { fetchFeed } from '@/lib/rss-fetcher'
import { ConflictError, NotFoundError } from './errors'
import type { UpdateFeedInput, FeedListItem } from '@/types/feed'
import type { Feed } from '@/generated/prisma/client'

export async function createFeed(url: string): Promise<Feed> {
  const existing = await prisma.feed.findUnique({ where: { url } })
  if (existing) {
    throw new ConflictError('Feed with this URL already exists')
  }

  await validateUrl(url)

  const feedInfo = await fetchFeed(url)

  return prisma.feed.create({
    data: {
      url,
      title: feedInfo.title,
      description: feedInfo.description,
      faviconUrl: feedInfo.faviconUrl,
      lastFetchedAt: feedInfo.lastFetchedAt,
    },
  })
}

export async function getAllFeeds(): Promise<FeedListItem[]> {
  const feeds = await prisma.feed.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      url: true,
      faviconUrl: true,
      createdAt: true,
      updatedAt: true,
      entries: {
        where: { OR: [{ meta: null }, { meta: { isRead: false } }] },
        select: { id: true },
      },
    },
  })
  return feeds.map(({ entries, ...feed }) => ({
    ...feed,
    unreadCount: entries.length,
  }))
}

export async function getFeedById(id: string): Promise<Feed> {
  const feed = await prisma.feed.findUnique({ where: { id } })
  if (!feed) throw new NotFoundError('Feed not found')
  return feed
}

export async function updateFeed(id: string, data: UpdateFeedInput): Promise<Feed> {
  await getFeedById(id)
  return prisma.feed.update({ where: { id }, data })
}

export async function deleteFeed(id: string): Promise<void> {
  await getFeedById(id)
  await prisma.feed.delete({ where: { id } })
}
