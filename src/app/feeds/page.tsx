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
    <main className="py-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">フィード管理</h1>
          <p className="text-sm text-muted-foreground mt-1">登録済みのRSSフィードを管理します</p>
        </div>
        <Link
          href="/feeds/new"
          className="inline-flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-3 py-2 rounded hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          フィードを追加
        </Link>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">読み込み中...</div>
      ) : feeds.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Rss className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">フィードが登録されていません</p>
          <Link
            href="/feeds/new"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-2"
          >
            <Plus className="h-3.5 w-3.5" />
            最初のフィードを追加する
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-border border border-border rounded-lg overflow-hidden">
          {feeds.map((feed) => (
            <li key={feed.id} className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-accent/30 transition-colors">
              <Rss className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{feed.title}</p>
                <p className="text-xs text-muted-foreground truncate">{feed.url}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Link
                  href={`/feeds/${feed.id}/edit`}
                  className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  title="編集"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Link>
                <button
                  onClick={() => handleDelete(feed.id, feed.title)}
                  disabled={deletingId === feed.id}
                  className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-accent transition-colors disabled:opacity-50"
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
  )
}
