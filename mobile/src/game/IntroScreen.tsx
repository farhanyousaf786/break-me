import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native'
import { signInWithGoogle, type Player } from '../net/account'
import { tierFor, useRank } from '../net/rank'
import { Avatar } from './Avatar'
import { LEVELS } from './levels'
import { getSkin, type AuraKind, type SkinChoice } from './skins'
import { SkinPreview } from './SkinPreview'
import { playTap, preloadShots } from './sound'
import { colors } from './theme'
import { CoinChip, GameButton, Icon, IconButton, Panel, type IconName } from './ui'
import { useWallet } from './wallet'
import { DailyButton } from './DailyRewards'
import { EarnCoinsButton } from './EarnCoins'
import { loadIntroGuideSeen, saveIntroGuideSeen } from './storage'

type Props = {
  skins: SkinChoice
  unlocked: number
  /** undefined while the saved sign-in is being restored */
  player: Player | null | undefined
  onPlay: () => void
  onOnline: () => void
  /** Opens Online → create private room (play with a friend). */
  onPlayFriend: () => void
  onCharacters: () => void
  onShop: () => void
  onProfile: () => void
  onSettings: () => void
  /** Tester shortcut behind a long press on the profile badge. */
  onUnlockAll: () => void
}

const TESTER_PASSWORD = 'farhan'

