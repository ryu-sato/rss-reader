export type HotkeyAction =
  | 'readLater'
  | 'closeModal'
  | 'prevArticle'
  | 'nextArticle'
  | 'openOriginal'

export const DEFAULT_HOTKEYS: Record<HotkeyAction, string> = {
  readLater: 'b',
  closeModal: 'Escape',
  prevArticle: 'ArrowLeft',
  nextArticle: 'ArrowRight',
  openOriginal: 'o',
}

export const HOTKEY_LABELS: Record<HotkeyAction, string> = {
  readLater: 'あとで読む',
  closeModal: 'モーダルを閉じる',
  prevArticle: '前の記事へ',
  nextArticle: '次の記事へ',
  openOriginal: '元の記事を開く',
}

export const HOTKEY_ACTIONS: HotkeyAction[] = [
  'readLater',
  'closeModal',
  'prevArticle',
  'nextArticle',
  'openOriginal',
]

const STORAGE_KEY = 'rss-reader-hotkeys'

export function loadHotkeyConfig(): Record<HotkeyAction, string> {
  if (typeof window === 'undefined') return { ...DEFAULT_HOTKEYS }
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return { ...DEFAULT_HOTKEYS, ...parsed }
    }
  } catch {}
  return { ...DEFAULT_HOTKEYS }
}

export function saveHotkeyConfig(config: Record<HotkeyAction, string>): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export function formatKeyDisplay(key: string): string {
  const map: Record<string, string> = {
    Escape: 'Esc',
    ArrowLeft: '←',
    ArrowRight: '→',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ' ': 'Space',
    Enter: 'Enter',
    Backspace: '⌫',
    Delete: 'Del',
    Tab: 'Tab',
  }
  return map[key] ?? key.toUpperCase()
}
