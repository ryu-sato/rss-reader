'use client'

import { useState, useCallback, Suspense } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Menu, Rss } from 'lucide-react'
import Link from 'next/link'
import { Sidebar } from './sidebar'
import { useReducedMotion } from '@/hooks/use-media-preference'
import { SPRINGS, withReducedMotion } from '@/lib/motion'

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const handleClose = useCallback(() => setOpen(false), [])
  const reducedMotion = useReducedMotion()

  return (
    <>
      {/* Mobile: backdrop overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="sidebar-scrim"
            className="md:hidden fixed inset-0 z-40 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={withReducedMotion(SPRINGS.settle, reducedMotion)}
            onClick={handleClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <Suspense>
        <Sidebar mobileOpen={open} onMobileClose={handleClose} />
      </Suspense>

      {/* Main content area */}
      <div className="flex-1 overflow-hidden min-w-0 flex flex-col min-h-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center h-11 px-3 border-b border-border/70 material-chrome shrink-0 gap-2.5">
          <button
            onClick={() => setOpen(true)}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 active:bg-muted transition-all duration-150"
            aria-label="メニューを開く"
          >
            <Menu className="h-4 w-4" />
          </button>
          <Link href="/" className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center shrink-0">
              <Rss className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold tracking-tight">RSS Reader</span>
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
