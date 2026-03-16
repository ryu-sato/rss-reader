'use client'

import Link from 'next/link'
import { useSearchParams, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Rss, Bookmark, BookOpen, ChevronDown, Plus, Settings, Tag, RefreshCw, ListFilter } from 'lucide-react'
import { cn } from '@/lib/utils'

function FeedFavicon({ faviconUrl, feedUrl }: { faviconUrl: string | null; feedUrl: string }) {
  const [index, setIndex] = useState(0)

  const domainFavicon = (() => {
    try { return new URL(feedUrl).origin + '/favicon.ico' } catch { return null }
  })()

  const candidates = [faviconUrl, domainFavicon].filter((u): u is string => !!u)
  const src = candidates[index] ?? null

  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="h-3 w-3 shrink-0 rounded-sm object-contain"
        onError={() => setIndex((i) => i + 1)}
      />
    )
  }
  return <Rss className="h-3 w-3 shrink-0 text-muted-foreground" />
}

interface Feed {
  id: string
  title: string
  url: string
  faviconUrl: string | null
  unreadCount: number
}

interface TagItem {
  id: string
  name: string
}

export function Sidebar() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [feeds, setFeeds] = useState<Feed[]>([])
  const [tags, setTags] = useState<TagItem[]>([])
  const [feedsOpen, setFeedsOpen] = useState(true)
  const [tagsOpen, setTagsOpen] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/feeds').then((r) => r.json()),
      fetch('/api/tags').then((r) => r.json()),
    ]).then(([feedsRes, tagsRes]) => {
      if (feedsRes.success) setFeeds(feedsRes.data)
      if (tagsRes.success) setTags(tagsRes.data)
    })
  }, [pathname])

  useEffect(() => {
    const handler = () => {
      fetch('/api/feeds')
        .then((r) => r.json())
        .then((res) => { if (res.success) setFeeds(res.data) })
    }
    window.addEventListener('entry:read', handler)
    return () => window.removeEventListener('entry:read', handler)
  }, [])

  const totalUnread = feeds.reduce((sum, f) => sum + f.unreadCount, 0)

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetch('/api/feeds/refresh', { method: 'POST' })
    setRefreshing(false)
    window.location.reload()
  }

  const currentFeedId = searchParams.get('feedId')
  const currentTagId = searchParams.get('tagId')

  const isHome = pathname === '/' && !currentFeedId && !currentTagId
  const isReadLater = pathname === '/read-later'
  const isDigests = pathname.startsWith('/digests')
  const isSettings = pathname === '/settings'

  const makeFeedLink = (feedId: string) => `/?feedId=${feedId}`
  const makeTagLink = (tagId: string) => `/?tagId=${tagId}`

  return (
    <aside className="w-56 shrink-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col overflow-hidden">
      {/* Logo */}
      <div className="h-11 flex items-center px-4 border-b border-sidebar-border shrink-0">
        <Link href="/" className="flex items-center gap-2 font-bold text-foreground">
          <Rss className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">RSS Reader</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="overflow-y-auto flex-1 py-1.5">
        <Link
          href="/"
          className={cn(
            'flex items-center gap-2.5 px-3 py-1.5 mx-1.5 rounded text-sm transition-colors',
            isHome
              ? 'bg-primary text-primary-foreground font-medium'
              : 'text-foreground hover:bg-accent cursor-pointer'
          )}
        >
          <Rss className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">全ての記事</span>
          {totalUnread > 0 && (
            <span className="ml-1 shrink-0 text-[10px] font-medium tabular-nums opacity-70">
              {totalUnread}
            </span>
          )}
        </Link>

        <Link
          href="/read-later"
          className={cn(
            'flex items-center gap-2.5 px-3 py-1.5 mx-1.5 rounded text-sm transition-colors',
            isReadLater
              ? 'bg-primary text-primary-foreground font-medium'
              : 'text-foreground hover:bg-accent cursor-pointer'
          )}
        >
          <Bookmark className="h-3.5 w-3.5 shrink-0" />
          <span>あとで読む</span>
        </Link>

        <Link
          href="/digests"
          className={cn(
            'flex items-center gap-2.5 px-3 py-1.5 mx-1.5 rounded text-sm transition-colors',
            isDigests
              ? 'bg-primary text-primary-foreground font-medium'
              : 'text-foreground hover:bg-accent cursor-pointer'
          )}
        >
          <BookOpen className="h-3.5 w-3.5 shrink-0" />
          <span>ダイジェスト</span>
        </Link>

        {/* Feeds section */}
        <div className="mt-3">
          <div className="flex items-center px-3 py-1 group">
            <button
              onClick={() => setFeedsOpen(!feedsOpen)}
              className="flex items-center gap-1.5 flex-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
            >
              <span>フィード</span>
              <ChevronDown
                className={cn(
                  'h-3 w-3 transition-transform duration-150',
                  feedsOpen ? '' : '-rotate-90'
                )}
              />
            </button>
            {/* Feed contextual actions */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Link
                href="/feeds/new"
                title="フィードを追加"
                className="h-5 w-5 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="h-3 w-3" />
              </Link>
              <Link
                href="/feeds"
                title="フィードを管理"
                className="h-5 w-5 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              >
                <ListFilter className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {feeds.length === 0 ? (
            <Link
              href="/feeds/new"
              className="flex items-center gap-2 px-3 py-1.5 mx-1.5 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors border border-dashed border-sidebar-border mt-1"
            >
              <Plus className="h-3 w-3 shrink-0" />
              <span>フィードを追加</span>
            </Link>
          ) : (
            feedsOpen && (
              <div className="mt-0.5">
                {feeds.map((feed) => (
                  <Link
                    key={feed.id}
                    href={makeFeedLink(feed.id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 mx-1.5 rounded text-sm transition-colors min-w-0',
                      currentFeedId === feed.id
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-foreground hover:bg-accent cursor-pointer'
                    )}
                  >
                    <FeedFavicon faviconUrl={feed.faviconUrl} feedUrl={feed.url} />
                    <span className="truncate flex-1">{feed.title}</span>
                    {feed.unreadCount > 0 && (
                      <span className="ml-1 shrink-0 text-[10px] font-medium tabular-nums text-muted-foreground">
                        {feed.unreadCount}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )
          )}
        </div>

        {/* Tags section */}
        {tags.length > 0 && (
          <div className="mt-3">
            <button
              onClick={() => setTagsOpen(!tagsOpen)}
              className="w-full flex items-center justify-between px-3 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
            >
              <span>タグ</span>
              <ChevronDown
                className={cn(
                  'h-3 w-3 transition-transform duration-150',
                  tagsOpen ? '' : '-rotate-90'
                )}
              />
            </button>
            {tagsOpen && (
              <div className="mt-0.5">
                {tags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={makeTagLink(tag.id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 mx-1.5 rounded text-sm transition-colors',
                      currentTagId === tag.id
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-foreground hover:bg-accent cursor-pointer'
                    )}
                  >
                    <Tag className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="truncate">{tag.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Footer actions */}
      <div className="border-t border-sidebar-border p-2 shrink-0 grid grid-cols-2 gap-1">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-2 text-xs px-3 py-2 rounded transition-colors',
            isSettings
              ? 'bg-accent text-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
        >
          <Settings className="h-3.5 w-3.5 shrink-0" />
          <span>設定</span>
        </Link>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded hover:bg-accent disabled:opacity-50"
        >
          <RefreshCw className={cn('h-3.5 w-3.5 shrink-0', refreshing && 'animate-spin')} />
          <span>{refreshing ? '更新中...' : '更新'}</span>
        </button>
      </div>
    </aside>
  )
}
