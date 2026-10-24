import { Canvas, Picture, createPicture, type SkPicture } from '@shopify/react-native-skia'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native'
import {
  botRematch,
  createRoom,
  hostMatched,
  joinRoom,
  setNextRoom,
  setRematch,
  winsNeeded,
  leaveMatch,
  onChat,
  onShot,
  onSnapshot,
  reportScore,
  sendChat,
  sendShot,
  sendSnapshot,
  markReady,
  onGuestReady,
  watchRoom,
  watchRoomMeta,
  type Match,
  type Score,
} from '../net/rooms'
import { applySnapshot, encodeSnapshot, extrapolate, type Snapshot } from '../net/snapshot'
import { ageTaunts, createState, sayTaunt, tryShootBlue, tryShootRed, updateGame } from './engine'
import { HUD_BUTTON, Modal, useFramePicture } from './GameScreen'
import { LEVELS } from './levels'
import { CHAT_LINES, QuickChat } from './QuickChat'
import { fitStage, renderStage, type StageFit } from './render'
import { DEFAULT_GUN, isGunId } from './guns'
import { LOOK_PREFIX } from './look'
import { ME_ID, getSkin, remoteSkin } from './skins'
import { playVoice } from './sound'
import { trackDaily } from './daily'
import { buzz } from './haptics'
import { RP_LOSS, recordRankedResult } from '../net/rank'
import { COUNTDOWN_MS, Countdown } from './Countdown'
import { recordOnlineResult } from './stats'
import { colors } from './theme'
import type { GameState } from './types'
import { CoinDot, GameButton, IconButton } from './ui'
import { getWallet, rewardOnline } from './wallet'
import { useBack } from './useBack'
import { maybeShowInterstitial, noteResult } from '../monetize/ads'

type Props = {
  match: Match
  onExit: () => void
  /** Both players agreed to go again */
  onRematch: (match: Match) => void
}

type Side = 'blue' | 'red'

const SNAP_MS = 66
const ROUND_PAUSE_MS = 1500
const GUEST_SHOT_GAP_MS = 300
/** Longest the host waits for the guest's screen before starting the first countdown anyway. */
const READY_WAIT_MS = 6000
const EARLY_SHOT_GRACE_MS = 400

const randomLevel = () => 1 + Math.floor(Math.random() * LEVELS.length)
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]

const QUIT_NOTES = [
  'Tactical retreat? Sure, let’s call it that.',
  'Bawk bawk! Chicken mode activated.',
  'Your rival is doing a victory dance right now.',
  'Legends say you’re still running.',
  'Your buddy is still spinning, looking for you.',
  'The arena will remember this…',
]
const LEFT_NOTES = [
  '%s rage-quit! Must be scared of your aim.',
  '%s ran away faster than a recoil spin!',
  '%s suddenly remembered the oven was on.',
  '%s left the arena. Free win, zero effort!',
  '%s saw your skills and noped out.',
]

const BOT_ROUND_WON = ['GG!', 'Too easy!', 'Hehe!', 'Boop!', 'Catch me!']
const BOT_ROUND_LOST = ['Lucky shot!', 'Nice one!', 'Oops, my bad', "I'm dizzy...", 'Okay okay']

function drawFrame(state: GameState, fit: StageFit, prompt: string | undefined, you: Side): SkPicture {
  return createPicture((canvas) => renderStage(canvas, state, fit, prompt, you), { width: fit.width, height: fit.height })
}

