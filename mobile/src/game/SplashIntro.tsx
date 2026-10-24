import { BlurMask, Canvas, Circle, Group, Oval, RadialGradient, Rect, vec } from '@shopify/react-native-skia'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect, useMemo, useRef } from 'react'
import { Animated, Easing, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native'
import { SkinPreview } from './SkinPreview'
import { colors } from './theme'
import { Icon } from './ui'

const HOLD_MS = 2800
const FADE_MS = 420
/** Size of one character unit in the native splash image (SPLASH_UNIT * 288dp / 1024 in scripts/gen-icons.ts). */
const SPLASH_UNIT_DP = (8.4 * 288) / 1024

function seeded(seed: number) {
  let s = seed
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

/** Static deep-space backdrop: gradient, nebula clouds and a starfield. */
function SpaceBackdrop({ width, height }: { width: number; height: number }) {
  const stars = useMemo(() => {
    const rand = seeded(11)
    return Array.from({ length: 140 }, () => ({
      x: rand() * width,
      y: rand() * height,
      r: 0.5 + rand() * 1.3,
      a: 0.25 + rand() * 0.6,
    }))
  }, [width, height])

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height}>
        <RadialGradient c={vec(width * 0.5, height * 0.4)} r={Math.max(width, height) * 0.8} colors={['#2d2170', '#0c0b1d']} />
      </Rect>
      <Circle cx={width * 0.15} cy={height * 0.3} r={width * 0.5} color="rgba(94, 200, 255, 0.22)">
        <BlurMask blur={70} style="normal" />
      </Circle>
      <Circle cx={width * 0.9} cy={height * 0.62} r={width * 0.55} color="rgba(177, 140, 255, 0.24)">
        <BlurMask blur={80} style="normal" />
      </Circle>
      <Circle cx={width * 0.55} cy={height * 0.95} r={width * 0.45} color="rgba(255, 107, 170, 0.16)">
        <BlurMask blur={70} style="normal" />
      </Circle>
      {stars.map((s, i) => (
        <Circle key={i} cx={s.x} cy={s.y} r={s.r} color={`rgba(255, 255, 255, ${s.a})`} />
      ))}
    </Canvas>
  )
}

/** A shaded planet with an optional ring that passes behind and in front of it. */
function Planet({ size, light, dark, ring }: { size: number; light: string; dark: string; ring?: string }) {
  const c = size / 2
  const r = size * (ring ? 0.3 : 0.46)
  const ringRect = { x: c - r * 1.8, y: c - r * 0.42, width: r * 3.6, height: r * 0.84 }
  const tilt = [{ rotate: -0.35 }]
  return (
    <Canvas style={{ width: size, height: size }} pointerEvents="none">
      {ring && (
        <Group transform={tilt} origin={vec(c, c)}>
          <Oval rect={ringRect} style="stroke" strokeWidth={size * 0.04} color={ring} />
        </Group>
      )}
      <Circle cx={c} cy={c} r={r}>
        <RadialGradient c={vec(c - r * 0.4, c - r * 0.4)} r={r * 1.5} colors={[light, dark]} />
      </Circle>
      <Circle cx={c - r * 0.3} cy={c + r * 0.25} r={r * 0.18} color="rgba(0, 0, 0, 0.12)" />
      <Circle cx={c + r * 0.35} cy={c - r * 0.1} r={r * 0.12} color="rgba(0, 0, 0, 0.1)" />
      <Circle cx={c} cy={c} r={r} style="stroke" strokeWidth={Math.max(2, size * 0.018)} color="#1f1a2e" />
      {ring && (
        <Group transform={tilt} origin={vec(c, c)} clip={{ x: 0, y: c, width: size, height: size / 2 }}>
          <Oval rect={ringRect} style="stroke" strokeWidth={size * 0.04} color={ring} />
        </Group>
      )}
    </Canvas>
  )
}

function useLoop(duration: number, delay = 0) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    )
    anim.start()
    return () => anim.stop()
  }, [v, duration, delay])
  return v
}

const TWINKLES = [
  { x: 0.12, y: 0.14, size: 14, color: '#ffffff', delay: 0 },
  { x: 0.82, y: 0.1, size: 18, color: colors.gold, delay: 400 },
  { x: 0.9, y: 0.42, size: 12, color: '#bfe6ff', delay: 800 },
  { x: 0.08, y: 0.55, size: 16, color: colors.gold, delay: 200 },
  { x: 0.7, y: 0.82, size: 13, color: '#ffffff', delay: 1100 },
  { x: 0.28, y: 0.88, size: 11, color: '#bfe6ff', delay: 600 },
]

