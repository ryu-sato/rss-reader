'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'

interface DeleteDigestButtonProps {
  digestId: string
}

export default function DeleteDigestButton({ digestId }: DeleteDigestButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm('このダイジェストを削除しますか？')) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/digests/${digestId}`, { method: 'DELETE' })
      if (response.ok) {
        router.push('/digests')
        router.refresh()
      }
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50 cursor-pointer"
    >
      {isDeleting ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" />
      )}
      <span>削除</span>
    </button>
  )
}