export function OnlineGame({ match, onExit, onRematch }: Props) {
  const isHost = match.role === 'host'
  const bestOf = match.bestOf
  const need = winsNeeded(bestOf)
  const bot = Boolean(match.bot)
  const mySide: Side = isHost ? 'blue' : 'red'
  const oppSide: Side = isHost ? 'red' : 'blue'
  // My own creation arrives back as its look code; show it as "Me!" so the photo face still applies.
  const [skins] = useState(() => {
    const mine = (id: string) => (id.startsWith(LOOK_PREFIX) ? ME_ID : id)
    return match.role === 'host'
      ? { blue: mine(match.hostSkin), red: remoteSkin(match.guestSkin) }
      : { blue: remoteSkin(match.hostSkin), red: mine(match.guestSkin) }
  })
  // Remote gun ids are checked against the catalog; unknown ones draw as the default blaster.
  const [guns] = useState(() => ({
    blue: isGunId(match.hostGun) ? match.hostGun : DEFAULT_GUN,
    red: isGunId(match.guestGun) ? match.guestGun : DEFAULT_GUN,
  }))
  // Show your equipped aura on your side; rival aura isn't synced over the wire yet.
  const [auras] = useState(() => {
    const mine = getWallet().aura
    return isHost ? { blue: mine } : { red: mine }
  })
  const [initial] = useState(() =>
    createState(isHost ? randomLevel() : 1, skins, { redAI: bot, guns, auras, powerups: true }),
  )

  const stateRef = useRef<GameState>(initial)
  // The 3-2-1 countdown covers the first round's wait, so no banner underneath it.
  const messageRef = useRef('')
  const [counting, setCounting] = useState(true)
  const countingRef = useRef(true)
  const [roundNo, setRoundNo] = useState(1)
  /** Every round opens with its own 3-2-1. */
  /** When GO lands (`performance.now()`), taken from the host so both phones start together; null = not known yet. */
  const [goAt, setGoAt] = useState<number | null>(null)
  const startRound = (n: number, at: number | null = null) => {
    countingRef.current = true
    setRoundNo(n)
    setGoAt(at)
    setCounting(true)
  }
  const freezeUntilRef = useRef(0)
  const redShotsRef = useRef(0)
  /** Guest: the host's latest snapshot says play is on. */
  const hostLiveRef = useRef(false)
  const pendingShotRef = useRef(false)
  const lastShotRef = useRef(0)
  const pickupsRef = useRef(0)
  /** Counts power-ups this player grabbed (the counter resets each round) for daily missions. */
  const notePickups = (s: GameState) => {
    const n = s.guns[mySide === 'blue' ? 0 : 1].pickups ?? 0
    if (n > pickupsRef.current) {
      trackDaily('powerups', n - pickupsRef.current)
      buzz('power')
    }
    pickupsRef.current = n
  }
  const leftRef = useRef(false)

  const [fit, setFit] = useState<StageFit | null>(null)
  const fitRef = useRef<StageFit | null>(null)
  const picture = useFramePicture()
  const [score, setScore] = useState<Score>({ blue: 0, red: 0 })
  /** left = the opponent walked out, quit = I walked out */
  const [overlay, setOverlay] = useState<null | 'left' | 'done' | 'quit'>(null)
  const [winner, setWinner] = useState<Side | null>(null)
  const [confirmQuit, setConfirmQuit] = useState(false)
  const [notes] = useState(() => ({ quit: pick(QUIT_NOTES), left: pick(LEFT_NOTES) }))

  /* ---- rematch (after the match, chess.com style) ---- */
  const myRole = match.role
  const oppRole = isHost ? 'guest' : 'host'
  const [rematchState, setRematchState] = useState<Partial<Record<'host' | 'guest', boolean>>>({})
  const [nextCode, setNextCode] = useState<string | null>(null)
  const [oppGone, setOppGone] = useState(false)
  const roomGoneRef = useRef(false)
  const [rematchError, setRematchError] = useState<string | null>(null)
  const rematchStartedRef = useRef(false)
  const botTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => () => botTimers.current.forEach(clearTimeout), [])
  const later = (fn: () => void, ms: number) => {
    botTimers.current.push(setTimeout(fn, ms))
  }

  const answerRematch = (value: boolean | null) => {
    setRematchError(null)
    if (!bot) return setRematch(match.code, myRole, value)
    setRematchState((r) => ({ ...r, [myRole]: value ?? undefined }))
    // The stand-in thinks it over, then usually says yes.
    if (value === true && rematchState[oppRole] === undefined) {
      later(() => setRematchState((r) => (r[myRole] ? { ...r, [oppRole]: Math.random() < 0.85 } : r)), 1200 + Math.random() * 1500)
    }
  }

  // A stand-in sometimes asks first, like a real rival would.
  useEffect(() => {
    if (!bot || overlay !== 'done' || Math.random() > 0.4) return
    later(() => setRematchState((r) => (r[myRole] === undefined ? { ...r, [oppRole]: true } : r)), 2500 + Math.random() * 2000)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay])

  // Both said yes: the host opens the new room and posts its code; the guest follows it.
  useEffect(() => {
    if (!rematchState.host || !rematchState.guest || rematchStartedRef.current || overlay !== 'done') return
    rematchStartedRef.current = true
    if (bot) {
      later(() => onRematch(botRematch(match)), 900)
      return
    }
    if (!isHost) return
    let unwatch: (() => void) | null = null
    const giveUp = setTimeout(() => {
      unwatch?.()
      setRematchError("Couldn't start the rematch. Try again from the lobby.")
    }, 15000)
    void (async () => {
      try {
        const { code } = await createRoom(match.hostSkin, match.hostName, match.hostGun, false, bestOf)
        await setNextRoom(match.code, code)
        unwatch = watchRoom(code, (doc) => {
          if (doc && doc.status === 'playing' && doc.guest) {
            clearTimeout(giveUp)
            unwatch?.()
            hostMatched(code, doc).then(onRematch, () => setRematchError("Couldn't start the rematch."))
          }
        })
      } catch {
        clearTimeout(giveUp)
        setRematchError("Couldn't start the rematch.")
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rematchState, overlay])

  useEffect(() => {
    if (isHost || !nextCode) return
    joinRoom(nextCode, match.guestSkin, match.guestName, match.guestGun).then(onRematch, () =>
      setRematchError("Couldn't join the rematch."),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextCode])

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    const next = fitStage(width, height)
    fitRef.current = next
    setFit(next)
  }

  const draw = () => {
    if (fitRef.current) {
      picture.value = drawFrame(stateRef.current, fitRef.current, messageRef.current || undefined, mySide)
    }
  }

  useEffect(
    () =>
      bot
        ? undefined
        : watchRoomMeta(match.code, (doc) => {
        if (!doc || doc.status === 'left') {
          roomGoneRef.current = true
          setOppGone(true)
          setOverlay((o) => (o === 'done' || o === 'quit' ? o : 'left'))
          return
        }
        const rematch = doc.rematch ?? {}
        setRematchState((r) => (r.host === rematch.host && r.guest === rematch.guest ? r : rematch))
        if (doc.next) setNextCode(doc.next)
        const next = doc.score
        if (next) setScore((s) => (s.blue === next.blue && s.red === next.red ? s : next))
        if (doc.status === 'done' && doc.winner) {
          setWinner(doc.winner)
          setOverlay('done')
        }
      }),
    [match.code],
  )

  useEffect(
    () =>
      bot
        ? undefined
        : onChat(match.code, isHost ? 'guest' : 'host', (text) => {
            stateRef.current = sayTaunt(stateRef.current, oppSide, text)
          }),
    [match.code, isHost, oppSide, bot],
  )

  const botReply = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(botReply.current), [])
  const botSays = (text: string, delayMs: number) => {
    clearTimeout(botReply.current)
    botReply.current = setTimeout(() => {
      if (!stateRef.current.guns[1].broken) stateRef.current = sayTaunt(stateRef.current, 'red', text)
    }, delayMs)
  }

  const say = (text: string) => {
    stateRef.current = sayTaunt(stateRef.current, mySide, text)
    if (bot) {
      if (Math.random() < 0.5) botSays(pick(CHAT_LINES.filter((l) => l !== text)), 900 + Math.random() * 1400)
      return
    }
    sendChat(match.code, match.role, text)
  }

  const recordedRef = useRef(false)
  /** RP change from this match: undefined until known, null for unranked guests. */
  const [rpDelta, setRpDelta] = useState<number | null | undefined>(undefined)
  const [coinsEarned, setCoinsEarned] = useState(0)
  useEffect(() => {
    const won = overlay === 'left' || (overlay === 'done' && winner === mySide)
    if (overlay === 'left' || overlay === 'quit' || (overlay === 'done' && winner)) {
      playVoice(won ? 'yay' : 'wahwah')
      // A finished round already vibrated on the break; only a walk-out win needs its own buzz.
      if (overlay === 'left') buzz('win')
      if (!recordedRef.current) {
        recordedRef.current = true
        trackDaily('play')
        if (won) {
          trackDaily('win')
          trackDaily('onlineWin')
        }
        recordOnlineResult(won)
        setCoinsEarned(rewardOnline(won))
        noteResult()
        const flawless = overlay === 'done' && won && bestOf > 1 && score[oppSide] === 0
        if (match.selfMatch) setRpDelta(null)
        else recordRankedResult(won, flawless).then(setRpDelta, () => setRpDelta(null))
      }
    }
  }, [overlay, winner, mySide, oppSide, score])

  useEffect(() => {
    const leave = () => {
      if (bot || leftRef.current) return
      leftRef.current = true
      void leaveMatch(match.code, match.role)
    }
    let raf = 0
    let last = performance.now()

    if (isHost) {
      const unsubShots = bot
        ? () => {}
        : onShot(match.code, () => {
            redShotsRef.current += 1
          })
      let lastSnap = 0
      let round = 1
      let settleAt = 0
      let over = false
      let tally: Score = { blue: 0, red: 0 }
      let readyWait: ReturnType<typeof setTimeout> | undefined
      let unsubReady = () => {}
      if (bot) {
        freezeUntilRef.current = performance.now() + COUNTDOWN_MS
      } else {
        freezeUntilRef.current = Number.POSITIVE_INFINITY
        let started = false
        const begin = () => {
          if (started || leftRef.current) return
          started = true
          clearTimeout(readyWait)
          const at = performance.now() + COUNTDOWN_MS
          freezeUntilRef.current = at
          setGoAt(at)
        }
        readyWait = setTimeout(begin, READY_WAIT_MS)
        unsubReady = onGuestReady(match.code, begin)
      }

      const tick = () => {
        raf = requestAnimationFrame(tick)
        // The rAF timestamp can run on a different clock than performance.now() on some phones.
        const now = performance.now()
        const dt = Math.min(0.033, (now - last) / 1000)
        last = now
        let state = stateRef.current

        if (!over) {
          if (now < freezeUntilRef.current) {
            // A tap just before GO (network jitter) still counts once play starts.
            if (freezeUntilRef.current - now > EARLY_SHOT_GRACE_MS) redShotsRef.current = 0
            state = ageTaunts(state, dt)
          } else {
            messageRef.current = ''
            if (redShotsRef.current > 0) {
              redShotsRef.current = 0
              state = tryShootRed(state)
            }
            state = updateGame(state, dt)
            if (state.phase !== 'playing' && settleAt === 0) settleAt = now + ROUND_PAUSE_MS
            if (settleAt && now >= settleAt) {
              settleAt = 0
              tally =
                state.phase === 'won' ? { ...tally, blue: tally.blue + 1 } : { ...tally, red: tally.red + 1 }
              if (bot) {
                setScore(tally)
                if (Math.random() < 0.4) botSays(pick(state.phase === 'won' ? BOT_ROUND_LOST : BOT_ROUND_WON), 300)
              } else {
                reportScore(match.code, tally, bestOf)
              }
              if (tally.blue >= need || tally.red >= need) {
                over = true
                if (bot) {
                  setWinner(tally.blue >= need ? 'blue' : 'red')
                  setOverlay('done')
                }
              } else {
                round += 1
                state = createState(randomLevel(), skins, { redAI: bot, guns, auras, powerups: true })
                freezeUntilRef.current = now + COUNTDOWN_MS
                messageRef.current = ''
                startRound(round, freezeUntilRef.current)
              }
            }
          }
        } else {
          state = ageTaunts(state, dt)
        }

        stateRef.current = state
        notePickups(state)
        if (!bot && !roomGoneRef.current && !leftRef.current && now - lastSnap >= SNAP_MS) {
          lastSnap = now
          const left = freezeUntilRef.current - now
          const countdown = left === Number.POSITIVE_INFINITY ? -1 : Math.max(0, Math.round(left))
          sendSnapshot(match.code, encodeSnapshot(state, round, messageRef.current, countdown))
        }
        draw()
      }
      raf = requestAnimationFrame(tick)
      return () => {
        cancelAnimationFrame(raf)
        unsubShots()
        unsubReady()
        clearTimeout(readyWait)
        leave()
      }
    }

    let latest: Snapshot | null = null
    let fresh = false
    let round = -1
    let syncedGoAt: number | null = null
    markReady(match.code)
    const unsubSnap = onSnapshot(match.code, (s) => {
      latest = s
      fresh = true
    })

    const tick = () => {
      raf = requestAnimationFrame(tick)
      const now = performance.now()
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      let state = stateRef.current
      if (fresh && latest) {
        fresh = false
        const snap: Snapshot = latest
        if (snap.r !== round || snap.lv !== state.level) {
          if (round !== -1 && snap.r > round) {
            startRound(snap.r)
            syncedGoAt = null
            pendingShotRef.current = false
          }
          round = snap.r
          state = createState(snap.lv, skins, { redAI: false, guns, auras, powerups: true })
        }
        state = applySnapshot(state, snap)
        messageRef.current = snap.m ?? ''
        hostLiveRef.current = snap.c === undefined || snap.c === 0
        if (countingRef.current && snap.c !== undefined && snap.c >= 0) {
          const at = now + snap.c
          if (syncedGoAt === null || Math.abs(at - syncedGoAt) > 150) {
            syncedGoAt = at
            setGoAt(at)
          }
        }
      }
      stateRef.current = extrapolate(state, dt)
      if (hostLiveRef.current && pendingShotRef.current) {
        pendingShotRef.current = false
        guestShoot(stateRef.current)
      }
      notePickups(stateRef.current)
      draw()
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      unsubSnap()
      leave()
    }
    // The match is fixed for the lifetime of this screen.
  }, [])

  const fire = () => {
    if (overlay || countingRef.current) return
    const now = performance.now()
    if (isHost) {
      if (now < freezeUntilRef.current) return
      const prev = stateRef.current
      stateRef.current = tryShootBlue(prev)
      if (stateRef.current !== prev) {
        trackDaily('shots')
      }
      return
    }
    // Our GO can land a moment before the host's; hold the tap and send it once the host is live.
    if (!hostLiveRef.current) {
      pendingShotRef.current = true
      return
    }
    guestShoot(stateRef.current)
  }

  function guestShoot(state: GameState) {
    const now = performance.now()
    if (messageRef.current || state.phase !== 'playing') return
    if (now - lastShotRef.current < GUEST_SHOT_GAP_MS) return
    if (state.bullets.some((b) => b.owner === 'red') || state.guns[1].burstLeft || state.guns[1].fx?.frozen) return
    lastShotRef.current = now
    sendShot(match.code)
    trackDaily('shots')
    // Instant squash feedback; position and bullet arrive with the next host snapshot.
    const guns = [...state.guns] as GameState['guns']
    guns[1] = { ...guns[1], kick: 1 }
    stateRef.current = { ...state, guns }
  }

  useBack(() => {
    if (overlay) leaveResult()
    else setConfirmQuit((open) => !open)
    return true
  })

  const askQuit = () => {
    if (overlay) leaveResult()
    else setConfirmQuit(true)
  }

  /** Walking out counts as a loss; the rival sees the forfeit on their side. */
  const quit = () => {
    setConfirmQuit(false)
    freezeUntilRef.current = Number.POSITIVE_INFINITY
    if (!bot && !leftRef.current) {
      leftRef.current = true
      void leaveMatch(match.code, match.role)
    }
    setOverlay('quit')
  }

  const leaveResult = () => {
    void maybeShowInterstitial().then(exit)
  }

  const exit = () => {
    if (!bot && !leftRef.current) {
      leftRef.current = true
      void leaveMatch(match.code, match.role)
    }
    onExit()
  }

  const me = getSkin(skins[mySide])
  const opp = getSkin(skins[oppSide])
  const oppName = isHost ? match.guestName : match.hostName
  const youWon = winner === mySide

  return (
    <View style={styles.root}>
      <View style={styles.hud}>
        <IconButton icon="back" size={HUD_BUTTON} onPress={askQuit} accessibilityLabel="Leave match" />
        <View style={styles.scoreBox}>
          <View style={styles.side}>
            <Text style={[styles.sideName, { color: colors[mySide] }]} numberOfLines={1}>
              YOU
            </Text>
            <Text style={styles.sideSkin} numberOfLines={1}>
              {me.name}
            </Text>
          </View>
          <Text style={[styles.scoreNum, { color: colors[mySide] }]}>{score[mySide]}</Text>
          <Text style={styles.scoreSep}>:</Text>
          <Text style={[styles.scoreNum, { color: colors[oppSide] }]}>{score[oppSide]}</Text>
          <View style={[styles.side, styles.sideRight]}>
            <Text style={[styles.sideName, { color: colors[oppSide] }]} numberOfLines={1}>
              {oppName}
            </Text>
            <Text style={styles.sideSkin} numberOfLines={1}>
              {opp.name}
            </Text>
          </View>
        </View>
        <View style={styles.firstTo}>
          <Text style={styles.firstToText}>BEST OF</Text>
          <Text style={styles.firstToNum}>{bestOf}</Text>
        </View>
      </View>

      <View style={styles.stage} onLayout={onLayout}>
        {fit && (
          <Pressable onPressIn={fire} style={StyleSheet.absoluteFill}>
            <Canvas style={StyleSheet.absoluteFill}><Picture picture={picture} /></Canvas>
          </Pressable>
        )}
        {fit && counting && !bot && goAt === null && (
          <View style={styles.waiting} pointerEvents="none">
            <Text style={styles.waitingText}>Waiting for {oppName}…</Text>
          </View>
        )}
        {fit && counting && (bot || goAt !== null) && (
          <Countdown
            key={roundNo}
            goAt={bot ? undefined : (goAt ?? undefined)}
            title={bestOf === 1 ? 'ROUND 1' : `ROUND ${roundNo} OF ${bestOf}`}
            subtitle={
              bestOf === 1
                ? `One round vs ${oppName} · winner takes all!`
                : roundNo === 1
                  ? `Win ${need} rounds against ${oppName} to take the match`
                  : score.blue === need - 1 && score.red === need - 1
                    ? `Final round! You ${score[mySide]} – ${score[oppSide]} ${oppName}`
                    : `You ${score[mySide]} – ${score[oppSide]} ${oppName}`
            }
            onGo={() => {
              countingRef.current = false
            }}
            onDone={() => setCounting(false)}
          />
        )}
      </View>

      <QuickChat onSay={say} tint={colors[mySide]} />

      {confirmQuit && !overlay && (
        <Modal title="Quit the match?" subtitle="The match keeps going while you decide!">
          <View style={styles.warnList}>
            <WarnRow text={`You lose ${RP_LOSS} RP`} />
            <WarnRow text="It counts as a loss and your win streak resets" />
            <WarnRow text={`${oppName} gets a free win`} />
          </View>
          <GameButton label="Keep Playing" icon="play" variant="green" size="lg" onPress={() => setConfirmQuit(false)} />
          <GameButton label="Quit Anyway" icon="back" variant="red" onPress={quit} />
        </Modal>
      )}

      {overlay === 'quit' && (
        <Modal title="You Quit!" subtitle={notes.quit} ad>
          <RpResult delta={rpDelta} coins={coinsEarned} />
          <GameButton label="Leave" icon="back" variant="blue" size="lg" onPress={leaveResult} />
        </Modal>
      )}

      {overlay === 'left' && (
        <Modal title="Rival Quit!" subtitle={`${notes.left.replace('%s', oppName)} You win by forfeit.`} stars ad>
          <RpResult delta={rpDelta} coins={coinsEarned} />
          <GameButton label="Back" icon="back" variant="green" size="lg" onPress={leaveResult} />
        </Modal>
      )}

      {overlay === 'done' && (
        <Modal
          title={youWon ? 'You Win!' : 'You Lose'}
          subtitle={`Final score ${score[mySide]} – ${score[oppSide]} vs ${oppName}`}
          stars={youWon}
          ad
        >
          <RpResult delta={rpDelta} coins={coinsEarned} />
          <RematchBox
            oppName={oppName}
            mine={rematchState[myRole]}
            theirs={rematchState[oppRole]}
            gone={oppGone && !bot}
            error={rematchError}
            onAnswer={answerRematch}
          />
          <GameButton label="Leave" icon="back" variant="dark" onPress={leaveResult} />
        </Modal>
      )}
    </View>
  )
}

function RematchBox({
  oppName,
  mine,
  theirs,
  gone,
  error,
  onAnswer,
}: {
  oppName: string
  mine: boolean | undefined
  theirs: boolean | undefined
  gone: boolean
  error: string | null
  onAnswer: (value: boolean | null) => void
}) {
  if (error) return <Text style={styles.rmNote}>{error}</Text>
  if (gone) return <Text style={styles.rmNote}>{oppName} left the arena · no rematch</Text>
  if (mine && theirs)
    return (
      <View style={styles.rmRow}>
        <ActivityIndicator color={colors.gold} />
        <Text style={styles.rmText}>Starting rematch…</Text>
      </View>
    )
  if (theirs === false) return <Text style={styles.rmNote}>{oppName} declined the rematch</Text>
  if (theirs && mine === undefined)
    return (
      <View style={styles.rmOffer}>
        <Text style={styles.rmOfferTitle}>🔁 {oppName} wants a rematch!</Text>
        <View style={styles.rmButtons}>
          <GameButton label="Accept" icon="play" variant="green" size="sm" onPress={() => onAnswer(true)} style={styles.rmHalf} />
          <GameButton label="Decline" variant="dark" size="sm" onPress={() => onAnswer(false)} style={styles.rmHalf} />
        </View>
      </View>
    )
  if (mine)
    return (
      <View style={styles.rmOffer}>
        <View style={styles.rmRow}>
          <ActivityIndicator color={colors.gold} />
          <Text style={styles.rmText}>Waiting for {oppName}…</Text>
        </View>
        <GameButton label="Cancel Request" variant="dark" size="sm" onPress={() => onAnswer(null)} />
      </View>
    )
  if (mine === false) return <Text style={styles.rmNote}>You declined the rematch</Text>
  return <GameButton label="Rematch" icon="retry" variant="gold" size="lg" onPress={() => onAnswer(true)} />
}

function WarnRow({ text }: { text: string }) {
  return (
    <View style={styles.warnRow}>
      <View style={styles.warnDot} />
      <Text style={styles.warnText}>{text}</Text>
    </View>
  )
}

function RpResult({ delta, coins }: { delta: number | null | undefined; coins: number }) {
  const up = typeof delta === 'number' && delta >= 0
  return (
    <View style={styles.results}>
      <View style={styles.resultRow}>
        {coins > 0 && (
          <View style={[styles.rpPill, styles.coinPill]}>
            <CoinDot size={18} />
            <Text style={[styles.rpText, { color: colors.gold }]}>+{coins}</Text>
          </View>
        )}
        {typeof delta === 'number' && (
          <View style={[styles.rpPill, { borderColor: up ? colors.green : colors.red }]}>
            <Text style={[styles.rpText, { color: up ? colors.green : colors.red }]}>
              {up ? '+' : '−'}
              {Math.abs(delta)} RP
            </Text>
          </View>
        )}
      </View>
      {delta === null && <Text style={styles.rpGuest}>Unranked match · no RP this time</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  waiting: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 6, 24, 0.35)',
  },
  waitingText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(21, 17, 46, 0.92)',
  },
  rmOffer: {
    alignSelf: 'stretch',
    gap: 8,
    padding: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 207, 63, 0.12)',
    borderWidth: 2,
    borderColor: colors.gold,
  },
  rmOfferTitle: {
    color: colors.gold,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  rmButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  rmHalf: {
    flex: 1,
  },
  rmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  rmText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  rmNote: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  warnList: {
    alignSelf: 'stretch',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 107, 122, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 107, 122, 0.4)',
  },
  warnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  warnDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.red,
  },
  warnText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  results: {
    alignItems: 'center',
    gap: 6,
  },
  resultRow: {
    flexDirection: 'row',
    gap: 10,
  },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderColor: colors.gold,
  },
  rpPill: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  rpText: {
    fontSize: 20,
    fontWeight: '900',
  },
  rpGuest: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  root: {
    flex: 1,
    paddingBottom: 0,
    gap: 4,
  },
  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: 2,
    gap: 10,
  },
  scoreBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.panelBorder,
  },
  side: {
    flex: 1,
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  sideName: {
    fontSize: 11,
    fontWeight: '900',
  },
  sideSkin: {
    color: colors.textFaint,
    fontSize: 9,
    fontWeight: '800',
  },
  scoreNum: {
    fontSize: 20,
    fontWeight: '900',
  },
  scoreSep: {
    color: colors.textFaint,
    fontSize: 18,
    fontWeight: '900',
  },
  firstTo: {
    width: HUD_BUTTON,
    alignItems: 'center',
  },
  firstToText: {
    color: colors.textFaint,
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  firstToNum: {
    color: colors.gold,
    fontSize: 16,
    fontWeight: '900',
  },
  stage: {
    flex: 1,
  },
})