function Twinkle({ x, y, size, color, delay }: (typeof TWINKLES)[number]) {
  const v = useLoop(700, delay)
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.2] }) }],
      }}
    >
      <Icon name="star" size={size} color={color} />
    </Animated.View>
  )
}

/**
 * The OS always shows a native splash (Android 12+ can't opt out). It shows Cosmo centered on the
 * background color, so this intro starts with Cosmo at that exact spot and size, then lifts him into
 * place while the space scene fades in, making both read as one continuous splash.
 */
export function SplashIntro({ onDone, ready = true }: { onDone: () => void; ready?: boolean }) {
  const { width, height } = useWindowDimensions()
  const hero = Math.min(width * 0.48, height * 0.26, 230)
  const startScale = (SPLASH_UNIT_DP * 110) / hero

  const fade = useRef(new Animated.Value(1)).current
  const scene = useRef(new Animated.Value(0)).current
  const pop = useRef(new Animated.Value(0)).current
  const title1 = useRef(new Animated.Value(0)).current
  const title2 = useRef(new Animated.Value(0)).current
  const orbit = useRef(new Animated.Value(0)).current
  const shoot = useRef(new Animated.Value(0)).current
  const lift = useRef(new Animated.Value(0)).current
  const float = useLoop(1200)
  const driftA = useLoop(3000)
  const driftB = useLoop(3600, 500)
  const finished = useRef(false)
  const started = useRef(false)
  const holdElapsed = useRef(false)
  const readyRef = useRef(ready)
  readyRef.current = ready
  const layout = useRef<{ rootH?: number; heroMid?: number }>({})

  const finish = () => {
    if (finished.current) return
    // Skip / timer both count as "hold done"; still wait for auth so menu never flashes under welcome.
    holdElapsed.current = true
    if (!readyRef.current) return
    finished.current = true
    Animated.timing(fade, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(onDone)
  }

  useEffect(() => {
    if (ready && holdElapsed.current) finish()
    // finish reads latest refs; only re-run when ready flips true.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  const start = () => {
    if (started.current) return
    started.current = true
    // Give SkinPreview a few frames to paint Cosmo before the native splash disappears.
    let frames = 3
    const wait = () => {
      if (--frames > 0) return void requestAnimationFrame(wait)
      void SplashScreen.hideAsync().finally(run)
    }
    requestAnimationFrame(wait)
  }

  const onMeasured = () => {
    const { rootH, heroMid } = layout.current
    if (rootH === undefined || heroMid === undefined) return
    lift.setValue(rootH / 2 - heroMid)
    start()
  }

  const run = () => {
    Animated.timing(scene, { toValue: 1, duration: 450, easing: Easing.out(Easing.quad), useNativeDriver: true }).start()
    Animated.spring(pop, { toValue: 1, friction: 6, tension: 60, delay: 80, useNativeDriver: true }).start()
    Animated.spring(lift, { toValue: 0, friction: 7, tension: 50, delay: 80, useNativeDriver: true }).start()
    Animated.stagger(170, [
      Animated.spring(title1, { toValue: 1, friction: 6, tension: 70, delay: 450, useNativeDriver: true }),
      Animated.spring(title2, { toValue: 1, friction: 6, tension: 70, delay: 450, useNativeDriver: true }),
    ]).start()
    Animated.loop(Animated.timing(orbit, { toValue: 1, duration: 5000, easing: Easing.linear, useNativeDriver: true })).start()
    Animated.loop(
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(shoot, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(shoot, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(900),
      ]),
    ).start()
    holdTimer.current = setTimeout(() => {
      holdElapsed.current = true
      finish()
    }, HOLD_MS)
  }

  const holdTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    const fallback = setTimeout(start, 1500)
    return () => {
      clearTimeout(fallback)
      clearTimeout(holdTimer.current)
    }
    // Runs once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const bob = float.interpolate({ inputRange: [0, 1], outputRange: [0, -14] })
  const cosmoY = Animated.add(lift, Animated.multiply(bob, pop))
  const cosmoScale = pop.interpolate({ inputRange: [0, 1], outputRange: [startScale, 1] })
  const spin = orbit.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
  const unspin = orbit.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] })
  const slide = (v: Animated.Value) => ({
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
  })
  const moonOrbit = hero * 0.82

  return (
    <Animated.View
      style={[styles.root, { opacity: fade }]}
      onLayout={(e) => {
        layout.current.rootH = e.nativeEvent.layout.height
        onMeasured()
      }}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: scene }]} pointerEvents="none">
        <SpaceBackdrop width={width} height={height} />

        <Animated.View
          pointerEvents="none"
          style={[
            styles.abs,
            {
              left: -width * 0.28,
              bottom: -width * 0.24,
              transform: [{ translateY: driftA.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }],
            },
          ]}
        >
          <Planet size={width * 0.78} light="#ffb36b" dark="#b3456a" />
        </Animated.View>

        <Animated.View
          pointerEvents="none"
          style={[
            styles.abs,
            {
              right: -width * 0.06,
              top: height * 0.07,
              transform: [
                { translateY: driftB.interpolate({ inputRange: [0, 1], outputRange: [0, 12] }) },
                { rotate: driftB.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] }) },
              ],
            },
          ]}
        >
          <Planet size={width * 0.4} light="#c9b3ff" dark="#5b3fb8" ring={colors.gold} />
        </Animated.View>

        <Animated.View
          pointerEvents="none"
          style={[
            styles.abs,
            { left: width * 0.08, top: height * 0.16, transform: [{ translateX: driftA.interpolate({ inputRange: [0, 1], outputRange: [0, 8] }) }] },
          ]}
        >
          <Planet size={width * 0.13} light="#9fe8ff" dark="#2a7fad" />
        </Animated.View>

        {TWINKLES.map((t, i) => (
          <Twinkle key={i} {...t} />
        ))}

        <Animated.View
          pointerEvents="none"
          style={[
            styles.shooting,
            {
              top: height * 0.08,
              left: width * 0.55,
              opacity: shoot.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0] }),
              transform: [
                { rotate: '-32deg' },
                { translateX: shoot.interpolate({ inputRange: [0, 1], outputRange: [width * 0.4, -width * 0.6] }) },
              ],
            },
          ]}
        />
      </Animated.View>

      <Pressable style={styles.fill} onPress={finish} accessibilityLabel="Skip intro">
        <View
          style={{ width: hero * 2, height: hero * 1.7, alignItems: 'center', justifyContent: 'center' }}
          onLayout={(e) => {
            const { y, height: h } = e.nativeEvent.layout
            layout.current.heroMid = y + h / 2
            onMeasured()
          }}
        >
          <Animated.View
            style={[styles.abs, { width: moonOrbit * 2, height: moonOrbit * 2, opacity: scene, transform: [{ rotate: spin }] }]}
          >
            <Animated.View style={{ position: 'absolute', top: 0, left: moonOrbit - 14, transform: [{ rotate: unspin }] }}>
              <Planet size={28} light="#f1f3fa" dark="#8a94a6" />
            </Animated.View>
          </Animated.View>
          <Animated.View style={{ transform: [{ translateY: cosmoY }, { scale: cosmoScale }] }}>
            <SkinPreview skinId="cosmo" side="blue" size={hero} animated glow={false} />
          </Animated.View>
        </View>

        <Animated.Text style={[styles.title, { fontSize: hero * 0.32, lineHeight: hero * 0.36 }, slide(title1)]}>BREAK</Animated.Text>
        <Animated.Text style={[styles.title, styles.titleSub, { fontSize: hero * 0.24, lineHeight: hero * 0.3 }, slide(title2)]}>
          BUDDIES!
        </Animated.Text>
        <Animated.Text style={[styles.eyebrow, slide(title2)]}>RECOIL DUEL</Animated.Text>
      </Pressable>

      <Animated.Text style={[styles.tap, { opacity: scene }]} pointerEvents="none">
        Tap to skip
      </Animated.Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.bg,
    zIndex: 10,
    overflow: 'hidden',
  },
  abs: {
    position: 'absolute',
  },
  fill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shooting: {
    position: 'absolute',
    width: 110,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#ffffff',
    shadowColor: '#bfe6ff',
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  title: {
    color: colors.gold,
    fontWeight: '900',
    letterSpacing: 1,
    textShadowColor: colors.goldDark,
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 0,
  },
  titleSub: {
    color: '#ffffff',
    textShadowColor: '#3b2f7a',
  },
  eyebrow: {
    marginTop: 10,
    color: colors.blueSoft,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 5,
  },
  tap: {
    position: 'absolute',
    bottom: 36,
    alignSelf: 'center',
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
})
