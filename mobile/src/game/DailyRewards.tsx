import { Canvas, Picture, Skia, createPicture, matchFont, PaintStyle, type SkCanvas } from '@shopify/react-native-skia'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Easing, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { showRewarded, useAds } from '../monetize/ads'
import {
  AD_SPINS_PER_DAY,
  ALL_DONE_BONUS,
  SPIN_PRIZES,
  adSpinsLeft,
  allClaimed,
  claimBonus,
  claimMission,
  dailyBadge,
  missionDone,
  missionText,
  spin,
  useDaily,
} from './daily'
import { buzz } from './haptics'
import { playTap, playVoice } from './sound'
import { colors } from './theme'
import { CoinDot, GameButton, Icon, Panel } from './ui'

/** Home-screen pill that opens daily missions + the lucky spin. */
export function DailyButton() {
  const [open, setOpen] = useState(false)
  const daily = useDaily()
  const badge = dailyBadge(daily)

  return (
    <>
      <Pressable
        onPress={() => {
          playTap()
          setOpen(true)
        }}
        accessibilityRole="button"
        accessibilityLabel={`Daily missions and lucky spin${badge ? `, ${badge} rewards waiting` : ''}`}
        style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
      >
        <View style={styles.pillIcon}>
          <Icon name="star" size={14} color="#3d2805" />
        </View>
        <Text style={styles.pillText}>Daily Missions & Spin</Text>
        {badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </Pressable>
      {open && <DailySheet onClose={() => setOpen(false)} />}
    </>
  )
}

function untilMidnight() {
  const now = new Date()
  const next = new Date(now)
  next.setHours(24, 0, 0, 0)
  const mins = Math.max(1, Math.round((next.getTime() - now.getTime()) / 60000))
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`
}

export function DailySheet({ onClose, initialTab = 'missions' }: { onClose: () => void; initialTab?: 'missions' | 'spin' }) {
  const [tab, setTab] = useState(initialTab)
  const [spinning, setSpinning] = useState(false)

  return (
    <Modal transparent animationType="fade" onRequestClose={spinning ? () => {} : onClose} statusBarTranslucent>
      <View style={styles.scrim}>
        <Panel style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Daily Rewards</Text>
            <Pressable
              onPress={onClose}
              disabled={spinning}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={styles.close}
            >
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.tabs}>
            {(['missions', 'spin'] as const).map((t) => (
              <Pressable
                key={t}
                disabled={spinning}
                onPress={() => {
                  playTap()
                  setTab(t)
                }}
                style={[styles.tab, tab === t && styles.tabOn]}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === t }}
              >
                <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>{t === 'missions' ? 'Missions' : 'Lucky Spin'}</Text>
              </Pressable>
            ))}
          </View>

          {tab === 'missions' ? <Missions /> : <LuckySpin onSpinning={setSpinning} />}
          <Text style={styles.reset}>New missions and a free spin in {untilMidnight()}</Text>
        </Panel>
      </View>
    </Modal>
  )
}

/* ---------------------------------------------------------------- missions */

function Missions() {
  const daily = useDaily()
  const done = allClaimed(daily)

  const claim = (i: number) => {
    if (claimMission(i) > 0) {
      playVoice('yay')
      buzz('win')
    }
  }

  return (
    <ScrollView style={styles.missionScroll} contentContainerStyle={styles.missionList} bounces={false}>
      {daily.missions.map((m, i) => {
        const finished = missionDone(m)
        return (
          <View key={m.kind} style={[styles.mission, finished && !m.claimed && styles.missionReady]}>
            <View style={styles.missionTop}>
              <Text style={styles.missionText}>{missionText(m)}</Text>
              <View style={styles.reward}>
                <CoinDot size={14} />
                <Text style={styles.rewardText}>{m.coins}</Text>
              </View>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${(m.progress / m.goal) * 100}%` }, finished && styles.barDone]} />
            </View>
            <View style={styles.missionBottom}>
              <Text style={styles.progress}>
                {m.progress} / {m.goal}
              </Text>
              {m.claimed ? (
                <View style={styles.claimed}>
                  <Icon name="check" size={14} color={colors.green} />
                  <Text style={styles.claimedText}>Claimed</Text>
                </View>
              ) : finished ? (
                <GameButton label="Claim" variant="green" size="sm" onPress={() => claim(i)} />
              ) : null}
            </View>
          </View>
        )
      })}

      <View style={[styles.mission, styles.bonus, done && !daily.bonusClaimed && styles.missionReady]}>
        <View style={styles.missionTop}>
          <Text style={styles.missionText}>Finish all {daily.missions.length} missions</Text>
          <View style={styles.reward}>
            <CoinDot size={14} />
            <Text style={styles.rewardText}>{ALL_DONE_BONUS}</Text>
          </View>
        </View>
        <View style={styles.missionBottom}>
          <Text style={styles.progress}>Bonus chest</Text>
          {daily.bonusClaimed ? (
            <View style={styles.claimed}>
              <Icon name="check" size={14} color={colors.green} />
              <Text style={styles.claimedText}>Claimed</Text>
            </View>
          ) : done ? (
            <GameButton
              label="Open"
              variant="gold"
              size="sm"
              onPress={() => {
                if (claimBonus() > 0) {
                  playVoice('woo')
                  buzz('win')
                }
              }}
            />
          ) : (
            <Icon name="lock" size={16} color={colors.textFaint} />
          )}
        </View>
      </View>
    </ScrollView>
  )
}

