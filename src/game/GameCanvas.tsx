import { useEffect, useRef, useState } from 'react'
import {
  ARENA,
  createState,
  retryLevel,
  tryShootBlue,
  updateGame,
} from './engine'
import { getLevel } from './levels'
import { unlockAudio } from './sound'
import { renderGame } from './render'
import type { GameState } from './types'
import './GameCanvas.css'

type Props = {
  levelId: number
  onWin: (levelId: number) => void
  onBack: () => void
}

export function GameCanvas({ levelId, onWin, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<GameState>(createState(levelId))
  const onWinRef = useRef(onWin)
  onWinRef.current = onWin
  const levelMeta = getLevel(levelId)
  const [hint, setHint] = useState('Tap / click to shoot')
  const [runKey, setRunKey] = useState(0)

  useEffect(() => {
    stateRef.current = createState(levelId)
    setHint('Tap / click to shoot')
  }, [levelId, runKey])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let last = performance.now()
    let settleAt = 0
    let handled = false

    const tick = (now: number) => {
      const raw = (now - last) / 1000
      const dt = Math.min(0.033, raw)
      last = now

      let state = updateGame(stateRef.current, dt)

      if (
        (state.phase === 'won' || state.phase === 'lost') &&
        settleAt === 0
      ) {
        settleAt = now + 1000
        setHint(state.phase === 'won' ? 'You win!' : 'CPU wins — retrying…')
      }

      if (settleAt && now >= settleAt && !handled) {
        handled = true
        if (state.phase === 'won') {
          onWinRef.current(state.level)
          return
        }
        if (state.phase === 'lost') {
          state = retryLevel(state)
          settleAt = 0
          handled = false
          setHint('Tap / click to shoot')
          setRunKey((k) => k + 1)
        }
      }

      stateRef.current = state
      renderGame(ctx, state)
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [levelId, runKey])

  const fire = () => {
    unlockAudio()
    stateRef.current = tryShootBlue(stateRef.current)
  }

  return (
    <div className="game-shell">
      <header className="game-top">
        <button type="button" className="back-chip" onClick={onBack}>
          ← Levels
        </button>
        <div className="level-chip">
          Lv {levelId} · {levelMeta.name}
        </div>
      </header>

      <p className="mode-chip">You (blue) vs CPU (red)</p>

      <button
        type="button"
        className="canvas-hit"
        onPointerDown={(e) => {
          e.preventDefault()
          fire()
        }}
        aria-label="Shoot"
      >
        <canvas
          ref={canvasRef}
          width={ARENA.width}
          height={ARENA.height}
          className="game-canvas"
        />
      </button>

      <p className="hint">{hint}</p>
      <p className="subhint">{levelMeta.tier} · {levelMeta.blurb}</p>
    </div>
  )
}
