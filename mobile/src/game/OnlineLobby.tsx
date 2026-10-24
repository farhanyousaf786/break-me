import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Image, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native'
import { signInWithGoogle, watchPlayer, type Player } from '../net/account'
import { onlineConfigured } from '../net/firebase'
import {
  cancelRoom,
  claimOrCloseRoom,
  createRoom,
  findOpenRoom,
  hostMatched,
  joinRoom,
  makeBotMatch,
  leaveMatch,
  normalizeCode,
  watchRoom,
  DEFAULT_BEST_OF,
  type BestOf,
  type Match,
} from '../net/rooms'
import { LiveBanner, SearchingCard } from './LobbyWidgets'
import { QuickMatchCard } from './QuickMatchCard'
import { RankCard } from './RankCard'
import { CPU_GUNS } from './guns'
import { myNetworkSkin } from './myCharacter'
import { getWallet } from './wallet'
import { ME_ID, SKINS, getSkin, remoteSkin } from './skins'
import { playFanfare } from './sound'
import { SkinPreview } from './SkinPreview'
import { colors } from './theme'
import { GameButton, Icon, IconButton, Panel, ScreenHeader } from './ui'
import { useBack } from './useBack'

type Props = {
  mySkin: string
  /** `friend` = jump straight into Create Room (from main menu "Play with Friend"). */
  focus?: 'friend'
  onMatched: (match: Match) => void
  onSettings: () => void
  onBack: () => void
}

type View_ =
  | { kind: 'menu' }
  | { kind: 'busy'; label: string }
  /** Quick match before a room of our own exists (looking for someone already waiting) */
  | { kind: 'searching' }
  | { kind: 'hosting'; code: string; quick: boolean }

/** How long the "Rival found!" reveal stays up before the match starts. */
const REVEAL_MS = 1900
/** Quick match looks only for real players for at least this long. */
const SEARCH_MIN_MS = 4000
/** Extra real-player time after the minimum, plus random jitter, before a CPU rival steps in. */
const BOT_EXTRA_MS = 2000
const BOT_JITTER_MS = 3000
/** How often a waiting player re-checks for someone who opened a room at the same moment. */
const SCAN_MS = 1000