export function IntroScreen({
  skins,
  unlocked,
  player,
  onPlay,
  onOnline,
  onPlayFriend,
  onCharacters,
  onShop,
  onProfile,
  onSettings,
  onUnlockAll,
}: Props) {
  const [testerOpen, setTesterOpen] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const { coins, gun, aura } = useWallet()
  useEffect(() => preloadShots([gun]), [gun])
  useEffect(() => {
    let alive = true
    void loadIntroGuideSeen().then((seen) => {
      if (alive && !seen) setShowGuide(true)
    })
    return () => {
      alive = false
    }
  }, [])
  const { height: windowH } = useWindowDimensions()
  const [bodyH, setBodyH] = useState(windowH - 120)
  const onBodyLayout = (e: LayoutChangeEvent) => setBodyH(e.nativeEvent.layout.height)
  // Everything scales with the space actually left under the top bar, so nothing overlaps on short screens.
  const k = Math.min(1.1, Math.max(0.6, bodyH / 720))
  const gap = Math.round(22 * k)
  const titleSize = Math.round(54 * k)
  const fighterSize = Math.round(124 * k)
  const showTag = bodyH >= 600

  const dismissGuide = () => {
    setShowGuide(false)
    saveIntroGuideSeen()
  }

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <ProfileBadge
          player={player}
          skinId={skins.blue}
          onPress={onProfile}
          onLongPress={() => setTesterOpen(true)}
        />
        <View style={styles.topRight}>
          <CoinChip coins={coins} onPress={onShop} />
          <IconButton icon="gear" size={38} onPress={onSettings} accessibilityLabel="Settings" />
        </View>
      </View>

      <ScrollView
        style={styles.body}
        onLayout={onBodyLayout}
        contentContainerStyle={[styles.bodyContent, { gap, paddingBottom: Math.round(36 * k) }]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.titleWrap}>
          <Text style={[styles.eyebrow, { fontSize: Math.round(13 * Math.min(1, k + 0.1)) }]}>Recoil Duel</Text>
          <Text style={[styles.title, { fontSize: titleSize, lineHeight: titleSize * 1.08 }]}>BREAK</Text>
          <Text
            style={[
              styles.title,
              styles.titleSub,
              { fontSize: titleSize * 0.78, lineHeight: titleSize * 0.9 },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            BUDDIES!
          </Text>
        </View>

        <View style={styles.stageWrap}>
          <Pressable
            onPress={() => {
              playTap()
              if (showGuide) dismissGuide()
              onCharacters()
            }}
            accessibilityRole="button"
            accessibilityLabel="Change characters"
            style={({ pressed }) => pressed && styles.stagePressed}
          >
            <Panel style={styles.stage}>
              <View style={[styles.half, styles.halfBlue]} />
              <View style={[styles.half, styles.halfRed]} />
              <Fighter skinId={skins.blue} side="blue" tag="YOU" size={fighterSize} weapon={gun} aura={aura} />
              <View style={[styles.vsBadge, { marginBottom: fighterSize * 0.35 }]}>
                <Text style={styles.vsText}>VS</Text>
              </View>
              <Fighter skinId={skins.red} side="red" tag="RIVAL" size={fighterSize} />
              <View style={styles.changeHint} pointerEvents="none">
                <Text style={styles.changeHintText}>TAP TO CHANGE</Text>
              </View>
              {showGuide && <GuideMark n={1} label="Pick your look" style={styles.guideOnStage} />}
            </Panel>
          </Pressable>
          {showTag && <Text style={styles.tag}>Tap to shoot · recoil spins you around · hit them first!</Text>}
        </View>

        <View style={styles.actions}>
          <ModeCards
            level={Math.min(unlocked, LEVELS.length)}
            online={player?.kind === 'google'}
            showGuide={showGuide}
            onAdventure={() => {
              if (showGuide) dismissGuide()
              onPlay()
            }}
            onOnline={() => {
              if (showGuide) dismissGuide()
              onOnline()
            }}
            onPlayFriend={() => {
              if (showGuide) dismissGuide()
              onPlayFriend()
            }}
          />
          <View style={styles.secondaryRow}>
            <GameButton label="Fighters · Guns · Auras" variant="blue" size="sm" onPress={onCharacters} style={styles.secondaryWide} />
            <GameButton label="Shop" icon="bag" variant="gold" size="sm" onPress={onShop} style={styles.secondaryShop} />
          </View>
          <View style={styles.pills}>
            <DailyButton />
            <EarnCoinsButton />
          </View>
          {showGuide && (
            <Pressable onPress={dismissGuide} accessibilityRole="button" accessibilityLabel="Dismiss tips">
              <Text style={styles.guideDismiss}>Got it — hide tips</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      {testerOpen && <TesterUnlock onUnlock={onUnlockAll} onClose={() => setTesterOpen(false)} />}
    </View>
  )
}

function GuideMark({ n, label, style }: { n: number; label: string; style?: object }) {
  return (
    <View style={[styles.guideMark, style]} pointerEvents="none">
      <View style={styles.guideNum}>
        <Text style={styles.guideNumText}>{n}</Text>
      </View>
      <Text style={styles.guideLabel}>{label}</Text>
    </View>
  )
}

/** Adventure (CPU), quick online, and private room with a friend. */
function ModeCards({
  level,
  online,
  showGuide,
  onAdventure,
  onOnline,
  onPlayFriend,
}: {
  level: number
  /** Signed in with Google */
  online: boolean
  showGuide: boolean
  onAdventure: () => void
  onOnline: () => void
  onPlayFriend: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const goOnline = async (then: () => void) => {
    if (busy) return
    playTap()
    if (online) return then()
    setError(null)
    setBusy(true)
    try {
      if (await signInWithGoogle()) then()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const option = (
    onPress: () => void,
    icon: IconName,
    title: string,
    sub: string,
    color: string,
    guide?: { n: number; label: string },
  ) => (
    <View style={styles.modeWrap}>
      <Pressable
        onPress={onPress}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={sub ? `${title}. ${sub}` : title}
        style={({ pressed }) => [styles.mode, { borderColor: color }, pressed && styles.stagePressed]}
      >
        <View style={[styles.modeIcon, { backgroundColor: color }]}>
          <Icon name={icon} size={18} color="#10122a" />
        </View>
        <View style={styles.modeText}>
          <Text style={styles.modeTitle} numberOfLines={1}>
            {title}
          </Text>
          {sub !== '' && (
            <Text style={styles.modeSub} numberOfLines={1}>
              {sub}
            </Text>
          )}
        </View>
      </Pressable>
      {showGuide && guide && <GuideMark n={guide.n} label={guide.label} style={styles.guideOnMode} />}
    </View>
  )

  return (
    <View style={styles.modes}>
      <View style={styles.modeCol}>
        {option(
          () => {
            playTap()
            onAdventure()
          },
          'levels',
          'Adventure',
          `vs CPU · Stage ${level}`,
          colors.gold,
          { n: 2, label: 'Solo levels' },
        )}
        {option(
          () => void goOnline(onOnline),
          'play',
          'Play Live',
          busy ? 'Signing in…' : online ? 'Find a rival' : 'Sign-in required',
          colors.green,
        )}
        {option(
          () => void goOnline(onPlayFriend),
          'user',
          'Play with Friend',
          busy ? 'Signing in…' : 'Create a private room',
          colors.blue,
          { n: 3, label: 'Share a room code' },
        )}
      </View>
      {busy && <ActivityIndicator color={colors.gold} />}
      {error && <Text style={styles.modeError}>{error}</Text>}
    </View>
  )
}

function TesterUnlock({ onUnlock, onClose }: { onUnlock: () => void; onClose: () => void }) {
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'wrong' | 'done'>('idle')

  const submit = () => {
    if (password.trim().toLowerCase() === TESTER_PASSWORD) {
      onUnlock()
      setStatus('done')
      setTimeout(onClose, 1100)
    } else {
      setStatus('wrong')
    }
  }

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable onPress={() => {}}>
          <Panel style={styles.tester}>
            <Text style={styles.testerTitle}>Tester Mode</Text>
            {status === 'done' ? (
              <Text style={styles.testerDone}>All stages unlocked + 5,000 coins!</Text>
            ) : (
              <>
                <Text style={styles.testerSub}>Enter the password to unlock every stage and get 5,000 test coins.</Text>
                <TextInput
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v)
                    if (status === 'wrong') setStatus('idle')
                  }}
                  onSubmitEditing={submit}
                  placeholder="Password"
                  placeholderTextColor={colors.textFaint}
                  secureTextEntry
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  style={[styles.testerInput, status === 'wrong' && styles.testerInputWrong]}
                />
                {status === 'wrong' && <Text style={styles.testerWrong}>Wrong password</Text>}
                <View style={styles.testerRow}>
                  <GameButton label="Cancel" variant="dark" size="sm" onPress={onClose} style={styles.testerBtn} />
                  <GameButton label="Unlock" variant="green" size="sm" onPress={submit} style={styles.testerBtn} />
                </View>
              </>
            )}
          </Panel>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function ProfileBadge({
  player,
  skinId,
  onPress,
  onLongPress,
}: {
  player: Player | null | undefined
  skinId: string
  onPress: () => void
  onLongPress: () => void
}) {
  const signedIn = player?.kind === 'google'
  const rank = useRank(player)
  const tier = signedIn ? tierFor(rank?.rp ?? 0).tier : null

  return (
    <Pressable
      onPress={() => {
        playTap()
        onPress()
      }}
      onLongPress={onLongPress}
      delayLongPress={600}
      accessibilityRole="button"
      accessibilityLabel={signedIn ? 'Profile' : 'Sign in'}
      hitSlop={8}
      style={({ pressed }) => [signedIn ? styles.badge : styles.signIn, pressed && styles.badgePressed]}
    >
      <Avatar player={player} skinId={skinId} size={signedIn ? 40 : 30} ring={signedIn ? colors.blue : colors.textFaint} />
      {signedIn ? (
        tier && (
          <View style={[styles.badgeTag, { backgroundColor: tier.color }]}>
            <Text style={[styles.badgeTagText, { color: tier.ink }]} numberOfLines={1}>
              {tier.name.toUpperCase()}
            </Text>
          </View>
        )
      ) : (
        player !== undefined && <Text style={styles.signInText}>Sign in</Text>
      )}
    </Pressable>
  )
}

function Fighter({
  skinId,
  side,
  tag,
  size,
  weapon,
  aura,
}: {
  skinId: string
  side: 'blue' | 'red'
  tag: string
  size: number
  weapon?: string
  aura?: AuraKind
}) {
  const tint = side === 'blue' ? colors.blue : colors.red
  return (
    <View style={styles.fighter}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }}>
        <View
          style={[
            styles.platform,
            {
              width: size * 0.62,
              height: size * 0.14,
              borderRadius: size,
              backgroundColor: tint,
              bottom: size * 0.07,
              transform: [{ translateX: (side === 'blue' ? -8 : 8) * (size / 110) }],
            },
          ]}
        />
        <View style={StyleSheet.absoluteFill}>
          <SkinPreview skinId={skinId} side={side} size={size} animated weapon={weapon} aura={aura} />
        </View>
      </View>
      <View style={[styles.sidePill, { backgroundColor: tint }]}>
        <Text style={styles.sidePillText}>{tag}</Text>
      </View>
      <Text style={styles.fighterName} numberOfLines={1}>
        {getSkin(skinId).name}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 4,
  },
  badge: {
    alignItems: 'center',
    paddingBottom: 6,
  },
  badgePressed: {
    opacity: 0.75,
  },
  badgeTag: {
    position: 'absolute',
    bottom: 0,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: colors.gold,
    borderWidth: 1.5,
    borderColor: colors.bg,
  },
  badgeTagText: {
    color: '#3d2805',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  signIn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 3,
    paddingLeft: 3,
    paddingRight: 14,
    borderRadius: 999,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.panelBorder,
  },
  signInText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingTop: 8,
  },
  titleWrap: {
    alignItems: 'center',
  },
  eyebrow: {
    color: colors.blueSoft,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  title: {
    color: colors.gold,
    fontSize: 52,
    lineHeight: 56,
    fontWeight: '900',
    letterSpacing: 1,
    textShadowColor: colors.goldDark,
    textShadowOffset: { width: 0, height: 5 },
    textShadowRadius: 0,
  },
  titleSub: {
    color: '#ffffff',
    fontSize: 40,
    lineHeight: 46,
    textShadowColor: '#3b2f7a',
  },
  stageWrap: {
    gap: 10,
  },
  stagePressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  changeHint: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  changeHintText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  stage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 4,
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  half: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '50%',
  },
  halfBlue: {
    left: 0,
    backgroundColor: 'rgba(94, 200, 255, 0.1)',
  },
  halfRed: {
    right: 0,
    backgroundColor: 'rgba(255, 107, 122, 0.1)',
  },
  fighter: {
    flex: 1,
    alignItems: 'center',
  },
  platform: {
    position: 'absolute',
    opacity: 0.28,
  },
  sidePill: {
    marginTop: 2,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 999,
  },
  sidePillText: {
    color: '#10122a',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  fighterName: {
    marginTop: 3,
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  vsBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#3d2805',
    transform: [{ rotate: '-8deg' }],
  },
  vsText: {
    color: '#3d2805',
    fontWeight: '900',
    fontSize: 16,
  },
  tag: {
    color: colors.textDim,
    fontSize: 13,
    textAlign: 'center',
  },
  actions: {
    gap: 12,
    paddingHorizontal: 28,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryWide: {
    flex: 1.6,
  },
  secondaryShop: {
    flex: 1,
  },
  pills: {
    gap: 12,
    alignItems: 'center',
  },
  modes: {
    gap: 8,
    marginHorizontal: -16,
  },
  modeCol: {
    gap: 8,
  },
  modeWrap: {
    position: 'relative',
  },
  mode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  modeIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeText: {
    flex: 1,
  },
  modeTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  modeError: {
    color: colors.red,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  modeSub: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: '700',
  },
  guideMark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: colors.gold,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  guideOnStage: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
  },
  guideOnMode: {
    position: 'absolute',
    right: 8,
    top: -10,
  },
  guideNum: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#3d2805',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideNumText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '900',
  },
  guideLabel: {
    color: '#3d2805',
    fontSize: 11,
    fontWeight: '900',
  },
  guideDismiss: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(6, 5, 18, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  tester: {
    width: 320,
    maxWidth: '100%',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 22,
    paddingHorizontal: 20,
    backgroundColor: '#1c1740',
    borderColor: 'rgba(255, 207, 63, 0.35)',
    borderWidth: 2,
  },
  testerTitle: {
    color: colors.gold,
    fontSize: 24,
    fontWeight: '900',
  },
  testerSub: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  testerInput: {
    alignSelf: 'stretch',
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1.5,
    borderColor: colors.panelBorder,
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  testerInputWrong: {
    borderColor: colors.red,
  },
  testerWrong: {
    color: colors.red,
    fontSize: 12,
    fontWeight: '800',
  },
  testerDone: {
    color: colors.green,
    fontSize: 16,
    fontWeight: '900',
    paddingVertical: 8,
  },
  testerRow: {
    flexDirection: 'row',
    gap: 10,
    alignSelf: 'stretch',
    marginTop: 4,
  },
  testerBtn: {
    flex: 1,
  },
})
