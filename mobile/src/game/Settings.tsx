import { useState } from 'react'
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { deletePlayerAccount, signInWithGoogle, signOutPlayer, type Player } from '../net/account'
import { onlineConfigured } from '../net/firebase'
import { useRank } from '../net/rank'
import { Avatar } from './Avatar'
import { PlayerName } from './PlayerName'
import { RankCard } from './RankCard'
import { useStats } from './stats'
import { useWallet } from './wallet'
import {
  getAudioSettings,
  playShoot,
  playTap,
  playVoice,
  setAudioSettings,
  type AudioSettings,
  type Level,
} from './sound'
import { setVibration, vibrationOn } from './haptics'
import { colors } from './theme'
import { GameButton, Icon, Panel, ScreenHeader, type IconName } from './ui'
import { openPrivacyOptions, useAds } from '../monetize/ads'
import { restore } from '../monetize/purchases'
import { PRIVACY_URL, TERMS_URL } from './legal'

const LEVEL_LABELS = ['Off', 'Low', 'Mid', 'High'] as const

const ROWS: { key: keyof AudioSettings; label: string; icon: IconName; hint: string }[] = [
  { key: 'music', label: 'Music', icon: 'music', hint: 'Background tune' },
  { key: 'sfx', label: 'Effects', icon: 'speaker', hint: 'Shots, breaks, buttons' },
  { key: 'voice', label: 'Voices', icon: 'voice', hint: 'Character squeaks & yays' },
]