export function OnlineLobby({ mySkin, focus, onMatched, onSettings, onBack }: Props) {
  const [view, setView] = useState<View_>({ kind: 'menu' })
  const [codeInput, setCodeInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  // undefined = still restoring the saved session
  const [player, setPlayer] = useState<Player | null | undefined>(undefined)
  const [authBusy, setAuthBusy] = useState(false)
  const playerName = player?.name ?? 'Player'
  const friendFocusRef = useRef(focus === 'friend')

  useEffect(() => watchPlayer(setPlayer), [])

  const runAuth = async (action: () => Promise<unknown>) => {
    setError(null)
    setAuthBusy(true)
    try {
      await action()
    } catch (e) {
      if (aliveRef.current) setError(e instanceof Error ? e.message : 'Sign-in failed.')
    } finally {
      if (aliveRef.current) setAuthBusy(false)
    }
  }

  const hostingRef = useRef<{ code: string; createdAt: number } | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const aliveRef = useRef(true)
  /** Bumped on cancel so an in-flight quick-match search knows to back out. */
  const searchRef = useRef(0)
  const searchStartRef = useRef(0)
  const revealRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [found, setFound] = useState<{ name: string; skin: string } | null>(null)
  const [bestOf, setBestOf] = useState<BestOf>(DEFAULT_BEST_OF)
  const bestOfRef = useRef(bestOf)
  bestOfRef.current = bestOf

  const stopWatching = () => {
    cleanupRef.current?.()
    cleanupRef.current = null
  }

  const finish = (match: Match) => {
    stopWatching()
    hostingRef.current = null
    onMatched(match)
  }

  /** Quick match: show who we got for a moment, then start. */
  const reveal = (match: Match) => {
    stopWatching()
    hostingRef.current = null
    const host = match.role === 'host'
    setFound({ name: host ? match.guestName : match.hostName, skin: remoteSkin(host ? match.guestSkin : match.hostSkin) })
    playFanfare()
    revealRef.current = setTimeout(() => {
      if (aliveRef.current) onMatched(match)
    }, REVEAL_MS)
  }

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
      stopWatching()
      if (revealRef.current) clearTimeout(revealRef.current)
      const hosting = hostingRef.current
      if (hosting) void cancelRoom(hosting.code)
    }
  }, [])

  const fail = (e: unknown) => {
    if (!aliveRef.current) return
    setError(e instanceof Error ? e.message : 'Something went wrong. Check your connection.')
    setView({ kind: 'menu' })
  }

  /** Other players get my creation as a look code, never the photo. */
  const netSkin = () => (mySkin === ME_ID ? myNetworkSkin() : mySkin)
  const playBot = () => reveal(makeBotMatch(mySkin, playerName, SKINS.map((s) => s.id), getWallet().gun, CPU_GUNS, bestOfRef.current))

  const startHosting = (code: string, createdAt: number, quick: boolean) => {
    hostingRef.current = { code, createdAt }
    setView({ kind: 'hosting', code, quick })
    const done = quick ? reveal : finish

    const unwatch = watchRoom(code, (doc) => {
      if (doc && doc.status === 'playing' && doc.guest) {
        hostMatched(code, doc).then(done, fail)
      }
    })

    // Two players can both miss each other and each open a room; the newer one gives up and joins the older.
    let scanning = false
    const timer = quick
      ? setInterval(async () => {
          if (scanning || hostingRef.current?.code !== code) return
          scanning = true
          try {
            const m = await findOpenRoom(netSkin(), playerName, getWallet().gun, bestOfRef.current, createdAt, code)
            if (m && hostingRef.current?.code === code) {
              hostingRef.current = null
              stopWatching()
              await cancelRoom(code)
              reveal(m)
            }
          } catch (e) {
            console.warn('[quick match] scan failed', e)
          } finally {
            scanning = false
          }
        }, SCAN_MS)
      : null

    // Nobody around after the real-player window: hand over to a CPU opponent so quick match never stalls.
    let botTimer: ReturnType<typeof setTimeout> | null = null
    const tryBot = async () => {
      if (hostingRef.current?.code !== code) return
      if (scanning) {
        botTimer = setTimeout(tryBot, 400)
        return
      }
      hostingRef.current = null
      stopWatching()
      const id = searchRef.current
      try {
        // Someone may have joined in the very last instant; if so, play them instead.
        const joined = await claimOrCloseRoom(code)
        if (joined) return void hostMatched(code, joined).then(reveal, fail)
      } catch {
        void cancelRoom(code)
      }
      if (aliveRef.current && searchRef.current === id) playBot()
    }
    if (quick) {
      const waited = Date.now() - searchStartRef.current
      const botAt = SEARCH_MIN_MS + BOT_EXTRA_MS + Math.random() * BOT_JITTER_MS
      botTimer = setTimeout(tryBot, Math.max(0, botAt - waited))
    }

    cleanupRef.current = () => {
      unwatch()
      if (timer) clearInterval(timer)
      if (botTimer) clearTimeout(botTimer)
    }
  }

  const quickMatch = async () => {
    setError(null)
    setFound(null)
    setView({ kind: 'searching' })
    const id = ++searchRef.current
    const stale = () => !aliveRef.current || searchRef.current !== id
    searchStartRef.current = Date.now()
    // Keep the radar up briefly even when a match is instant, so the search reads as a search.
    const minSearch = new Promise((r) => setTimeout(r, 1500))
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

    // Retry through network hiccups for the whole real-player window before settling for a CPU rival.
    while (!stale()) {
      try {
        const m = await findOpenRoom(netSkin(), playerName, getWallet().gun, bestOfRef.current)
        if (m) {
          await minSearch
          if (stale()) return void leaveMatch(m.code, m.role)
          return reveal(m)
        }
        if (stale()) return
        const { code, createdAt } = await createRoom(netSkin(), playerName, getWallet().gun, true, bestOfRef.current)
        if (stale()) return void cancelRoom(code)
        return startHosting(code, createdAt, true)
      } catch (e) {
        console.warn('[quick match] search failed', e)
        if (Date.now() - searchStartRef.current >= SEARCH_MIN_MS + BOT_EXTRA_MS) break
        await wait(SCAN_MS)
      }
    }
    if (!stale()) playBot()
  }

  const createPrivate = async () => {
    setError(null)
    setView({ kind: 'busy', label: 'Creating room…' })
    try {
      const { code, createdAt } = await createRoom(netSkin(), playerName, getWallet().gun, false, bestOfRef.current)
      if (!aliveRef.current) return void cancelRoom(code)
      startHosting(code, createdAt, false)
    } catch (e) {
      fail(e)
    }
  }

  // Main menu "Play with Friend" → open a private room as soon as Google sign-in is ready.
  useEffect(() => {
    if (!friendFocusRef.current) return
    if (player?.kind !== 'google') return
    if (view.kind !== 'menu') return
    friendFocusRef.current = false
    void createPrivate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, view.kind])

  const joinByCode = async () => {
    const code = normalizeCode(codeInput)
    if (code.length !== 5) {
      setError('Room codes have 5 characters.')
      return
    }
    // Don't try to join the room you're already hosting.
    if (hostingRef.current?.code === code) {
      setError("That's your own room — share it, or enter your friend's code.")
      return
    }
    setError(null)
    // Leaving a waiting room? Close it first so it doesn't sit empty.
    stopWatching()
    const hosting = hostingRef.current
    hostingRef.current = null
    if (hosting) void cancelRoom(hosting.code)
    setView({ kind: 'busy', label: `Joining ${code}…` })
    try {
      finish(await joinRoom(code, netSkin(), playerName, getWallet().gun))
    } catch (e) {
      fail(e)
    }
  }

  const cancelHosting = () => {
    if (found) return
    searchRef.current++
    stopWatching()
    const hosting = hostingRef.current
    hostingRef.current = null
    if (hosting) void cancelRoom(hosting.code)
    setView({ kind: 'menu' })
  }

  const quickSearch = view.kind === 'searching' || (view.kind === 'hosting' && view.quick)
  const cancellable = view.kind === 'searching' || view.kind === 'hosting'

  useBack(() => {
    cancelHosting()
    return true
  }, cancellable)

  const shareCode = (code: string) => {
    void Share.share({
      message: `Let's duel in Break Buddies! Open Online → Join with code and enter: ${code}`,
    })
  }

  if (!onlineConfigured) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Online" onBack={onBack} />
        <Panel style={styles.center}>
          <Text style={styles.bigTitle}>Online not set up yet</Text>
          <Text style={styles.body}>
            Add your Firebase keys to mobile/.env.local (see .env.example), then restart Metro.
          </Text>
        </Panel>
      </View>
    )
  }

  if (player === undefined) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Online" onBack={onBack} />
        <Panel style={styles.center}>
          <ActivityIndicator size="large" color={colors.gold} />
        </Panel>
      </View>
    )
  }

  // Online multiplayer needs a Google account; older guest sessions are upgraded in place when they sign in.
  if (player === null || player.kind !== 'google') {
    return (
      <ScrollView contentContainerStyle={styles.root}>
        <ScreenHeader title="Online" onBack={onBack} />
        <LiveBanner />

        <Panel style={styles.gate}>
          <View style={styles.gateIcon}>
            <Icon name="lock" size={26} color={colors.gold} />
          </View>
          <Text style={styles.bigTitle}>Unlock Online Multiplayer</Text>
          <Text style={styles.body}>Sign in with Google to duel real players and your friends.</Text>
          <GameButton
            label={authBusy ? 'Signing in…' : 'Sign in with Google'}
            icon="google"
            variant="white"
            size="lg"
            disabled={authBusy}
            onPress={() => runAuth(signInWithGoogle)}
            style={styles.gateButton}
          />
          {authBusy && <ActivityIndicator color={colors.gold} />}
          {error && <Text style={styles.error}>{error}</Text>}
        </Panel>

        <Panel style={styles.perks}>
          <Text style={styles.perksTitle}>WHAT YOU GET</Text>
          <Perk icon="user" text="Quick match against players around the world" />
          <Perk icon="levels" text="Challenge friends with a private room code" />
          <Perk icon="trophy" text="Get ranked: earn RP, climb tiers and the global board" />
        </Panel>
      </ScrollView>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.root} keyboardShouldPersistTaps="handled">
      <ScreenHeader
        title="Online"
        onBack={cancellable ? cancelHosting : onBack}
        right={
          view.kind === 'menu' ? (
            <IconButton icon="gear" size={38} onPress={onSettings} accessibilityLabel="Settings" />
          ) : undefined
        }
      />

      {!cancellable && <LiveBanner />}

      {!quickSearch && <Panel style={styles.me}>
        {player.photoURL ? (
          <Image source={{ uri: player.photoURL }} style={styles.avatar} />
        ) : (
          <SkinPreview skinId={mySkin} side="blue" size={56} animated />
        )}
        <View style={styles.meText}>
          <View style={styles.nameRow}>
            <Text style={styles.meName} numberOfLines={1}>
              {player.name}
            </Text>
            <View style={[styles.badge, styles.badgeGoogle]}>
              <Text style={styles.badgeText}>GOOGLE</Text>
            </View>
          </View>
          <Text style={styles.meSub} numberOfLines={1}>
            Plays as {getSkin(mySkin).name} · best of {bestOf} {bestOf === 1 ? 'round' : 'rounds'}
          </Text>
        </View>
      </Panel>}

      {error && <Text style={styles.error}>{error}</Text>}

      {view.kind === 'menu' && (
        <>
          <QuickMatchCard mySkin={mySkin} bestOf={bestOf} onBestOf={setBestOf}>
            <GameButton label="Find a Rival" icon="play" variant="green" size="sm" onPress={quickMatch} />
          </QuickMatchCard>

          <RankCard player={player} />

          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.dividerText}>PLAY A FRIEND</Text>
            <View style={styles.line} />
          </View>

          <Text style={styles.friendGuide}>Create a room → share the code → your friend taps Join</Text>
          <GameButton label="Create Room" icon="levels" variant="blue" size="sm" onPress={createPrivate} />

          <Panel style={styles.joinPanel}>
            <Text style={styles.joinLabel}>Have a code?</Text>
            <View style={styles.joinRow}>
              <TextInput
                value={codeInput}
                onChangeText={(t) => setCodeInput(normalizeCode(t))}
                placeholder="ABCDE"
                placeholderTextColor="rgba(241, 243, 250, 0.25)"
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={5}
                style={styles.input}
                returnKeyType="go"
                onSubmitEditing={joinByCode}
              />
              <GameButton label="Join" variant="green" size="sm" onPress={joinByCode} />
            </View>
          </Panel>
        </>
      )}

      {view.kind === 'busy' && (
        <Panel style={styles.center}>
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={styles.body}>{view.label}</Text>
        </Panel>
      )}

      {quickSearch && (
        <SearchingCard mySkin={mySkin} found={found}>
          <GameButton label="Cancel" variant="dark" size="sm" onPress={cancelHosting} />
        </SearchingCard>
      )}

      {view.kind === 'hosting' && !view.quick && (
        <Panel style={styles.center}>
          <Text style={styles.joinLabel}>YOUR ROOM CODE</Text>
          <View style={styles.codeRow}>
            {view.code.split('').map((ch, i) => (
              <View key={i} style={styles.codeTile}>
                <Text style={styles.codeChar}>{ch}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.body}>Share this code — or join theirs below</Text>
          <GameButton label="Share Invite" icon="next" variant="green" onPress={() => shareCode(view.code)} />
          <View style={styles.waitRow}>
            <ActivityIndicator color={colors.textDim} />
            <Text style={styles.caption}>Waiting for your friend…</Text>
          </View>

          <View style={styles.orRow}>
            <View style={styles.line} />
            <Text style={styles.dividerText}>OR JOIN THEIRS</Text>
            <View style={styles.line} />
          </View>
          <View style={styles.joinRowHost}>
            <TextInput
              value={codeInput}
              onChangeText={(t) => {
                setCodeInput(normalizeCode(t))
                if (error) setError(null)
              }}
              placeholder="Friend's code"
              placeholderTextColor="rgba(241, 243, 250, 0.25)"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={5}
              style={styles.input}
              returnKeyType="go"
              onSubmitEditing={joinByCode}
            />
            <GameButton label="Join" variant="blue" size="sm" onPress={joinByCode} />
          </View>

          <GameButton label="Cancel" variant="dark" size="sm" onPress={cancelHosting} />
        </Panel>
      )}
    </ScrollView>
  )
}

