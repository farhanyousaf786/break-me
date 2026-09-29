import { useEffect, useRef } from 'react'
import { drawCharacter } from './character'
import { canvasPainter } from './render'
import { getSkin } from './skins'

type Props = {
  skinId: string
  side: 'blue' | 'red'
  size: number
}

const TEAM = { blue: '#5ec8ff', red: '#ff6b7a' }

/** Animated (bob + blink) portrait of a skin, drawn with the same code as in-game. */
export function SkinPreview({ skinId, side, size }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    const painter = canvasPainter(ctx)
    const skin = getSkin(skinId)
    const pose = {
      angle: side === 'blue' ? 0.25 : Math.PI - 0.25,
      spin: 0,
      kick: 0,
      color: TEAM[side],
      seed: skinId.length,
    }
    // The character plus its gun spans roughly 110 units across.
    const zoom = (size / 110) * dpr

    let raf = 0
    const tick = (now: number) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.setTransform(zoom, 0, 0, zoom, canvas.width / 2, canvas.height / 2 + 4 * zoom)
      drawCharacter(painter, side === 'blue' ? -8 : 8, 0, pose, skin, now)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [skinId, side, size])

  return <canvas ref={ref} style={{ width: size, height: size }} aria-hidden />
}
