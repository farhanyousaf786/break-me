import { BlurMask, Canvas, Circle, LinearGradient, Path, Rect, Skia, vec } from '@shopify/react-native-skia'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Animated, Easing, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native'
import { BEST_OF_OPTIONS, winsNeeded, type BestOf } from '../net/rooms'
import { MysteryOpponent } from './LobbyWidgets'
import { getSkin } from './skins'
import { SkinPreview } from './SkinPreview'
import { playTap } from './sound'
import { colors } from './theme'

const FIGHTER = 104
const ME_LINES = ["Let's go!", 'Pew pew!', "I'm ready!", 'Bring it!']
const SPARKLES = [
  { x: 0.08, y: 0.14, s: 12, d: 0 },
  { x: 0.9, y: 0.1, s: 10, d: 500 },
  { x: 0.5, y: 0.06, s: 9, d: 900 },
  { x: 0.18, y: 0.55, s: 8, d: 1300 },
  { x: 0.84, y: 0.5, s: 11, d: 300 },
]

function useLoop(duration: number, delay = 0) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    )
    anim.start()
    return () => anim.stop()
  }, [v, duration, delay])
  return v
}

/** Soft split backdrop: blue on your side, pink on theirs, a lightning seam and glow blobs. */
function Backdrop({ w, h }: { w: number; h: number }) {
  const paths = useMemo(() => {
    const left = Skia.Path.Make()
    left.moveTo(0, 0).lineTo(w * 0.56, 0).lineTo(w * 0.47, h * 0.42).lineTo(w * 0.53, h * 0.42).lineTo(w * 0.44, h).lineTo(0, h).close()
    const bolt = Skia.Path.Make()
    bolt.moveTo(w * 0.56, 0).lineTo(w * 0.47, h * 0.42).lineTo(w * 0.53, h * 0.42).lineTo(w * 0.44, h)
    return { left, bolt }
  }, [w, h])
  const dots = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        x: ((i * 73) % 100) / 100,
        y: ((i * 41 + 17) % 100) / 100,
        r: 1 + ((i * 7) % 3) * 0.6,
      })),
    [],
  )
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Rect x={0} y={0} width={w} height={h}>
        <LinearGradient start={vec(w, 0)} end={vec(w * 0.4, h)} colors={['#7a2a74', '#4a1f5e', '#2a1848']} />
      </Rect>
      <Path path={paths.left}>
        <LinearGradient start={vec(0, 0)} end={vec(w * 0.5, h)} colors={['#2a5bd7', '#2b3a9a', '#231a5c']} />
      </Path>
      <Circle cx={w * 0.2} cy={h * 0.32} r={70} color="rgba(94, 200, 255, 0.35)">
        <BlurMask blur={40} style="normal" />
      </Circle>
      <Circle cx={w * 0.8} cy={h * 0.32} r={70} color="rgba(255, 107, 180, 0.35)">
        <BlurMask blur={40} style="normal" />
      </Circle>
      {dots.map((d, i) => (
        <Circle key={i} cx={d.x * w} cy={d.y * h} r={d.r} color="rgba(255, 255, 255, 0.35)" />
      ))}
      <Path path={paths.bolt} style="stroke" strokeWidth={8} color="rgba(255, 207, 63, 0.25)">
        <BlurMask blur={6} style="normal" />
      </Path>
      <Path path={paths.bolt} style="stroke" strokeWidth={2.5} strokeJoin="round" color="rgba(255, 230, 150, 0.9)" />
    </Canvas>
  )
}

function Sparkle({ x, y, s, d, w, h }: { x: number; y: number; s: number; d: number; w: number; h: number }) {
  const v = useLoop(1800, d)
  return (
    <Animated.Text
      pointerEvents="none"
      style={[
        styles.sparkle,
        {
          left: x * w,
          top: y * h,
          fontSize: s,
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.2] }) }],
        },
      ]}
    >
      ✦
    </Animated.Text>
  )
}

