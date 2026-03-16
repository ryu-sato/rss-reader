'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  HotkeyAction,
  loadHotkeyConfig,
  saveHotkeyConfig,
  DEFAULT_HOTKEYS,
} from '@/lib/hotkey-config'

export function useHotkeyConfig() {
  const [config, setConfig] = useState<Record<HotkeyAction, string>>({ ...DEFAULT_HOTKEYS })

  useEffect(() => {
    setConfig(loadHotkeyConfig())
  }, [])

  const updateHotkey = useCallback((action: HotkeyAction, key: string) => {
    setConfig((prev) => {
      const next = { ...prev, [action]: key }
      saveHotkeyConfig(next)
      return next
    })
  }, [])

  const resetHotkeys = useCallback(() => {
    const defaults = { ...DEFAULT_HOTKEYS }
    setConfig(defaults)
    saveHotkeyConfig(defaults)
  }, [])

  return { config, updateHotkey, resetHotkeys }
}
