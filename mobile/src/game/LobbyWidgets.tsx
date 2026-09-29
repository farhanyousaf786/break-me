import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Animated, Easing, StyleSheet, Text, View } from 'react-native'
import { SKINS } from './skins'
import { SkinPreview } from './SkinPreview'
import { useStats } from './stats'
import { colors } from './theme'
import { Icon, Panel } from './ui'

/*
 * Lobby activity numbers are simulated (there is no presence tracking yet): a believable count that
 * follows the time of day and drifts a little every few seconds.
 */
function baseOnline(): number {
  const h = new Date().getHours() + new Date().getMinutes() / 60
  // Quietest around 5am, busiest around 9pm.
  const wave = (1 - Math.cos(((h - 5) / 24) * Math.PI * 2)) / 2
  return Math.round(620 + wave * 1900)
}

export function useLiveCounts() {
  const [online, setOnline] = useState(() => baseOnline() + Math.floor(Math.random() * 60))
  useEffect(() => {
    const id = setInterval(() => {
      setOnline((n) => {
        const target = baseOnline()
        const drift = Math.round((target - n) * 0.1 + (Math.random() - 0.5) * 24)
        return Math.max(300, n + drift)
      })
    }, 2500)
    return () => clearInterval(id)
  }, [])
  const duels = Math.round(online * 0.074)
  const wait = online > 1500 ? 3 : online > 900 ? 5 : 8
  return { online, duels, wait }
}

const fmt = (n: number) => n.toLocaleString('en-US')

function usePulse() {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    )
    anim.start()
    return () => anim.stop()
  }, [v])
  return v
}

function LiveDot() {
  const pulse = usePulse()
  return (
    <View style={styles.dotWrap}>
      <Animated.View
        style={[
          styles.dotRing,
          {
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) }],
          },
        ]}
      />
      <View style={styles.dot} />
    </View>
  )
}

export function LiveBanner() {
  const { online, duels } = useLiveCounts()
  return (
    <Panel style={styles.banner}>
      <View style={styles.bannerMain}>
        <LiveDot />
        <Text style={styles.bannerCount}>{fmt(online)}</Text>
        <Text style={styles.bannerLabel}>online</Text>
      </View>
      <View style={styles.bannerStats}>
        <MiniStat icon="fire" value={fmt(duels)} label="duels live" color={colors.red} />
      </View>
    </Panel>
  )
}

function MiniStat({ icon, value, label, color }: { icon: 'fire' | 'play'; value: string; label: string; color: string }) {
  return (
    <View style={styles.miniStat}>
      <Icon name={icon} size={12} color={color} />
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  )
}

/** Cycles through random characters, like a slot machine picking your opponent. */
function useRoulette(intervalMs: number, exclude: string) {
  const pool = useRef(SKINS.filter((s) => s.id !== exclude).map((s) => s.id)).current
  const [id, setId] = useState(() => pool[Math.floor(Math.random() * pool.length)])
  useEffect(() => {
    const t = setInterval(() => setId(pool[Math.floor(Math.random() * pool.length)]), intervalMs)
    return () => clearInterval(t)
  }, [pool, intervalMs])
  return id
}

export function MysteryOpponent({ mySkin, size, fast }: { mySkin: string; size: number; fast?: boolean }) {
  const id = useRoulette(fast ? 260 : 1100, mySkin)
  return (
    <View style={{ width: size, height: size }}>
      <View style={[StyleSheet.absoluteFill, styles.mystery]}>
        <SkinPreview skinId={id} side="red" size={size} glow={false} />
      </View>
      <View style={styles.qBadge}>
        <Text style={styles.qText}>?</Text>
      </View>
    </View>
  )
}

export function OnlineRecord() {
  const s = useStats()
  const games = s.onlineWins + s.onlineLosses
  const rate = games ? Math.round((s.onlineWins / games) * 100) : 0
  return (
    <View style={styles.record}>
      <RecordTile label="WINS" value={`${s.onlineWins}`} color={colors.green} />
      <RecordTile label="LOSSES" value={`${s.onlineLosses}`} color={colors.red} />
      <RecordTile label="WIN RATE" value={games ? `${rate}%` : '—'} color={colors.gold} />
      <RecordTile label="BEST RUN" value={`${s.bestStreak}`} color={colors.blue} />
    </View>
  )
}

function RecordTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Panel style={styles.recordTile}>
      <Text style={[styles.recordValue, { color }]}>{value}</Text>
      <Text style={styles.recordLabel}>{label}</Text>
    </Panel>
  )
}

const FEED_VERBS = ['broke', 'bonked', 'outshot', 'cracked', 'popped', 'ricocheted', 'smashed']
const FEED_NAMES = ['Ace', 'Pixel', 'Mochi', 'Zed', 'Kiki', 'Bean', 'Rio', 'Nyx', 'Taro', 'Juno', 'Blip', 'Sunny', 'Ozzy', 'Pip']

type FeedItem = { a: string; b: string; skinA: string; skinB: string; verb: string; score: string }

function randomFeed(): FeedItem {
  const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]
  const a = pick(FEED_NAMES)
  let b = pick(FEED_NAMES)
  if (b === a) b = FEED_NAMES[(FEED_NAMES.indexOf(a) + 3) % FEED_NAMES.length]
  return {
    a,
    b,
    skinA: pick(SKINS).id,
    skinB: pick(SKINS).id,
    verb: pick(FEED_VERBS),
    score: pick(['1–0', '2–0', '2–1', '3–1', '3–2']),
  }
}

/** Rotating "just happened" ticker so the lobby feels alive. */
export function LiveFeed() {
  const [item, setItem] = useState(randomFeed)
  const fade = useRef(new Animated.Value(1)).current
  useEffect(() => {
    const t = setInterval(() => {
      Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
        setItem(randomFeed())
        Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start()
      })
    }, 2800)
    return () => clearInterval(t)
  }, [fade])

  return (
    <Panel style={styles.feed}>
      <View style={styles.feedHead}>
        <LiveDot />
        <Text style={styles.feedTitle}>JUST NOW</Text>
      </View>
      <Animated.View style={[styles.feedRow, { opacity: fade }]}>
        <SkinPreview skinId={item.skinA} side="blue" size={28} glow={false} />
        <Text style={styles.feedText} numberOfLines={1}>
          <Text style={styles.feedName}>{item.a}</Text> {item.verb} <Text style={styles.feedName}>{item.b}</Text>
        </Text>
        <Text style={styles.feedScore}>{item.score}</Text>
        <SkinPreview skinId={item.skinB} side="red" size={28} glow={false} />
      </Animated.View>
    </Panel>
  )
}

const RADAR = 210
const SWEEP_TRAIL = [0, 5, 10, 15, 20, 25, 30]

/** Expanding ring that starts every `period` ms, offset by `delay`. */
function PulseRing({ delay, color }: { delay: number; color: string }) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: 2400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(Math.max(0, 1600 - delay)),
      ]),
    )
    anim.start()
    return () => anim.stop()
  }, [v, delay])
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.pulseRing,
        {
          borderColor: color,
          opacity: v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.8, 0] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }) }],
        },
      ]}
    />
  )
}

/** A random player popping up somewhere on the radar, then fading away. */
function Blip({ delay, exclude }: { delay: number; exclude: string }) {
  const pool = useRef(SKINS.filter((s) => s.id !== exclude).map((s) => s.id)).current
  const pick = () => {
    const angle = Math.random() * Math.PI * 2
    const r = RADAR * (0.3 + Math.random() * 0.14)
    return { id: pool[Math.floor(Math.random() * pool.length)], x: Math.cos(angle) * r, y: Math.sin(angle) * r }
  }
  const [spot, setSpot] = useState(pick)
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    let alive = true
    const cycle = () => {
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 260, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
        Animated.delay(700),
        Animated.timing(v, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.delay(250),
      ]).start(({ finished }) => {
        if (!finished || !alive) return
        setSpot(pick())
        cycle()
      })
    }
    const t = setTimeout(cycle, delay)
    return () => {
      alive = false
      clearTimeout(t)
      v.stopAnimation()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v, delay])
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.blip,
        {
          opacity: v,
          transform: [{ translateX: spot.x }, { translateY: spot.y }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
        },
      ]}
    >
      <SkinPreview skinId={spot.id} side="red" size={34} glow={false} />
    </Animated.View>
  )
}

