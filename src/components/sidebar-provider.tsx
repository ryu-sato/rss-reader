'use client'

import { useState, useCallback, Suspense } from 'react'
import { Menu, Rss } from 'lucide-react'
import Link from 'next/link'
import { Sidebar } from './sidebar'

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const handleClose = useCallback(() => setOpen(false), [])

  return (
    <>
      {/* Mobile: backdrop overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={handleClose}
        />
      )}

      {/* Sidebar */}
      <Suspense>
        <Sidebar mobileOpen={open} onMobileClose={handleClose} />
      </Suspense>

      {/* Main content area */}
      <div className="flex-1 overflow-hidden min-w-0 flex flex-col min-h-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center h-11 px-3 border-b border-border bg-background/95 backdrop-blur shrink-0 gap-2">
          <button
            onClick={() => setOpen(true)}
            className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent transition-colors"
            aria-label="メニューを開く"
          >
            <Menu className="h-4 w-4" />
          </button>
          <Link href="/" className="flex items-center gap-2">
            <Rss className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">RSS Reader</span>
          </Link>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-hidden min-w-0 min-h-0">
          {children}
        </div>
      </div>
    </>
  )
}
