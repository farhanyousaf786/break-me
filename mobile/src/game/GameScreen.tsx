import { Canvas, Picture, createPicture, type SkPicture } from '@shopify/react-native-skia'
import { useEffect, useRef, useState } from 'react'
import { AppState, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native'
import { ARENA, createState, retryLevel, tryShootBlue, updateGame } from './engine'
import { getLevel } from './levels'
import { renderGame } from './render'
import { colors } from './theme'
import type { GameState } from './types'

type Props = {
  levelId: number
  onWin: (levelId: number) => void
  onBack: () => void
}

const READY_HINT = 'Tap to shoot'
const START_PROMPT = 'TAP TO START'
const RETRY_PROMPT = 'TAP TO RETRY'
const RESUME_PROMPT = 'TAP TO RESUME'

function drawFrame(state: GameState, scale: number, prompt?: string): SkPicture {
  return createPicture(
    (canvas) => {
      canvas.scale(scale, scale)
      renderGame(canvas, state, prompt)
    },
    { width: ARENA.width * scale, height: ARENA.height * scale },
  )
}

export function GameScreen({ levelId, onWin, onBack }: Props) {
  const level = getLevel(levelId)
  const stateRef = useRef<GameState>(createState(levelId))
  const onWinRef = useRef(onWin)
  useEffect(() => {
    onWinRef.current = onWin
  }, [onWin])

  const [scale, setScale] = useState(0)
  const scaleRef = useRef(0)
  const [picture, setPicture] = useState<SkPicture | null>(null)
  const [hint, setHint] = useState('Tap to start')

  // While set, the round is frozen (nobody moves or shoots) and this banner is shown.
  const promptRef = useRef<string | null>(START_PROMPT)
  const needsDrawRef = useRef(true)

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    const s = Math.min(width / ARENA.width, height / ARENA.height)
    scaleRef.current = s
    needsDrawRef.current = true
    setScale(s)
  }

  const pause = (prompt: string, hintText: string) => {
    promptRef.current = prompt
    needsDrawRef.current = true
    setHint(hintText)
  }

  useEffect(() => {
    const sub = AppState.addEventListener('change', (status) => {
      if (status !== 'active' && promptRef.current === null && stateRef.current.phase === 'playing') {
        pause(RESUME_PROMPT, 'Paused')
      }
    })
    return () => sub.remove()
  }, [])

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let settleAt = 0
    let done = false

    const tick = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now

      if (promptRef.current !== null) {
        // Frozen: only redraw when something visible changed, so idle screens cost nothing.
        if (needsDrawRef.current && scaleRef.current > 0) {
          needsDrawRef.current = false
          setPicture(drawFrame(stateRef.current, scaleRef.current, promptRef.current))
        }
        raf = requestAnimationFrame(tick)
        return
      }

      let state = updateGame(stateRef.current, dt)

      if ((state.phase === 'won' || state.phase === 'lost') && settleAt === 0) {
        settleAt = now + 1000
        setHint(state.phase === 'won' ? 'You win!' : 'CPU wins')
      }

      if (settleAt && now >= settleAt) {
        settleAt = 0
        if (state.phase === 'won') {
          done = true
          onWinRef.current(state.level)
          return
        }
        state = retryLevel(state)
        pause(RETRY_PROMPT, 'Tap to try again')
      }

      stateRef.current = state
      if (scaleRef.current > 0) {
        setPicture(drawFrame(state, scaleRef.current, promptRef.current ?? undefined))
      }
      if (!done) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [levelId])

  const fire = () => {
    if (promptRef.current !== null) {
      promptRef.current = null
      setHint(READY_HINT)
      return
    }
    stateRef.current = tryShootBlue(stateRef.current)
  }

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.back}>← Levels</Text>
        </Pressable>
        <Text style={styles.levelChip}>
          Lv {levelId} · {level.name}
        </Text>
      </View>
      <Text style={styles.mode}>You (blue) vs CPU (red)</Text>

      <View style={styles.stage} onLayout={onLayout}>
        {scale > 0 && (
          <Pressable
            onPressIn={fire}
            style={[
              styles.arena,
              { width: ARENA.width * scale, height: ARENA.height * scale },
            ]}
          >
            <Canvas style={StyleSheet.absoluteFill}>
              {picture && <Picture picture={picture} />}
            </Canvas>
          </Pressable>
        )}
      </View>

      <Text style={styles.hint}>{hint}</Text>
      <Text style={styles.subhint}>
        {level.tier} · {level.blurb}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 6,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  back: {
    color: colors.textDim,
    fontWeight: '700',
    fontSize: 15,
  },
  levelChip: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  mode: {
    color: colors.blueSoft,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arena: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(230, 198, 92, 0.35)',
  },
  hint: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
  },
  subhint: {
    color: colors.textFaint,
    fontSize: 13,
    textAlign: 'center',
  },
})