function Radar({ mySkin, found }: { mySkin: string; found: boolean }) {
  const spin = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (found) return
    const anim = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 2200, easing: Easing.linear, useNativeDriver: true }))
    anim.start()
    return () => anim.stop()
  }, [spin, found])
  const ring = found ? colors.gold : colors.green

  return (
    <View style={styles.radar}>
      <View style={[styles.radarDisc, found && styles.radarDiscFound]} />
      <View style={[styles.radarCircle, { width: RADAR * 0.66, height: RADAR * 0.66, borderRadius: RADAR }]} />
      <View style={[styles.radarCircle, { width: RADAR * 0.33, height: RADAR * 0.33, borderRadius: RADAR }]} />
      <View style={[styles.radarAxis, { width: RADAR, height: 1 }]} />
      <View style={[styles.radarAxis, { width: 1, height: RADAR }]} />
      {!found && (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}
        >
          {SWEEP_TRAIL.map((deg, i) => (
            <View
              key={deg}
              style={[
                styles.sweep,
                { opacity: i === 0 ? 0.95 : 0.35 * (1 - i / SWEEP_TRAIL.length), transform: [{ rotate: `-${deg}deg` }] },
              ]}
            />
          ))}
        </Animated.View>
      )}
      <PulseRing delay={0} color={ring} />
      <PulseRing delay={800} color={ring} />
      <PulseRing delay={1600} color={ring} />
      {!found && (
        <>
          <Blip delay={300} exclude={mySkin} />
          <Blip delay={900} exclude={mySkin} />
          <Blip delay={1500} exclude={mySkin} />
        </>
      )}
      <SkinPreview skinId={mySkin} side="blue" size={96} animated />
    </View>
  )
}

function FoundReveal({ name, skin }: { name: string; skin: string }) {
  const pop = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }).start()
  }, [pop])
  return (
    <Animated.View style={[styles.oppCard, styles.oppFound, { opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }]}>
      <SkinPreview skinId={skin} side="red" size={64} animated />
      <View style={styles.oppText}>
        <Text style={styles.oppLabel}>RIVAL FOUND</Text>
        <Text style={styles.oppName} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.oppSub}>Get ready…</Text>
      </View>
      <View style={[styles.vs, styles.oppVs]}>
        <Text style={styles.vsText}>VS</Text>
      </View>
    </Animated.View>
  )
}

const SEARCH_TIPS = [
  'Every shot spins you. Use the recoil to dodge!',
  'Bullets bounce on ricochet arenas.',
  'Tap the chat bubbles to tease your rival.',
  'Only one of your bullets can fly at a time.',
]

/**
 * Quick-match search screen: radar sweep with random players blinking by, then a "Rival found" reveal.
 * `found` is set once an opponent (real or stand-in) is locked in.
 */