/* -------------------------------------------------------------- lucky spin */

const WHEEL = 250
const SEG = 360 / SPIN_PRIZES.length
function drawWheel(c: SkCanvas) {
  const wheelFont = matchFont({ fontFamily: Platform.select({ ios: 'Helvetica', default: 'sans-serif' }), fontSize: 20, fontWeight: 'bold' })
  const cx = WHEEL / 2
  const r = WHEEL / 2 - 8
  const oval = Skia.XYWHRect(cx - r, cx - r, r * 2, r * 2)
  const paint = Skia.Paint()
  paint.setAntiAlias(true)

  const ring = Skia.Paint()
  ring.setAntiAlias(true)
  ring.setColor(Skia.Color('#c28a12'))
  c.drawCircle(cx, cx, r + 7, ring)

  SPIN_PRIZES.forEach((prize, i) => {
    const start = -90 + i * SEG
    const path = Skia.PathBuilder.Make().moveTo(cx, cx).arcToOval(oval, start, SEG, false).close().detach()
    paint.setColor(Skia.Color(prize.color))
    c.drawPath(path, paint)
  })

  const line = Skia.Paint()
  line.setAntiAlias(true)
  line.setStyle(PaintStyle.Stroke)
  line.setStrokeWidth(3)
  line.setColor(Skia.Color('#ffffff'))
  SPIN_PRIZES.forEach((_, i) => {
    const a = ((-90 + i * SEG) * Math.PI) / 180
    c.drawLine(cx, cx, cx + Math.cos(a) * r, cx + Math.sin(a) * r, line)
  })
  c.drawCircle(cx, cx, r, line)

  const text = Skia.Paint()
  text.setAntiAlias(true)
  text.setColor(Skia.Color('#ffffff'))
  const shadow = Skia.Paint()
  shadow.setAntiAlias(true)
  shadow.setColor(Skia.Color('rgba(0,0,0,0.35)'))
  const coin = Skia.Paint()
  coin.setAntiAlias(true)
  coin.setColor(Skia.Color('#ffcf3f'))
  const coinEdge = Skia.Paint()
  coinEdge.setAntiAlias(true)
  coinEdge.setStyle(PaintStyle.Stroke)
  coinEdge.setStrokeWidth(2)
  coinEdge.setColor(Skia.Color('#c28a12'))

  SPIN_PRIZES.forEach((prize, i) => {
    c.save()
    c.rotate(i * SEG + SEG / 2, cx, cx)
    const label = String(prize.coins)
    const w = wheelFont.measureText(label).width
    c.drawText(label, cx - w / 2 + 1, cx - r + 38 + 1.5, shadow, wheelFont)
    c.drawText(label, cx - w / 2, cx - r + 38, text, wheelFont)
    c.drawCircle(cx, cx - r + 54, 7, coin)
    c.drawCircle(cx, cx - r + 54, 7, coinEdge)
    c.restore()
  })

  // Light bulbs around the rim.
  const bulb = Skia.Paint()
  bulb.setAntiAlias(true)
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2
    bulb.setColor(Skia.Color(i % 2 ? '#fff6c2' : '#ffffff'))
    c.drawCircle(cx + Math.cos(a) * (r + 3.5), cx + Math.sin(a) * (r + 3.5), 2.6, bulb)
  }
}

