'use client'

import { useState, useRef } from 'react'
import { Plus, Pencil, Trash2, Check, X, SlidersHorizontal, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface Preference {
  id: string
  text: string
  createdAt: Date
  updatedAt: Date
}

interface PreferencesClientProps {
  initialPreferences: Preference[]
}

export default function PreferencesClient({ initialPreferences }: PreferencesClientProps) {
  const [preferences, setPreferences] = useState<Preference[]>(initialPreferences)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [newText, setNewText] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const newTextareaRef = useRef<HTMLTextAreaElement>(null)

  const handleStartAdd = () => {
    setIsAdding(true)
    setNewText('')
    setError(null)
    setTimeout(() => newTextareaRef.current?.focus(), 0)
  }

  const handleCancelAdd = () => {
    setIsAdding(false)
    setNewText('')
    setError(null)
  }

  const handleCreate = async () => {
    if (!newText.trim()) {
      setError('テキストを入力してください')
      return
    }
    setIsCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newText.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error?.message || '作成に失敗しました')
        return
      }
      setPreferences((prev) => [...prev, data.data])
      setIsAdding(false)
      setNewText('')
    } catch {
      setError('予期しないエラーが発生しました')
    } finally {
      setIsCreating(false)
    }
  }

  const handleStartEdit = (preference: Preference) => {
    setEditingId(preference.id)
    setEditingText(preference.text)
    setError(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingText('')
    setError(null)
  }

  const handleSave = async (id: string) => {
    if (!editingText.trim()) {
      setError('テキストを入力してください')
      return
    }
    setSavingId(id)
    setError(null)
    try {
      const res = await fetch(`/api/preferences/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editingText.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error?.message || '保存に失敗しました')
        return
      }
      setPreferences((prev) =>
        prev.map((p) => (p.id === id ? data.data : p))
      )
      setEditingId(null)
    } catch {
      setError('予期しないエラーが発生しました')
    } finally {
      setSavingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    setError(null)
    try {
      const res = await fetch(`/api/preferences/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error?.message || '削除に失敗しました')
        return
      }
      setPreferences((prev) => prev.filter((p) => p.id !== id))
    } catch {
      setError('予期しないエラーが発生しました')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="text-sm text-destructive bg-destructive/10 border border-destructive/20 px-3 py-2.5 rounded-lg">
          {error}
        </p>
      )}

      {preferences.length === 0 && !isAdding && (
        <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-xl">
          <SlidersHorizontal className="h-8 w-8 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">好みがまだ登録されていません</p>
          <p className="text-xs text-muted-foreground/70 mt-1">好みを追加して記事のスコアリングを改善しましょう</p>
        </div>
      )}

      {preferences.map((preference, index) => (
        <div key={preference.id} className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/30 rounded-t-xl">
            <span className="text-xs font-medium text-muted-foreground">#{index + 1}</span>
          </div>
          <div className="p-4">
            {editingId === preference.id ? (
              <div className="space-y-3">
                <Textarea
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  disabled={savingId === preference.id}
                  className="min-h-[80px] resize-y text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') handleCancelEdit()
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave(preference.id)
                  }}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleSave(preference.id)}
                    disabled={savingId === preference.id}
                    className="gap-1.5 cursor-pointer"
                  >
                    {savingId === preference.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Check className="h-3.5 w-3.5" />
                    }
                    保存
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelEdit}
                    disabled={savingId === preference.id}
                    className="cursor-pointer"
                  >
                    キャンセル
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <p className="flex-1 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {preference.text}
                </p>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleStartEdit(preference)}
                    disabled={!!deletingId}
                    className="h-7 w-7 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    title="編集"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(preference.id)}
                    disabled={deletingId === preference.id}
                    className="h-7 w-7 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                    title="削除"
                  >
                    {deletingId === preference.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Trash2 className="h-3.5 w-3.5" />
                    }
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}

      {isAdding ? (
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/30 rounded-t-xl">
            <Plus className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">新しい好みを追加</span>
          </div>
          <div className="p-4 space-y-3">
            <Textarea
              ref={newTextareaRef}
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="例：テクノロジーとAIに関する記事が好きです"
              disabled={isCreating}
              className="min-h-[80px] resize-y text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Escape') handleCancelAdd()
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleCreate()
              }}
            />
            <p className="text-xs text-muted-foreground">
              Cmd/Ctrl + Enter で保存できます
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={isCreating}
                className="gap-1.5 cursor-pointer"
              >
                {isCreating
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Plus className="h-3.5 w-3.5" />
                }
                追加する
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancelAdd}
                disabled={isCreating}
                className="cursor-pointer"
              >
                キャンセル
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={handleStartAdd}
          className="w-full gap-2 cursor-pointer border-dashed"
        >
          <Plus className="h-4 w-4" />
          好みを追加
        </Button>
      )}
    </div>
  )
}
