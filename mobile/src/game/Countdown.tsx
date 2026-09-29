import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, StyleSheet, Text, View } from 'react-native'
import { playPowerUp, playTap } from './sound'
import { colors } from './theme'

const STEP_MS = 800
const GO_MS = 700
/** Time from mount until GO appears (when `onGo` fires and play should begin). */
export const COUNTDOWN_MS = STEP_MS * 3

const STEPS = [
  { text: '3', note: 'Ready?', color: colors.red, ink: '#4a0d16' },
  { text: '2', note: 'Aim…', color: colors.gold, ink: '#3d2805' },
  { text: '1', note: 'Wiggle!', color: colors.blue, ink: '#08304a' },
  { text: 'GO!', note: 'Break them!', color: colors.green, ink: '#063b25' },
]

const SPARKS = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2)

function Step({ index }: { index: number }) {
  const step = STEPS[index]
  const go = index === STEPS.length - 1
  const pop = useRef(new Animated.Value(0)).current
  const out = useRef(new Animated.Value(0)).current
  const burst = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const life = go ? GO_MS : STEP_MS
    Animated.parallel([
      Animated.spring(pop, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }),
      Animated.timing(burst, { toValue: 1, duration: 520, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(life - 220),
        Animated.timing(out, { toValue: 1, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    ]).start()
  }, [pop, out, burst, go])

  const scale = Animated.multiply(
    pop.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }),
    out.interpolate({ inputRange: [0, 1], outputRange: [1, go ? 1.8 : 0.6] }),
  )
  const rotate = pop.interpolate({ inputRange: [0, 1], outputRange: [index % 2 ? '18deg' : '-18deg', '0deg'] })
  const opacity = out.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })

  return (
    <View style={styles.center} pointerEvents="none">
      {SPARKS.map((a, i) => (
        <Animated.View
          key={i}
          style={[
            styles.spark,
            {
              backgroundColor: i % 2 ? '#ffffff' : step.color,
              opacity: burst.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
              transform: [
                { translateX: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(a) * 110] }) },
                { translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(a) * 110] }) },
                { scale: burst.interpolate({ inputRange: [0, 1], outputRange: [1.2, 0.3] }) },
              ],
            },
          ]}
        />
      ))}
      <Animated.View style={[styles.bubble, go && styles.bubbleGo, { backgroundColor: step.color, opacity, transform: [{ scale }, { rotate }] }]}>
        <View style={styles.shine} />
        <Text style={[styles.num, go && styles.numGo, { color: step.ink }]}>{step.text}</Text>
      </Animated.View>
      <Animated.Text style={[styles.note, { color: step.color, opacity }]}>{step.note}</Animated.Text>
    </View>
  )
}

/**
 * Bouncy 3 · 2 · 1 · GO! over the arena. `onGo` fires the moment GO appears; the overlay then
 * fades itself out and calls `onDone`.
 */
export function Countdown({
  onGo,
  onDone,
  title,
  subtitle,
  goAt,
}: {
  onGo: () => void
  onDone?: () => void
  /** `performance.now()` time GO should land on, to line up with another device. Steps never go backwards. */
  goAt?: number
  /** Match rule shown above the numbers, e.g. "BEST OF 3" */
  title?: string
  subtitle?: string
}) {
  const [index, setIndex] = useState(0)
  const cbs = useRef({ onGo, onDone })
  cbs.current = { onGo, onDone }
  const intro = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.spring(intro, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }).start()
  }, [intro])
  const going = index === STEPS.length - 1

  const synced = goAt !== undefined
  useEffect(() => {
    if (goAt === undefined) return
    const sync = () => {
      const left = goAt - performance.now()
      const target = left <= 0 ? STEPS.length - 1 : Math.max(0, STEPS.length - 1 - Math.ceil(left / STEP_MS))
      setIndex((i) => Math.max(i, target))
    }
    sync()
    const t = setInterval(sync, 40)
    return () => clearInterval(t)
  }, [goAt])

  useEffect(() => {
    if (index < STEPS.length - 1) {
      playTap()
      if (synced) return
      const t = setTimeout(() => setIndex((i) => i + 1), STEP_MS)
      return () => clearTimeout(t)
    }
    playPowerUp()
    cbs.current.onGo()
    const t = setTimeout(() => cbs.current.onDone?.(), GO_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  return (
    <View style={styles.overlay} pointerEvents="none">
      {title && (
        <Animated.View
          style={[
            styles.rule,
            {
              opacity: going ? 0 : intro,
              transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }],
            },
          ]}
        >
          <Text style={styles.ruleTitle}>{title}</Text>
          {subtitle && <Text style={styles.ruleSub}>{subtitle}</Text>}
        </Animated.View>
      )}
      <Step key={index} index={index} />
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 6, 24, 0.25)',
  },
  rule: {
    position: 'absolute',
    top: '12%',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 18,
    backgroundColor: 'rgba(21, 17, 46, 0.92)',
    borderWidth: 2,
    borderColor: colors.gold,
  },
  ruleTitle: {
    color: colors.gold,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  ruleSub: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 5,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    overflow: 'hidden',
  },
  bubbleGo: {
    width: 168,
    borderRadius: 64,
  },
  shine: {
    position: 'absolute',
    top: 12,
    left: 22,
    width: 40,
    height: 18,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    transform: [{ rotate: '-20deg' }],
  },
  num: {
    fontSize: 76,
    fontWeight: '900',
    lineHeight: 86,
  },
  numGo: {
    fontSize: 56,
    lineHeight: 66,
  },
  note: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 2 },
  },
  spark: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
})
