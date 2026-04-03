'use client'

import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { Rss, Bookmark, BookOpen, ChevronDown, Plus, Settings, Tag, RefreshCw, ListFilter, Pencil, Trash2, Check, X, ThumbsUp, SlidersHorizontal, Layers, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut } from '@/lib/auth-client'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'

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

interface PreferenceItem {
  id: string
  text: string
}

export function Sidebar({ mobileOpen = false, onMobileClose }: { mobileOpen?: boolean; onMobileClose?: () => void }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [feeds, setFeeds] = useState<Feed[]>([])
  const [tags, setTags] = useState<TagItem[]>([])
  const [preferences, setPreferences] = useState<PreferenceItem[]>([])
  const [feedsOpen, setFeedsOpen] = useState(true)
  const [tagsOpen, setTagsOpen] = useState(true)
  const [preferredOpen, setPreferredOpen] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [readLaterUnreadCount, setReadLaterUnreadCount] = useState(0)
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [editingTagName, setEditingTagName] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  const fetchReadLaterUnreadCount = () => {
    fetch('/api/entries/read-later-unread-count')
      .then((r) => r.json())
      .then((res) => { if (res.success) setReadLaterUnreadCount(res.data.count) })
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/feeds').then((r) => r.json()),
      fetch('/api/tags').then((r) => r.json()),
      fetch('/api/preferences').then((r) => r.json()),
    ]).then(([feedsRes, tagsRes, prefsRes]) => {
      if (feedsRes.success) setFeeds(feedsRes.data)
      if (tagsRes.success) setTags(tagsRes.data)
      if (prefsRes.success) setPreferences(prefsRes.data)
    })
    fetchReadLaterUnreadCount()
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

  useEffect(() => {
    const handler = () => { fetchReadLaterUnreadCount() }
    window.addEventListener('entry:updated', handler)
    return () => window.removeEventListener('entry:updated', handler)
  }, [])

  useEffect(() => {
    const handler = () => {
      fetch('/api/tags')
        .then((r) => r.json())
        .then((res) => { if (res.success) setTags(res.data) })
    }
    window.addEventListener('tag:deleted', handler)
    return () => window.removeEventListener('tag:deleted', handler)
  }, [])

  const totalUnread = feeds.reduce((sum, f) => sum + f.unreadCount, 0)

  useEffect(() => {
    if ('setAppBadge' in navigator) {
      if (totalUnread > 0) {
        navigator.setAppBadge(totalUnread)
      } else {
        navigator.clearAppBadge()
      }
    }
  }, [totalUnread])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetch('/api/feeds/refresh', { method: 'POST' })
    setRefreshing(false)
    window.location.reload()
  }

  const handleRenameTag = async (tagId: string) => {
    const name = editingTagName.trim()
    if (!name) return
    const res = await fetch(`/api/tags/${tagId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (res.ok) {
      const { data } = await res.json()
      setTags((prev) => prev.map((t) => (t.id === tagId ? { ...t, name: data.name } : t)))
    }
    setEditingTagId(null)
  }

  const handleDeleteTag = async (tagId: string) => {
    const res = await fetch(`/api/tags/${tagId}`, { method: 'DELETE' })
    if (res.ok) {
      setTags((prev) => prev.filter((t) => t.id !== tagId))
      // If currently filtering by this tag, go back to home
      if (currentTagId === tagId) router.push('/')
    }
  }

  // Close sidebar on mobile when navigation changes
  useEffect(() => {
    onMobileClose?.()
  }, [pathname, searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  const currentFeedId = searchParams.get('feedId')
  const currentTagId = searchParams.get('tagId')

  const isHome = pathname === '/' && !currentFeedId && !currentTagId
  const isReadLater = pathname === '/read-later'
  const isPreferred = pathname === '/preferred'
  const isDigests = pathname.startsWith('/digests')
  const isSettings = pathname === '/settings'
  const isPreferences = pathname === '/preferences'

  const makeFeedLink = (feedId: string) => `/?feedId=${feedId}`
  const makeTagLink = (tagId: string) => `/?tagId=${tagId}`

  return (
    <aside
      className={cn(
        'bg-sidebar border-r border-sidebar-border flex flex-col overflow-hidden',
        // Mobile: fixed overlay, slides in/out
        'fixed top-0 bottom-0 left-0 z-40 w-64 transition-transform duration-300 ease-in-out',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
        // Desktop: normal flex flow
        'md:relative md:translate-x-0 md:w-56 md:shrink-0 md:h-screen md:z-auto'
      )}
    >
      {/* Logo */}
      <div className="h-12 flex items-center px-3.5 border-b border-sidebar-border shrink-0">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-foreground">
          <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center shrink-0">
            <Rss className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold tracking-tight">RSS Reader</span>
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
      <nav className="py-2">
        <Link
          href="/"
          className={cn(
            'flex items-center gap-2.5 px-3 py-1.5 mx-1.5 rounded-lg text-sm transition-colors',
            isHome
              ? 'bg-primary text-primary-foreground font-medium'
              : 'text-foreground hover:bg-accent cursor-pointer'
          )}
        >
          <Rss className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">全ての記事</span>
          {totalUnread > 0 && (
            <Badge variant="secondary" className="ml-1 shrink-0 h-4 px-1.5 text-[10px] tabular-nums">
              {totalUnread}
            </Badge>
          )}
        </Link>

        <Link
          href="/read-later"
          className={cn(
            'flex items-center gap-2.5 px-3 py-1.5 mx-1.5 rounded-lg text-sm transition-colors',
            isReadLater
              ? 'bg-primary text-primary-foreground font-medium'
              : 'text-foreground hover:bg-accent cursor-pointer'
          )}
        >
          <Bookmark className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">あとで読む</span>
          {readLaterUnreadCount > 0 && (
            <Badge variant="secondary" className="ml-1 shrink-0 h-4 px-1.5 text-[10px] tabular-nums">
              {readLaterUnreadCount}
            </Badge>
          )}
        </Link>

        {/* Preferred section */}
        <div className="mt-1">
          <div className="flex items-center px-3 py-1">
            <Link
              href="/preferred"
              className={cn(
                'flex items-center gap-2.5 flex-1 min-w-0 rounded text-sm transition-colors py-0.5',
                isPreferred && !pathname.startsWith('/preferred/')
                  ? 'text-primary font-medium'
                  : 'text-foreground hover:text-foreground'
              )}
            >
              <ThumbsUp className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">お好みの記事</span>
            </Link>
            {preferences.length > 0 && (
              <button
                onClick={() => setPreferredOpen(!preferredOpen)}
                className="h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown
                  className={cn(
                    'h-3 w-3 transition-transform duration-150',
                    preferredOpen ? '' : '-rotate-90'
                  )}
                />
              </button>
            )}
          </div>
          {preferredOpen && preferences.length > 0 && (
            <div className="mt-0.5">
              <Link
                href="/preferred/all"
                className={cn(
                  'flex items-center gap-2 pl-8 pr-3 py-1.5 mx-1.5 rounded-lg text-sm transition-colors min-w-0',
                  pathname === '/preferred/all'
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-foreground hover:bg-accent cursor-pointer'
                )}
              >
                <Layers className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="truncate">すべて</span>
              </Link>
              {preferences.map((pref) => (
                <Link
                  key={pref.id}
                  href={`/preferred/${pref.id}`}
                  className={cn(
                    'flex items-center gap-2 pl-8 pr-3 py-1.5 mx-1.5 rounded-lg text-sm transition-colors min-w-0',
                    pathname === `/preferred/${pref.id}`
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-foreground hover:bg-accent cursor-pointer'
                  )}
                >
                  <span className="truncate">{pref.text}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <Link
          href="/preferences"
          className={cn(
            'flex items-center gap-2.5 px-3 py-1.5 mx-1.5 rounded-lg text-sm transition-colors',
            isPreferences
              ? 'bg-primary text-primary-foreground font-medium'
              : 'text-foreground hover:bg-accent cursor-pointer'
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
          <span>好みの設定</span>
        </Link>

        <Link
          href="/digests"
          className={cn(
            'flex items-center gap-2.5 px-3 py-1.5 mx-1.5 rounded-lg text-sm transition-colors',
            isDigests
              ? 'bg-primary text-primary-foreground font-medium'
              : 'text-foreground hover:bg-accent cursor-pointer'
          )}
        >
          <BookOpen className="h-3.5 w-3.5 shrink-0" />
          <span>ダイジェスト</span>
        </Link>

        <Separator className="mx-3 my-2 w-auto" />

        {/* Feeds section */}
        <div className="mt-1">
          <div className="flex items-center px-3 py-1 group">
            <button
              onClick={() => setFeedsOpen(!feedsOpen)}
              className="flex items-center gap-1.5 flex-1 text-[10.5px] font-semibold text-muted-foreground/70 uppercase tracking-widest hover:text-foreground transition-colors"
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
              className="flex items-center gap-2 px-3 py-1.5 mx-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors border border-dashed border-sidebar-border mt-1"
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
                      'flex items-center gap-2 px-3 py-1.5 mx-1.5 rounded-lg text-sm transition-colors min-w-0',
                      currentFeedId === feed.id
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-foreground hover:bg-accent cursor-pointer'
                    )}
                  >
                    <FeedFavicon faviconUrl={feed.faviconUrl} feedUrl={feed.url} />
                    <span className="truncate flex-1">{feed.title}</span>
                    {feed.unreadCount > 0 && (
                      <Badge variant="secondary" className="ml-1 shrink-0 h-4 px-1.5 text-[10px] tabular-nums">
                        {feed.unreadCount}
                      </Badge>
                    )}
                  </Link>
                ))}
              </div>
            )
          )}
        </div>

        {/* Tags section */}
        {tags.length > 0 && (
          <div className="mt-1">
            <button
              onClick={() => setTagsOpen(!tagsOpen)}
              className="w-full flex items-center justify-between px-3 py-1 text-[10.5px] font-semibold text-muted-foreground/70 uppercase tracking-widest hover:text-foreground transition-colors"
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
                {tags.map((tag) =>
                  editingTagId === tag.id ? (
                    // Inline rename form
                    <div key={tag.id} className="flex items-center gap-1 px-3 py-1 mx-1.5">
                      <Tag className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <Input
                        ref={editInputRef}
                        value={editingTagName}
                        onChange={(e) => setEditingTagName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameTag(tag.id)
                          if (e.key === 'Escape') setEditingTagId(null)
                        }}
                        className="flex-1 min-w-0 h-6 text-xs px-1.5"
                        autoFocus
                      />
                      <button
                        onClick={() => handleRenameTag(tag.id)}
                        className="h-5 w-5 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground shrink-0"
                        title="保存"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => setEditingTagId(null)}
                        className="h-5 w-5 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground shrink-0"
                        title="キャンセル"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div key={tag.id} className="group flex items-center mx-1.5 rounded-lg">
                      <Link
                        href={makeTagLink(tag.id)}
                        className={cn(
                          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors flex-1 min-w-0',
                          currentTagId === tag.id
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-foreground hover:bg-accent cursor-pointer'
                        )}
                      >
                        <Tag className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <span className="truncate">{tag.name}</span>
                      </Link>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pr-1 shrink-0">
                        <button
                          onClick={() => {
                            setEditingTagId(tag.id)
                            setEditingTagName(tag.name)
                          }}
                          className="h-5 w-5 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                          title="タグ名を変更"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteTag(tag.id)}
                          className="h-5 w-5 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-destructive"
                          title="タグを削除"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}
      </nav>
      </ScrollArea>

      {/* Footer actions */}
      <div className="border-t border-sidebar-border p-2 shrink-0 flex flex-col gap-0.5">
        <div className="flex gap-1">
          <Link
            href="/settings"
            className={cn(
              'flex items-center gap-2 text-xs px-3 py-2 rounded-lg transition-colors flex-1',
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
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-accent disabled:opacity-50 flex-1"
          >
            <RefreshCw className={cn('h-3.5 w-3.5 shrink-0', refreshing && 'animate-spin')} />
            <span>{refreshing ? '更新中...' : '更新'}</span>
          </button>
        </div>
        <button
          onClick={() => signOut({ fetchOptions: { onSuccess: () => { window.location.href = '/login' } } })}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-destructive transition-colors px-3 py-2 rounded-lg hover:bg-destructive/8 w-full"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          <span>サインアウト</span>
        </button>
      </div>
    </aside>
  )
}