function Bubble({ lines, side, delay }: { lines: string[]; side: 'left' | 'right'; delay: number }) {
  const [i, setI] = useState(0)
  const pop = useRef(new Animated.Value(1)).current
  useEffect(() => {
    let t: ReturnType<typeof setInterval>
    const start = setTimeout(() => {
      t = setInterval(() => {
        pop.setValue(0)
        setI((n) => (n + 1) % lines.length)
        Animated.spring(pop, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }).start()
      }, 2600)
    }, delay)
    return () => {
      clearTimeout(start)
      clearInterval(t)
    }
  }, [lines.length, delay, pop])
  return (
    <Animated.View style={[styles.bubble, side === 'left' ? styles.bubbleLeft : styles.bubbleRight, { transform: [{ scale: pop }] }]}>
      <Text style={styles.bubbleText}>{lines[i]}</Text>
      <View style={[styles.bubbleTail, side === 'left' ? styles.tailLeft : styles.tailRight]} />
    </Animated.View>
  )
}

function Fighter({
  side,
  tag,
  name,
  delay,
  children,
}: {
  side: 'blue' | 'red'
  tag: string
  name: string
  delay: number
  children: ReactNode
}) {
  const bob = useLoop(1400, delay)
  const tint = side === 'blue' ? colors.blue : '#ff7eb6'
  return (
    <View style={styles.fighter}>
      {/* One chat bubble only — on your fighter — so the card stays readable. */}
      {side === 'blue' && <Bubble lines={ME_LINES} side="left" delay={delay * 3} />}
      <View style={{ width: FIGHTER, height: FIGHTER, alignItems: 'center', justifyContent: 'flex-end' }}>
        <Animated.View
          style={[
            styles.platform,
            {
              backgroundColor: tint,
              transform: [{ scaleX: bob.interpolate({ inputRange: [0, 1], outputRange: [1, 0.86] }) }],
            },
          ]}
        />
        <Animated.View
          style={[StyleSheet.absoluteFill, { transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) }] }]}
        >
          {children}
        </Animated.View>
      </View>
      <View style={[styles.tag, { backgroundColor: tint }]}>
        <Text style={styles.tagText}>{tag}</Text>
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
    </View>
  )
}

function starPath(size: number, points: number) {
  const p = Skia.Path.Make()
  const c = size / 2
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? c - 2 : c * 0.72
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2
    const x = c + Math.cos(a) * r
    const y = c + Math.sin(a) * r
    if (i === 0) p.moveTo(x, y)
    else p.lineTo(x, y)
  }
  p.close()
  return p
}

const VS_SIZE = 64

function VsBurst() {
  const spin = useRef(new Animated.Value(0)).current
  const pulse = useLoop(1100)
  useEffect(() => {
    const anim = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true }))
    anim.start()
    return () => anim.stop()
  }, [spin])
  const star = useMemo(() => starPath(VS_SIZE, 12), [])
  return (
    <Animated.View style={[styles.vs, { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) }] }]}>
      <Animated.View
        style={[StyleSheet.absoluteFill, { transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}
      >
        <Canvas style={{ width: VS_SIZE, height: VS_SIZE }}>
          <Path path={star} color={colors.gold} />
          <Path path={star} style="stroke" strokeWidth={3} strokeJoin="round" color="#7a4f00" />
        </Canvas>
      </Animated.View>
      <Text style={styles.vsText}>VS</Text>
    </Animated.View>
  )
}