/** Music / effects / voice volume pickers; changes apply and save immediately. */
export function SoundControls() {
  const [audio, setAudio] = useState<AudioSettings>(getAudioSettings)

  const change = (key: keyof AudioSettings, level: Level) => {
    const next = { ...audio, [key]: level }
    setAudio(next)
    setAudioSettings(next)
    if (key === 'sfx') playShoot()
    else if (key === 'voice') playVoice('yay')
    else playTap()
  }

  const allOff = audio.music === 0 && audio.sfx === 0 && audio.voice === 0

  return (
    <View style={styles.controls}>
      {ROWS.map((row) => (
        <View key={row.key} style={styles.row}>
          <View style={styles.rowHead}>
            <View style={styles.rowIcon}>
              <Icon name={row.icon} size={20} color={audio[row.key] ? colors.gold : colors.textFaint} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Text style={styles.rowHint}>{row.hint}</Text>
            </View>
          </View>
          <View style={styles.segment}>
            {LEVEL_LABELS.map((label, i) => {
              const active = audio[row.key] === i
              return (
                <Pressable
                  key={label}
                  onPress={() => change(row.key, i as Level)}
                  style={[styles.segBtn, active && (i === 0 ? styles.segOff : styles.segOn)]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${row.label} ${label}`}
                >
                  <Text style={[styles.segText, active && i > 0 && styles.segTextOn, active && i === 0 && styles.segTextMuted]}>{label}</Text>
                </Pressable>
              )
            })}
          </View>
        </View>
      ))}

      <GameButton
        label={allOff ? 'Sound On' : 'Mute All'}
        icon="speaker"
        variant="dark"
        size="sm"
        onPress={() => {
          const next: AudioSettings = allOff ? { music: 2, sfx: 3, voice: 3 } : { music: 0, sfx: 0, voice: 0 }
          setAudio(next)
          setAudioSettings(next)
        }}
      />
    </View>
  )
}

function VibrationToggle() {
  const [on, setOn] = useState(vibrationOn)
  return (
    <View style={[styles.row, styles.vibeRow]}>
      <View style={styles.rowHead}>
        <View style={styles.rowIcon}>
          <Icon name="fire" size={20} color={on ? colors.gold : colors.textFaint} />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel}>Vibration</Text>
          <Text style={styles.rowHint}>Buzz on shots, hits and wins</Text>
        </View>
      </View>
      <View style={styles.segment}>
        {(['Off', 'On'] as const).map((label, i) => {
          const active = on === (i === 1)
          return (
            <Pressable
              key={label}
              onPress={() => {
                setOn(i === 1)
                setVibration(i === 1)
                playTap()
              }}
              style={[styles.segBtn, active && (i === 0 ? styles.segOff : styles.segOn)]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Vibration ${label}`}
            >
              <Text style={[styles.segText, active && i > 0 && styles.segTextOn, active && i === 0 && styles.segTextMuted]}>{label}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

function StatTiles({ player }: { player: Player | null | undefined }) {
  const rank = useRank(player)
  const stats = useStats()
  const { coins } = useWallet()
  const wins = rank?.wins ?? stats.onlineWins
  const losses = rank?.losses ?? stats.onlineLosses
  const played = wins + losses
  const tiles: { label: string; value: string; color: string }[] = [
    { label: 'Online W–L', value: `${wins}–${losses}`, color: colors.text },
    { label: 'Win Rate', value: played ? `${Math.round((wins / played) * 100)}%` : '–', color: colors.green },
    { label: 'Best Streak', value: `${stats.bestStreak}`, color: colors.red },
    { label: 'Coins', value: coins.toLocaleString('en-US'), color: colors.gold },
  ]
  return (
    <View style={styles.tiles}>
      {tiles.map((t) => (
        <View key={t.label} style={styles.tile}>
          <Text style={[styles.tileValue, { color: t.color }]} numberOfLines={1} adjustsFontSizeToFit>
            {t.value}
          </Text>
          <Text style={styles.tileLabel} numberOfLines={1}>
            {t.label}
          </Text>
        </View>
      ))}
    </View>
  )
}

function AccountPanel({ player, skinId }: { player: Player | null | undefined; skinId: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [renaming, setRenaming] = useState(false)
  const google = player?.kind === 'google'

  const run = async (action: () => Promise<unknown>) => {
    setError(null)
    setBusy(true)
    try {
      await action()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel style={[styles.panel, styles.buttons]}>
      <Text style={styles.section}>Account</Text>
      <View style={styles.account}>
        <Avatar player={player} skinId={skinId} size={52} ring={google ? colors.blue : colors.textFaint} />
        <View style={styles.accountText}>
          <View style={styles.accountNameRow}>
            {google ? (
              <PlayerName player={player} textStyle={styles.accountName} onEditing={setRenaming} />
            ) : (
              <Text style={styles.accountName} numberOfLines={1}>
                Not signed in
              </Text>
            )}
            {google && !renaming && (
              <View style={styles.googleBadge}>
                <Text style={styles.googleBadgeText}>GOOGLE</Text>
              </View>
            )}
          </View>
          <Text style={styles.rowHint}>{google ? 'Online play and ranking unlocked' : 'Sign in to play online'}</Text>
        </View>
      </View>
      <RankCard player={player} />
      <StatTiles player={player} />
      {onlineConfigured &&
        player !== undefined &&
        (google ? (
          <>
            <GameButton label="Sign Out" variant="dark" size="sm" disabled={busy} onPress={() => run(signOutPlayer)} />
            <GameButton
              label="Delete Account"
              variant="red"
              size="sm"
              disabled={busy}
              onPress={() => {
                Alert.alert(
                  'Delete account?',
                  'This permanently removes your Google sign-in for Break Buddies and your online ranking. Purchases stay with Google Play and can be restored on a new account. This cannot be undone.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () =>
                        run(async () => {
                          const ok = await deletePlayerAccount()
                          if (!ok) return
                          Alert.alert('Account deleted', 'Your account and ranking data are gone.')
                        }),
                    },
                  ],
                )
              }}
            />
          </>
        ) : (
          <GameButton
            label="Sign in with Google"
            icon="google"
            variant="white"
            size="sm"
            disabled={busy}
            onPress={() => run(signInWithGoogle)}
          />
        ))}
      {busy && <ActivityIndicator color={colors.gold} />}
      {error && <Text style={styles.error}>{error}</Text>}
    </Panel>
  )
}

export function SettingsScreen({
  onBack,
  player,
  skinId,
}: {
  onBack: () => void
  player: Player | null | undefined
  skinId: string
}) {
  const { privacyOptions } = useAds()
  const [restoreNote, setRestoreNote] = useState('')
  return (
    <ScrollView contentContainerStyle={styles.root} showsVerticalScrollIndicator={false}>
      <ScreenHeader title="Settings" onBack={onBack} />
      <AccountPanel player={player} skinId={skinId} />
      <Panel style={styles.panel}>
        <Text style={styles.section}>Sound</Text>
        <SoundControls />
        <VibrationToggle />
      </Panel>
      <Panel style={[styles.panel, styles.buttons]}>
        <Text style={styles.section}>Purchases</Text>
        <GameButton
          label="Restore Purchases"
          icon="retry"
          variant="dark"
          size="sm"
          onPress={async () => {
            setRestoreNote('Restoring…')
            const result = await restore()
            setRestoreNote(result === 'ok' ? 'Heroes and Remove Ads restored.' : "Couldn't reach the store. Try again later.")
          }}
        />
        {restoreNote !== '' && <Text style={styles.note}>{restoreNote}</Text>}
        {privacyOptions && (
          <GameButton label="Ad Privacy Options" icon="gear" variant="dark" size="sm" onPress={() => void openPrivacyOptions()} />
        )}
        <GameButton
          label="Privacy Policy"
          icon="gear"
          variant="dark"
          size="sm"
          onPress={() => {
            playTap()
            void Linking.openURL(PRIVACY_URL)
          }}
        />
        <GameButton
          label="Terms of Service"
          icon="gear"
          variant="dark"
          size="sm"
          onPress={() => {
            playTap()
            void Linking.openURL(TERMS_URL)
          }}
        />
      </Panel>
      <Text style={styles.credit}>All music and sounds are original, made for Break Buddies.</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 14,
  },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountText: {
    flex: 1,
    gap: 2,
  },
  accountNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accountName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
    flexShrink: 1,
  },
  googleBadge: {
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 999,
    backgroundColor: '#4285f4',
  },
  googleBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  tiles: {
    flexDirection: 'row',
    gap: 6,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  tileValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  tileLabel: {
    color: colors.textFaint,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  error: {
    color: colors.red,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  panel: {
    padding: 16,
  },
  buttons: {
    gap: 10,
  },
  note: {
    color: colors.textFaint,
    fontSize: 12,
    textAlign: 'center',
  },
  section: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  controls: {
    alignSelf: 'stretch',
    gap: 16,
  },
  row: {
    gap: 8,
  },
  vibeRow: {
    marginTop: 16,
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  rowHint: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '600',
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 14,
    padding: 3,
    gap: 3,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 11,
    alignItems: 'center',
  },
  segOn: {
    backgroundColor: colors.gold,
  },
  segOff: {
    backgroundColor: '#4a4470',
  },
  segText: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '800',
  },
  segTextOn: {
    color: '#3d2805',
  },
  segTextMuted: {
    color: colors.text,
  },
  credit: {
    color: colors.textFaint,
    fontSize: 12,
    textAlign: 'center',
  },
})
