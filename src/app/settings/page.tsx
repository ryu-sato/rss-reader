'use client'

import { useState, useEffect } from 'react'
import { Keyboard, RotateCcw } from 'lucide-react'
import { useHotkeyConfig } from '@/hooks/use-hotkey-config'
import {
  HOTKEY_LABELS,
  HOTKEY_ACTIONS,
  formatKeyDisplay,
  type HotkeyAction,
} from '@/lib/hotkey-config'

export default function SettingsPage() {
  const { config, updateHotkey, resetHotkeys } = useHotkeyConfig()
  const [listening, setListening] = useState<HotkeyAction | null>(null)

  useEffect(() => {
    if (!listening) return
    const handler = (e: KeyboardEvent) => {
      e.preventDefault()
      if (e.key === 'Escape') {
        setListening(null)
        return
      }
      updateHotkey(listening, e.key)
      setListening(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [listening, updateHotkey])

  return (
    <div className="h-full overflow-y-auto">
      <main className="px-8 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">設定</h1>
          <p className="text-sm text-muted-foreground mt-1.5">アプリの動作をカスタマイズします</p>
        </div>

        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Keyboard className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-base font-semibold">キーボードショートカット</h2>
            </div>
            <button
              onClick={resetHotkeys}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded hover:bg-accent"
            >
              <RotateCcw className="h-3 w-3" />
              デフォルトに戻す
            </button>
          </div>

          <p className="text-xs text-muted-foreground mb-4">
            キーを変更するにはバッジをクリックし、割り当てたいキーを押してください。
          </p>

          <ul className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-card">
            {HOTKEY_ACTIONS.map((action) => (
              <li key={action} className="flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors">
                <span className="text-sm">{HOTKEY_LABELS[action]}</span>
                <button
                  onClick={() => setListening(action)}
                  className={`
                    inline-flex items-center justify-center min-w-[2.5rem] h-7 px-2 rounded text-xs font-mono font-medium border transition-colors
                    ${listening === action
                      ? 'bg-primary text-primary-foreground border-primary animate-pulse'
                      : 'bg-muted text-muted-foreground border-border hover:border-primary hover:text-foreground'
                    }
                  `}
                >
                  {listening === action ? 'キー入力待ち…' : formatKeyDisplay(config[action])}
                </button>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}