function Perk({ icon, text }: { icon: 'user' | 'trophy' | 'levels'; text: string }) {
  return (
    <View style={styles.perk}>
      <View style={styles.perkIcon}>
        <Icon name={icon} size={16} color={colors.gold} />
      </View>
      <Text style={styles.perkText}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  perks: {
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  perksTitle: {
    color: colors.textFaint,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  perk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  perkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 207, 63, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  perkText: {
    flex: 1,
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '700',
  },
  root: {
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingBottom: 24,
    gap: 8,
  },
  me: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  meText: {
    flex: 1,
    gap: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.blue,
    margin: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  meName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    flexShrink: 1,
  },
  badge: {
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 999,
  },
  badgeGoogle: {
    backgroundColor: '#4285f4',
  },
  gate: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  gateIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 207, 63, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gateButton: {
    alignSelf: 'stretch',
    marginTop: 2,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  meSub: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '600',
  },
  error: {
    color: colors.red,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  caption: {
    color: colors.textFaint,
    fontSize: 12,
    textAlign: 'center',
    marginTop: -4,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.panelBorder,
  },
  dividerText: {
    color: colors.textFaint,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  friendGuide: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: -4,
  },
  joinPanel: {
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  joinLabel: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  joinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderWidth: 1,
    borderColor: colors.panelBorder,
    color: colors.gold,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 6,
    textAlign: 'center',
    marginBottom: 3,
  },
  center: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  bigTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  body: {
    color: colors.textDim,
    fontSize: 13,
    textAlign: 'center',
  },
  codeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  codeTile: {
    width: 40,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.gold,
    borderBottomWidth: 4,
    borderBottomColor: '#c28a12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeChar: {
    color: '#3d2805',
    fontSize: 22,
    fontWeight: '900',
  },
  waitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  orRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  joinRowHost: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
})
