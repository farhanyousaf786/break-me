import { useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { signInWithGoogle, type Player } from '../net/account'
import { onlineConfigured } from '../net/firebase'
import { Avatar } from './Avatar'
import { RankCard } from './RankCard'
import { LEVELS } from './levels'
import { getSkin } from './skins'
import { totalWins, useStats } from './stats'
import { colors } from './theme'
import { GameButton, Icon, Panel, ScreenHeader, type IconName } from './ui'

type Props = {
  player: Player | null | undefined
  skinId: string
  unlocked: number
  onCharacters: () => void
  onBack: () => void
}

export function ProfileScreen({ player, skinId, unlocked, onCharacters, onBack }: Props) {
  const stats = useStats()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (action: () => Promise<unknown>) => {
    setError(null)
    setBusy(true)
    try {
      await action()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed.')
    } finally {
      setBusy(false)
    }
  }

  const cleared = Math.min(unlocked - 1, LEVELS.length)
  const onlineGames = stats.onlineWins + stats.onlineLosses
  const winRate = onlineGames ? `${Math.round((stats.onlineWins / onlineGames) * 100)}%` : '–'

  const google = player?.kind === 'google'
  const name = google ? player.name : 'Not signed in'
  const subtitle = google ? 'Signed in with Google' : 'Sign in with Google to play online'

  return (
    <View style={styles.root}>
      <ScreenHeader title="Profile" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Panel style={styles.card}>
          <Avatar player={player} skinId={skinId} size={96} ring={google ? colors.blue : colors.textFaint} />
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            {google && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>GOOGLE</Text>
              </View>
            )}
          </View>
          <Text style={styles.sub}>{subtitle}</Text>

          {onlineConfigured && player !== undefined && !google && (
            <View style={styles.auth}>
              <GameButton
                label="Sign in with Google"
                icon="google"
                variant="white"
                disabled={busy}
                onPress={() => run(signInWithGoogle)}
              />
            </View>
          )}
          {busy && <ActivityIndicator color={colors.gold} />}
          {error && <Text style={styles.error}>{error}</Text>}
        </Panel>

        <RankCard player={player} />

        <Text style={styles.section}>Stats</Text>
        <View style={styles.grid}>
          <StatTile icon="levels" label="Adventure stage" value={`${Math.min(unlocked, LEVELS.length)}`} sub={`${cleared}/${LEVELS.length} cleared`} color={colors.gold} />
          <StatTile icon="trophy" label="Total wins" value={`${totalWins(stats)}`} sub="CPU + online" color={colors.gold} />
          <StatTile icon="fire" label="Best streak" value={`${stats.bestStreak}`} sub={`Now: ${stats.streak}`} color="#ff9f43" />
          <StatTile icon="star" label="Online win rate" value={winRate} sub={`${onlineGames} matches`} color={colors.green} />
          <StatTile icon="play" label="Vs CPU" value={`${stats.cpuWins}W`} sub={`${stats.cpuLosses} losses`} color={colors.blue} />
          <StatTile icon="user" label="Online" value={`${stats.onlineWins}W`} sub={`${stats.onlineLosses} losses`} color={colors.red} />
        </View>
        <Text style={styles.note}>Stats are saved on this device.</Text>

        <Panel style={styles.fighter}>
          <View style={styles.fighterText}>
            <Text style={styles.fighterLabel}>YOUR FIGHTER</Text>
            <Text style={styles.fighterName}>{getSkin(skinId).name}</Text>
          </View>
          <GameButton label="Change" variant="blue" size="sm" onPress={onCharacters} />
        </Panel>
      </ScrollView>
    </View>
  )
}

function StatTile({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: IconName
  label: string
  value: string
  sub: string
  color: string
}) {
  return (
    <View style={styles.tile}>
      <View style={styles.tileHead}>
        <Icon name={icon} size={16} color={color} />
        <Text style={styles.tileLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={[styles.tileValue, { color }]}>{value}</Text>
      <Text style={styles.tileSub}>{sub}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scroll: {
    paddingTop: 8,
    paddingBottom: 36,
    gap: 14,
  },
  card: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    maxWidth: '100%',
  },
  name: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    flexShrink: 1,
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 999,
    backgroundColor: '#4285f4',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  sub: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '600',
  },
  auth: {
    alignSelf: 'stretch',
    gap: 10,
    marginTop: 8,
  },
  error: {
    color: colors.red,
    fontWeight: '800',
    textAlign: 'center',
  },
  section: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: colors.panel,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    padding: 12,
    gap: 2,
  },
  tileHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tileLabel: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '800',
    flexShrink: 1,
  },
  tileValue: {
    fontSize: 26,
    fontWeight: '900',
    marginTop: 2,
  },
  tileSub: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: '700',
  },
  note: {
    color: colors.textFaint,
    fontSize: 11,
    textAlign: 'center',
  },
  fighter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fighterText: {
    flex: 1,
  },
  fighterLabel: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
  },
  fighterName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
})