function RoundChips({ value, onChange }: { value: BestOf; onChange: (v: BestOf) => void }) {
  return (
    <View style={styles.roundsWrap}>
      <Text style={styles.roundsLabel}>HOW MANY ROUNDS?</Text>
      <View style={styles.chips}>
        {BEST_OF_OPTIONS.map((n) => {
          const on = n === value
          const need = winsNeeded(n)
          return (
            <Pressable
              key={n}
              onPress={() => {
                playTap()
                onChange(n)
              }}
              style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && styles.chipPressed]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`Best of ${n}`}
            >
              <Text style={[styles.chipNum, on && styles.chipInk]}>{n}</Text>
              <View style={styles.dots}>
                {Array.from({ length: n }, (_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, on ? (i < need ? styles.dotWin : styles.dotOnRest) : i < need ? styles.dotOff : styles.dotOffRest]}
                  />
                ))}
              </View>
              <Text style={[styles.chipSub, on && styles.chipInk]}>{n === 1 ? 'Quick' : `Win ${need}`}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

export function QuickMatchCard({
  mySkin,
  bestOf,
  onBestOf,
  children,
}: {
  mySkin: string
  bestOf: BestOf
  onBestOf: (v: BestOf) => void
  children: ReactNode
}) {
  const [size, setSize] = useState({ w: 0, h: 0 })
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    if (width !== size.w || height !== size.h) setSize({ w: width, h: height })
  }
  const glow = useLoop(1600)
  const need = winsNeeded(bestOf)

  return (
    <View style={styles.card} onLayout={onLayout}>
      {size.w > 0 && <Backdrop w={size.w} h={size.h} />}
      {size.w > 0 && SPARKLES.map((s, i) => <Sparkle key={i} {...s} w={size.w} h={size.h} />)}

      <View style={styles.titlePill}>
        <Text style={styles.titleBolt}>⚡</Text>
        <Text style={styles.title}>QUICK MATCH</Text>
        <Text style={styles.titleBolt}>⚡</Text>
      </View>

      <View style={styles.arena}>
        <Fighter side="blue" tag="YOU" name={getSkin(mySkin).name} delay={0}>
          <SkinPreview skinId={mySkin} side="blue" size={FIGHTER} animated />
        </Fighter>
        <VsBurst />
        <Fighter side="red" tag="RIVAL" name="Mystery player" delay={350}>
          <MysteryOpponent mySkin={mySkin} size={FIGHTER} />
        </Fighter>
      </View>

      <RoundChips value={bestOf} onChange={onBestOf} />

      <Animated.View style={[styles.action, { transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] }) }] }]}>
        <Animated.View
          pointerEvents="none"
          style={[styles.actionGlow, { opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.7] }) }]}
        />
        {children}
      </Animated.View>

      <Text style={styles.hint}>
        {bestOf === 1 ? 'One round · winner takes all!' : `Win ${need} of ${bestOf} rounds · new arena every round`}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 2.5,
    borderColor: 'rgba(255, 207, 63, 0.6)',
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 12,
    gap: 10,
    alignItems: 'center',
    backgroundColor: '#2a1848',
  },
  sparkle: {
    position: 'absolute',
    color: '#fff6c8',
  },
  titlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(12, 11, 29, 0.55)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 207, 63, 0.7)',
  },
  titleBolt: {
    fontSize: 13,
  },
  title: {
    color: colors.gold,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 3,
  },
  arena: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fighter: {
    flex: 1,
    alignItems: 'center',
  },
  platform: {
    position: 'absolute',
    bottom: FIGHTER * 0.06,
    width: FIGHTER * 0.66,
    height: FIGHTER * 0.15,
    borderRadius: 999,
    opacity: 0.6,
  },
  tag: {
    marginTop: 2,
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.85)',
  },
  tagText: {
    color: '#10122a',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  name: {
    marginTop: 3,
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
    maxWidth: '90%',
  },
  bubble: {
    position: 'absolute',
    top: -4,
    zIndex: 2,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  bubbleLeft: {
    left: 4,
  },
  bubbleRight: {
    right: 4,
  },
  bubbleText: {
    color: '#2a1848',
    fontSize: 11,
    fontWeight: '900',
  },
  bubbleTail: {
    position: 'absolute',
    bottom: -4,
    width: 9,
    height: 9,
    backgroundColor: '#ffffff',
    transform: [{ rotate: '45deg' }],
  },
  tailLeft: {
    left: 14,
  },
  tailRight: {
    right: 14,
  },
  vs: {
    width: VS_SIZE,
    height: VS_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  vsText: {
    color: '#3d2805',
    fontSize: 20,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  roundsWrap: {
    alignSelf: 'stretch',
    gap: 5,
  },
  roundsLabel: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1b1538',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  chipOn: {
    backgroundColor: colors.gold,
    borderColor: '#ffffff',
    transform: [{ scale: 1.05 }],
  },
  chipPressed: {
    opacity: 0.8,
  },
  chipNum: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 22,
  },
  chipInk: {
    color: '#3d2805',
  },
  chipSub: {
    color: colors.textDim,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  dots: {
    flexDirection: 'row',
    gap: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotWin: {
    backgroundColor: '#3d2805',
  },
  dotOnRest: {
    backgroundColor: 'rgba(61, 40, 5, 0.3)',
  },
  dotOff: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  dotOffRest: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  action: {
    alignSelf: 'stretch',
    paddingHorizontal: 40,
  },
  actionGlow: {
    position: 'absolute',
    top: -3,
    bottom: -3,
    left: 36,
    right: 36,
    borderRadius: 18,
    backgroundColor: colors.green,
  },
  hint: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
})
