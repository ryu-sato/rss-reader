import type { Transition } from 'motion/react'

/**
 * Apple 流体インターフェースのスプリングプリセット。
 * damping/response を Motion の bounce/duration API に変換して定義している。
 * (WWDC18 "Designing Fluid Interfaces" の値に準拠)
 */
export const SPRINGS = {
  /** 既定の UI 遷移。オーバーシュートなしで滑らかに収束する。 */
  settle: { type: 'spring', bounce: 0, duration: 0.4 } as const satisfies Transition,
  /** フリック/ドラッグ解放など、ジェスチャーが運動量を持っていた場合のみ使う。 */
  momentum: { type: 'spring', bounce: 0.2, duration: 0.4 } as const satisfies Transition,
  /** ドロワー/シート。 */
  drawer: { type: 'spring', bounce: 0.15, duration: 0.3 } as const satisfies Transition,
  /** 回転。 */
  rotation: { type: 'spring', bounce: 0.2, duration: 0.4 } as const satisfies Transition,
} satisfies Record<string, Transition>

/** prefers-reduced-motion 時に springs の代わりに使うクロスフェード用トランジション。 */
export const REDUCED_MOTION_TRANSITION: Transition = { type: 'tween', duration: 0.15, ease: 'easeOut' }

export function withReducedMotion(spring: Transition, reduced: boolean): Transition {
  return reduced ? REDUCED_MOTION_TRANSITION : spring
}

/**
 * 境界を越えたドラッグ量を漸進的に減衰させる(ラバーバンド)。
 * overshoot: 境界からの生の距離(px)。dimension: 抵抗の基準になる長さ(通常は要素幅/高さ)。
 */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  const sign = overshoot < 0 ? -1 : 1
  const magnitude = Math.abs(overshoot)
  return sign * (magnitude * dimension * constant) / (dimension + constant * magnitude)
}

/**
 * リリース時の速度(px/s)から、慣性で落ち着く先の位置を予測する。
 * Apple 標準の指数減衰モデル(v²/2a ではない)。
 */
export function project(velocity: number, decelerationRate = 0.998): number {
  return (velocity / 1000) * decelerationRate / (1 - decelerationRate)
}

/** ジェスチャーの速度履歴から直近の速度(px/s)を算出するための小さなバッファ。 */
export class VelocityTracker {
  private samples: Array<{ t: number; v: number }> = []
  private readonly windowMs: number

  constructor(windowMs = 100) {
    this.windowMs = windowMs
  }

  push(value: number, time = performance.now()) {
    this.samples.push({ t: time, v: value })
    const cutoff = time - this.windowMs
    while (this.samples.length > 1 && this.samples[0].t < cutoff) this.samples.shift()
  }

  reset() {
    this.samples = []
  }

  /** 直近ウィンドウ内の平均速度(px/s)。サンプルが不足していれば 0。 */
  velocity(): number {
    if (this.samples.length < 2) return 0
    const first = this.samples[0]
    const last = this.samples[this.samples.length - 1]
    const dt = last.t - first.t
    if (dt <= 0) return 0
    return ((last.v - first.v) / dt) * 1000
  }
}
