'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Pencil, Trash2, Rss } from 'lucide-react'
import type { FeedListItem } from '@/types/feed'

export default function FeedsPage() {
  const [feeds, setFeeds] = useState<FeedListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchFeeds = useCallback(async () => {
    const res = await fetch('/api/feeds')
    const json = await res.json()
    if (json.success) setFeeds(json.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchFeeds()
  }, [fetchFeeds])

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`「${title}」を削除しますか？`)) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/feeds/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setFeeds((prev) => prev.filter((f) => f.id !== id))
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <main className="px-4 py-6 sm:px-8 sm:py-8 max-w-2xl">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">フィード管理</h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              登録済みのRSSフィードを管理します
              {!loading && feeds.length > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                  {feeds.length} 件
                </span>
              )}
            </p>
          </div>
          <Link
            href="/feeds/new"
            className="inline-flex items-center gap-2 text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors font-medium shrink-0 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            フィードを追加
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-4 rounded-lg border border-border bg-card animate-pulse">
                <div className="h-4 w-4 rounded bg-muted shrink-0" />
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="h-3.5 bg-muted rounded w-2/5" />
                  <div className="h-3 bg-muted rounded w-3/5" />
                </div>
              </div>
            ))}
          </div>
        ) : feeds.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-xl bg-card/50">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-muted mb-4">
              <Rss className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">フィードが登録されていません</p>
            <p className="text-xs text-muted-foreground mb-4">気になるサイトのRSSフィードを追加してみましょう</p>
            <Link
              href="/feeds/new"
              className="inline-flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors font-medium cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              最初のフィードを追加
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-card">
            {feeds.map((feed) => (
              <li key={feed.id} className="flex items-center gap-3 px-4 py-4 hover:bg-accent/30 transition-colors">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted shrink-0">
                  <Rss className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{feed.title}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{feed.url}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <Link
                    href={`/feeds/${feed.id}/edit`}
                    className="flex items-center justify-center h-10 w-10 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                    title="編集"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    onClick={() => handleDelete(feed.id, feed.title)}
                    disabled={deletingId === feed.id}
                    className="flex items-center justify-center h-10 w-10 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 cursor-pointer"
                    title="削除"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
