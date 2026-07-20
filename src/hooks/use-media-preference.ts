'use client'

import { useSyncExternalStore } from 'react'

function subscribe(query: string, callback: () => void) {
  const mql = window.matchMedia(query)
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}

function useMediaPreference(query: string): boolean {
  return useSyncExternalStore(
    (callback) => subscribe(query, callback),
    () => window.matchMedia(query).matches,
    () => false
  )
}

/** OS/ブラウザの「視差効果を減らす」設定。true の間はスプリング/スライドではなく短いクロスフェードに切り替える。 */
export function useReducedMotion(): boolean {
  return useMediaPreference('(prefers-reduced-motion: reduce)')
}

/** OS/ブラウザの「透明度を下げる」設定。true の間は backdrop-filter の代わりにほぼ不透明な背景を使う。 */
export function useReducedTransparency(): boolean {
  return useMediaPreference('(prefers-reduced-transparency: reduce)')
}

/** OS/ブラウザの「コントラストを上げる」設定。 */
export function useMoreContrast(): boolean {
  return useMediaPreference('(prefers-contrast: more)')
}