function LuckySpin({ onSpinning }: { onSpinning: (on: boolean) => void }) {
  const daily = useDaily()
  const { rewardedReady } = useAds()
  const rotation = useRef(new Animated.Value(0)).current
  const angle = useRef(0)
  const [busy, setBusy] = useState<'idle' | 'ad' | 'spinning'>('idle')
  const [won, setWon] = useState<number | null>(null)
  const picture = useMemo(() => createPicture(drawWheel, { width: WHEEL, height: WHEEL }), [])
  const rotate = rotation.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'], extrapolate: 'extend' })

  useEffect(() => () => rotation.stopAnimation(), [rotation])

  const run = (kind: 'free' | 'ad') => {
    const index = spin(kind)
    if (index === null) {
      setBusy('idle')
      return
    }
    setWon(null)
    setBusy('spinning')
    onSpinning(true)
    // The pointer sits at the top; land the chosen segment's middle under it after a few full turns.
    const from = angle.current
    const base = from - (from % 360)
    const to = base + 360 * 5 + (360 - (index * SEG + SEG / 2))
    angle.current = to
    let lastTick = Math.floor(from / SEG)
    const id = rotation.addListener(({ value }) => {
      const tick = Math.floor(value / SEG)
      if (tick !== lastTick) {
        lastTick = tick
        playTap()
        buzz('tick')
      }
    })
    Animated.timing(rotation, {
      toValue: to,
      duration: 4200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      rotation.removeListener(id)
      setBusy('idle')
      onSpinning(false)
      setWon(SPIN_PRIZES[index].coins)
      playVoice('yay')
      buzz('win')
    })
  }

  const watchAndSpin = async () => {
    setBusy('ad')
    const earned = await showRewarded()
    if (earned) run('ad')
    else setBusy('idle')
  }

  const adLeft = adSpinsLeft(daily)

  return (
    <View style={styles.spin}>
      <View style={styles.wheelWrap}>
        <Animated.View style={{ width: WHEEL, height: WHEEL, transform: [{ rotate }] }}>
          <Canvas style={{ width: WHEEL, height: WHEEL }} pointerEvents="none">
            <Picture picture={picture} />
          </Canvas>
        </Animated.View>
        <View style={styles.hub} pointerEvents="none">
          <Icon name="star" size={22} color="#3d2805" />
        </View>
        <View style={styles.pointer} pointerEvents="none" />
      </View>

      <Text style={styles.spinResult}>{won !== null ? `You won ${won} coins!` : busy === 'spinning' ? 'Good luck…' : ' '}</Text>

      {!daily.freeSpinUsed ? (
        <GameButton label="Free Spin!" icon="star" variant="gold" size="lg" disabled={busy !== 'idle'} onPress={() => run('free')} />
      ) : adLeft > 0 ? (
        <GameButton
          label={busy === 'ad' ? 'Playing…' : rewardedReady ? `Watch video · Spin again` : 'Video loading…'}
          icon="play"
          variant="green"
          disabled={busy !== 'idle' || !rewardedReady}
          onPress={watchAndSpin}
        />
      ) : (
        <Text style={styles.spinNote}>All spins used today. Come back tomorrow!</Text>
      )}
      <Text style={styles.spinNote}>
        {daily.freeSpinUsed ? `${adLeft} of ${AD_SPINS_PER_DAY} video spins left today` : '1 free spin every day'}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 8,
    paddingVertical: 7,
    paddingLeft: 7,
    paddingRight: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 207, 63, 0.14)',
    borderWidth: 2,
    borderColor: colors.gold,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.85,
  },
  pillIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  badge: {
    position: 'absolute',
    top: -7,
    right: -5,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.red,
    borderWidth: 2,
    borderColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(6, 5, 20, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  sheet: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '92%',
    padding: 16,
    gap: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 207, 63, 0.55)',
    backgroundColor: '#1a1638',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.gold,
    fontSize: 22,
    fontWeight: '900',
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 14,
    padding: 3,
    gap: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 11,
    alignItems: 'center',
  },
  tabOn: {
    backgroundColor: colors.gold,
  },
  tabText: {
    color: colors.textDim,
    fontSize: 14,
    fontWeight: '800',
  },
  tabTextOn: {
    color: '#3d2805',
  },
  missionScroll: {
    flexGrow: 0,
  },
  missionList: {
    gap: 10,
  },
  mission: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 8,
  },
  missionReady: {
    borderColor: colors.green,
    backgroundColor: 'rgba(70, 210, 126, 0.1)',
  },
  bonus: {
    backgroundColor: 'rgba(255, 207, 63, 0.08)',
  },
  missionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  missionText: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  reward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  rewardText: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '900',
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.blue,
  },
  barDone: {
    backgroundColor: colors.green,
  },
  missionBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 34,
  },
  progress: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '800',
  },
  claimed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  claimedText: {
    color: colors.green,
    fontSize: 13,
    fontWeight: '900',
  },
  reset: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  spin: {
    alignItems: 'center',
    gap: 10,
  },
  wheelWrap: {
    width: WHEEL,
    height: WHEEL,
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hub: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.gold,
    borderWidth: 4,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointer: {
    position: 'absolute',
    top: -12,
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderTopWidth: 26,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#ffffff',
  },
  spinResult: {
    color: colors.gold,
    fontSize: 20,
    fontWeight: '900',
    minHeight: 26,
  },
  spinNote: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
})
