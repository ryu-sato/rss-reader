'use client'

import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Rss, Bookmark, BookOpen, ChevronDown, Plus, Settings, Tag, RefreshCw, ListFilter, Pencil, Trash2, Check, X, ThumbsUp, SlidersHorizontal, Layers, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut } from '@/lib/auth-client'
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
  return <Rss className="h-3 w-3 shrink-0 text-sidebar-foreground/30" />
}

function UnreadPill({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="ml-auto shrink-0 text-[10px] tabular-nums font-bold min-w-[18px] h-[18px] flex items-center justify-center px-1.5 rounded-full bg-primary/20 text-primary leading-none">
      {count}
    </span>
  )
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

const navActive = 'bg-primary/10 text-primary font-semibold'
const navInactive = 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/70 cursor-pointer'
const navBase = 'relative flex items-center gap-2.5 px-3 py-[7px] mx-1.5 rounded-lg text-sm transition-all duration-150'

function NavIndicator({ show }: { show: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'absolute left-0 inset-y-[18%] w-[3px] bg-primary rounded-r-full transition-opacity duration-200',
        show ? 'opacity-100' : 'opacity-0'
      )}
    />
  )
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

  const currentFeedId = searchParams.get('feedId')
  const currentTagId = searchParams.get('tagId')

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
  }, [])

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

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetch('/api/feeds/refresh', { method: 'POST' })
    setRefreshing(false)
    window.location.reload()
  }, [])

  const handleRenameTag = useCallback(async (tagId: string) => {
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
  }, [editingTagName])

  const handleDeleteTag = useCallback(async (tagId: string) => {
    const res = await fetch(`/api/tags/${tagId}`, { method: 'DELETE' })
    if (res.ok) {
      setTags((prev) => prev.filter((t) => t.id !== tagId))
      if (currentTagId === tagId) router.push('/')
    }
  }, [currentTagId, router])

  useEffect(() => {
    onMobileClose?.()
  }, [pathname, searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

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
        'fixed top-0 bottom-0 left-0 z-40 w-64 transition-transform duration-300 ease-in-out',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
        'md:relative md:translate-x-0 md:w-56 md:shrink-0 md:h-screen md:z-auto'
      )}
    >
      {/* Logo */}
      <div className="h-[52px] flex items-center px-4 border-b border-sidebar-border shrink-0">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md shadow-primary/30 transition-shadow duration-200 group-hover:shadow-primary/50 shrink-0">
            <Rss className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-[13px] font-bold tracking-tight text-sidebar-foreground">RSS Reader</span>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <nav className="py-2">
          <Link
            href="/"
            className={cn(navBase, isHome ? navActive : navInactive)}
          >
            <NavIndicator show={isHome} />
            <Rss className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1">全ての記事</span>
            <UnreadPill count={totalUnread} />
          </Link>

          <Link
            href="/read-later"
            className={cn(navBase, isReadLater ? navActive : navInactive)}
          >
            <NavIndicator show={isReadLater} />
            <Bookmark className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1">あとで読む</span>
            <UnreadPill count={readLaterUnreadCount} />
          </Link>

          {/* Preferred section */}
          <div className="mt-0.5">
            <div className="flex items-center px-3 py-1">
              <Link
                href="/preferred"
                className={cn(
                  'flex items-center gap-2.5 flex-1 min-w-0 rounded text-sm transition-colors py-0.5',
                  isPreferred && !pathname.startsWith('/preferred/')
                    ? 'text-primary font-semibold'
                    : 'text-sidebar-foreground/60 hover:text-sidebar-foreground'
                )}
              >
                <ThumbsUp className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">お好みの記事</span>
              </Link>
              {preferences.length > 0 && (
                <button
                  onClick={() => setPreferredOpen(!preferredOpen)}
                  className="h-5 w-5 flex items-center justify-center text-sidebar-foreground/30 hover:text-sidebar-foreground transition-colors"
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
                    'flex items-center gap-2 pl-8 pr-3 py-[7px] mx-1.5 rounded-lg text-sm transition-colors min-w-0',
                    pathname === '/preferred/all'
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/70 cursor-pointer'
                  )}
                >
                  <Layers className="h-3 w-3 shrink-0 text-sidebar-foreground/40" />
                  <span className="truncate">すべて</span>
                </Link>
                {preferences.map((pref) => (
                  <Link
                    key={pref.id}
                    href={`/preferred/${pref.id}`}
                    className={cn(
                      'flex items-center gap-2 pl-8 pr-3 py-[7px] mx-1.5 rounded-lg text-sm transition-colors min-w-0',
                      pathname === `/preferred/${pref.id}`
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/70 cursor-pointer'
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
            className={cn(navBase, isPreferences ? navActive : navInactive)}
          >
            <NavIndicator show={isPreferences} />
            <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
            <span>好みの設定</span>
          </Link>

          <Link
            href="/digests"
            className={cn(navBase, isDigests ? navActive : navInactive)}
          >
            <NavIndicator show={isDigests} />
            <BookOpen className="h-3.5 w-3.5 shrink-0" />
            <span>ダイジェスト</span>
          </Link>

          <Separator className="mx-3 my-2 w-auto opacity-50" />

          {/* Feeds section */}
          <div className="mt-1">
            <div className="flex items-center px-3 py-1 group">
              <button
                onClick={() => setFeedsOpen(!feedsOpen)}
                className="flex items-center gap-1.5 flex-1 text-[10px] font-bold text-sidebar-foreground/35 uppercase tracking-[0.13em] hover:text-sidebar-foreground/60 transition-colors"
              >
                <span>フィード</span>
                <ChevronDown
                  className={cn(
                    'h-3 w-3 transition-transform duration-150',
                    feedsOpen ? '' : '-rotate-90'
                  )}
                />
              </button>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link
                  href="/feeds/new"
                  title="フィードを追加"
                  className="h-5 w-5 flex items-center justify-center rounded hover:bg-sidebar-accent text-sidebar-foreground/35 hover:text-sidebar-foreground transition-colors"
                >
                  <Plus className="h-3 w-3" />
                </Link>
                <Link
                  href="/feeds"
                  title="フィードを管理"
                  className="h-5 w-5 flex items-center justify-center rounded hover:bg-sidebar-accent text-sidebar-foreground/35 hover:text-sidebar-foreground transition-colors"
                >
                  <ListFilter className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {feeds.length === 0 ? (
              <Link
                href="/feeds/new"
                className="flex items-center gap-2 px-3 py-[7px] mx-1.5 rounded-lg text-xs text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent/70 transition-colors border border-dashed border-sidebar-border mt-1"
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
                        'flex items-center gap-2 px-3 py-[7px] mx-1.5 rounded-lg text-sm transition-colors min-w-0',
                        currentFeedId === feed.id
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/70 cursor-pointer'
                      )}
                    >
                      <FeedFavicon faviconUrl={feed.faviconUrl} feedUrl={feed.url} />
                      <span className="truncate flex-1">{feed.title}</span>
                      <UnreadPill count={feed.unreadCount} />
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
                className="w-full flex items-center justify-between px-3 py-1 text-[10px] font-bold text-sidebar-foreground/35 uppercase tracking-[0.13em] hover:text-sidebar-foreground/60 transition-colors"
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
                      <div key={tag.id} className="flex items-center gap-1 px-3 py-1 mx-1.5">
                        <Tag className="h-3 w-3 shrink-0 text-sidebar-foreground/35" />
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
                          className="h-5 w-5 flex items-center justify-center rounded hover:bg-sidebar-accent text-sidebar-foreground/35 hover:text-sidebar-foreground shrink-0"
                          title="保存"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => setEditingTagId(null)}
                          className="h-5 w-5 flex items-center justify-center rounded hover:bg-sidebar-accent text-sidebar-foreground/35 hover:text-sidebar-foreground shrink-0"
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
                            'flex items-center gap-2 px-3 py-[7px] rounded-lg text-sm transition-colors flex-1 min-w-0',
                            currentTagId === tag.id
                              ? 'bg-primary/10 text-primary font-semibold'
                              : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/70 cursor-pointer'
                          )}
                        >
                          <Tag className="h-3 w-3 shrink-0 text-sidebar-foreground/35" />
                          <span className="truncate">{tag.name}</span>
                        </Link>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pr-1 shrink-0">
                          <button
                            onClick={() => {
                              setEditingTagId(tag.id)
                              setEditingTagName(tag.name)
                            }}
                            className="h-5 w-5 flex items-center justify-center rounded hover:bg-sidebar-accent text-sidebar-foreground/35 hover:text-sidebar-foreground"
                            title="タグ名を変更"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteTag(tag.id)}
                            className="h-5 w-5 flex items-center justify-center rounded hover:bg-sidebar-accent text-sidebar-foreground/35 hover:text-destructive"
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
      </div>

      {/* Footer actions */}
      <div className="border-t border-sidebar-border px-2 pt-2 pb-2 shrink-0 flex flex-col gap-0.5">
        <div className="flex gap-1">
          <Link
            href="/settings"
            className={cn(
              'flex items-center gap-2 text-xs px-3 py-2 rounded-lg transition-colors flex-1',
              isSettings
                ? 'bg-sidebar-accent text-sidebar-foreground font-medium'
                : 'text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/70'
            )}
          >
            <Settings className="h-3.5 w-3.5 shrink-0" />
            <span>設定</span>
          </Link>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 text-xs text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors px-3 py-2 rounded-lg hover:bg-sidebar-accent/70 disabled:opacity-40 flex-1"
          >
            <RefreshCw className={cn('h-3.5 w-3.5 shrink-0', refreshing && 'animate-spin')} />
            <span>{refreshing ? '更新中...' : '更新'}</span>
          </button>
        </div>
        <button
          onClick={() => signOut({ fetchOptions: { onSuccess: () => { window.location.href = '/login' } } })}
          className="flex items-center gap-2 text-xs text-sidebar-foreground/40 hover:text-destructive transition-colors px-3 py-2 rounded-lg hover:bg-destructive/10 w-full"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          <span>サインアウト</span>
        </button>
      </div>
    </aside>
  )
}