export function SearchingCard({
  mySkin,
  found,
  children,
}: {
  mySkin: string
  found: { name: string; skin: string } | null
  children?: ReactNode
}) {
  const { online } = useLiveCounts()
  const [secs, setSecs] = useState(0)
  useEffect(() => {
    if (found) return
    const t = setInterval(() => setSecs((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [found])

  const phase = secs < 2 ? 'Connecting to the arena…' : secs < 6 ? `Scanning ${fmt(online)} players online…` : 'Widening the search…'

  return (
    <Panel style={styles.searching}>
      <Text style={[styles.searchTitle, found && { color: colors.gold }]}>{found ? 'Rival found!' : 'Finding a rival'}</Text>
      <Radar mySkin={mySkin} found={!!found} />
      {found ? (
        <FoundReveal name={found.name} skin={found.skin} />
      ) : (
        <View style={styles.oppCard}>
          <MysteryOpponent mySkin={mySkin} size={64} fast />
          <View style={styles.oppText}>
            <Text style={styles.oppLabel}>YOUR RIVAL</Text>
            <Text style={styles.oppName}>Searching…</Text>
            <Text style={styles.oppSub} numberOfLines={1}>
              {phase}
            </Text>
          </View>
          <Text style={styles.searchTime}>
            {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}
          </Text>
        </View>
      )}
      {!found && <Text style={styles.searchTip}>Tip: {SEARCH_TIPS[Math.floor(secs / 4) % SEARCH_TIPS.length]}</Text>}
      {!found && children}
    </Panel>
  )
}


const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  bannerMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bannerCount: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  bannerLabel: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '800',
  },
  bannerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bannerSep: {
    width: 1,
    height: 14,
    backgroundColor: colors.panelBorder,
  },
  miniStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  miniValue: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  miniLabel: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: '700',
  },
  dotWrap: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.green,
  },
  dotRing: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.green,
  },
  qmCard: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 12,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255, 207, 63, 0.45)',
    overflow: 'hidden',
  },
  qmPlatform: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.55,
  },
  qmPill: {
    marginTop: 2,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 999,
  },
  qmPillText: {
    color: '#10122a',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  qmFighterName: {
    marginTop: 3,
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  qmVs: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    marginBottom: 44,
  },
  qmVsText: {
    fontSize: 16,
  },
  qmHalf: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '50%',
  },
  qmBlue: {
    left: 0,
    backgroundColor: 'rgba(94, 200, 255, 0.1)',
  },
  qmRed: {
    right: 0,
    backgroundColor: 'rgba(255, 107, 122, 0.1)',
  },
  qmTitle: {
    color: colors.gold,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 3,
  },
  qmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  qmSide: {
    flex: 1,
    alignItems: 'center',
  },
  qmName: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  vs: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#3d2805',
    transform: [{ rotate: '-8deg' }],
    marginBottom: 12,
  },
  vsText: {
    color: '#3d2805',
    fontWeight: '900',
    fontSize: 12,
  },
  mystery: {
    opacity: 0.7,
  },
  qBadge: {
    position: 'absolute',
    top: '26%',
    alignSelf: 'center',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(21, 17, 46, 0.85)',
    borderWidth: 2,
    borderColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  rounds: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 6,
  },
  roundsLabel: {
    color: colors.textFaint,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  roundsSeg: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    padding: 3,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  roundsBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 5,
    borderRadius: 11,
  },
  roundsBtnOn: {
    backgroundColor: colors.gold,
  },
  roundsNum: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 18,
  },
  roundsNumOn: {
    color: '#3d2805',
  },
  roundsSub: {
    color: colors.textFaint,
    fontSize: 9,
    fontWeight: '800',
  },
  roundsSubOn: {
    color: '#3d2805',
  },
  qmAction: {
    alignSelf: 'stretch',
    paddingHorizontal: 6,
    marginTop: 2,
  },
  qmHint: {
    color: colors.textFaint,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  record: {
    flexDirection: 'row',
    gap: 6,
  },
  recordTile: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderRadius: 14,
  },
  recordValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  recordLabel: {
    color: colors.textFaint,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  feed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  feedHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feedTitle: {
    color: colors.textFaint,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  feedRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  feedText: {
    flex: 1,
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '700',
  },
  feedName: {
    color: colors.text,
    fontWeight: '900',
  },
  feedScore: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '900',
  },
  searching: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  searchTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  searchTime: {
    color: colors.gold,
    fontSize: 18,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  searchTip: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 10,
    minHeight: 30,
  },
  radar: {
    width: RADAR,
    height: RADAR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarDisc: {
    position: 'absolute',
    width: RADAR,
    height: RADAR,
    borderRadius: RADAR / 2,
    backgroundColor: 'rgba(52, 211, 153, 0.07)',
    borderWidth: 2,
    borderColor: 'rgba(52, 211, 153, 0.45)',
  },
  radarDiscFound: {
    backgroundColor: 'rgba(255, 207, 63, 0.1)',
    borderColor: 'rgba(255, 207, 63, 0.7)',
  },
  radarCircle: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.25)',
  },
  radarAxis: {
    position: 'absolute',
    backgroundColor: 'rgba(52, 211, 153, 0.18)',
  },
  sweep: {
    position: 'absolute',
    top: RADAR / 2 - 1.5,
    left: RADAR / 2,
    width: RADAR / 2 - 4,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.green,
    transformOrigin: 'left center',
  },
  pulseRing: {
    position: 'absolute',
    width: RADAR,
    height: RADAR,
    borderRadius: RADAR / 2,
    borderWidth: 2,
  },
  blip: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 107, 122, 0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 107, 122, 0.7)',
    overflow: 'hidden',
  },
  oppCard: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 107, 122, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 107, 122, 0.35)',
  },
  oppFound: {
    backgroundColor: 'rgba(255, 207, 63, 0.12)',
    borderColor: colors.gold,
  },
  oppText: {
    flex: 1,
    gap: 1,
  },
  oppLabel: {
    color: colors.red,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  oppName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  oppSub: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '700',
  },
  oppVs: {
    marginBottom: 0,
  },
})
