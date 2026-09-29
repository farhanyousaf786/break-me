import { useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import type { Player } from '../net/account'
import { RP_FLAWLESS, RP_LOSS, RP_STREAK, RP_WIN, STREAK_FOR_BONUS, TIERS, tierFor, useRank, type Tier } from '../net/rank'
import { playTap } from './sound'
import { colors } from './theme'
import { GameButton, Icon, Panel } from './ui'

function TierPill({ tier }: { tier: Tier | null }) {
  return (
    <View style={[styles.pill, { backgroundColor: tier ? tier.color : 'rgba(255, 255, 255, 0.14)' }]}>
      <Icon name="trophy" size={12} color={tier ? tier.ink : colors.textDim} />
      <Text style={[styles.pillText, { color: tier ? tier.ink : colors.textDim }]}>{tier ? tier.name.toUpperCase() : 'UNRANKED'}</Text>
    </View>
  )
}

/** Player's ranking. Players not signed in with Google see an "Unranked" tag and a nudge to sign in. */
export function RankCard({ player }: { player: Player | null | undefined }) {
  const rank = useRank(player)
  const [rules, setRules] = useState(false)
  const ranked = player?.kind === 'google'
  const openRules = () => {
    playTap()
    setRules(true)
  }

  return (
    <>
      <Pressable onPress={openRules} accessibilityRole="button" accessibilityLabel="How ranking works">
        <Panel style={styles.card}>
          {ranked ? <RankedBody rp={rank?.rp ?? 0} position={rank?.position ?? null} /> : <UnrankedBody />}
          <Text style={styles.link}>How ranking works ›</Text>
        </Panel>
      </Pressable>
      {rules && <RankRules onClose={() => setRules(false)} />}
    </>
  )
}

function RankedBody({ rp, position }: { rp: number; position: number | null }) {
  const { tier, next, progress } = tierFor(rp)
  return (
    <>
      <View style={styles.row}>
        <TierPill tier={tier} />
        <Text style={styles.rp}>
          {rp.toLocaleString('en-US')} <Text style={styles.rpUnit}>RP</Text>
        </Text>
        <View style={styles.flex} />
        {position !== null && <Text style={styles.position}>#{position.toLocaleString('en-US')} global</Text>}
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(progress * 100)}%`, backgroundColor: tier.color }]} />
      </View>
      <Text style={styles.sub}>{next ? `${next.min - rp} RP to ${next.name}` : 'Top tier reached. Legend!'}</Text>
    </>
  )
}

function UnrankedBody() {
  return (
    <>
      <View style={styles.row}>
        <TierPill tier={null} />
        <View style={styles.flex} />
        <View style={styles.lockTag}>
          <Icon name="lock" size={11} color={colors.gold} />
          <Text style={styles.lockText}>GOOGLE ONLY</Text>
        </View>
      </View>
      <Text style={styles.sub}>Sign in with Google to get ranked, earn RP and climb the global board.</Text>
    </>
  )
}

export function RankRules({ onClose }: { onClose: () => void }) {
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable onPress={() => {}} style={styles.sheetWrap}>
          <Panel style={styles.sheet}>
            <ScrollView contentContainerStyle={styles.sheetBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.title}>How Ranking Works</Text>

              <Text style={styles.section}>WHO GETS RANKED</Text>
              <Rule text="Sign in with Google to get ranked and earn RP." />
              <Rule text="Only online matches count (Quick Match and private rooms)." />

              <Text style={styles.section}>RANK POINTS (RP)</Text>
              <Rule text={`Win a match: +${RP_WIN} RP`} good />
              <Rule text={`Flawless win (best of 3 or 5, no round lost): +${RP_FLAWLESS} bonus`} good />
              <Rule text={`${STREAK_FOR_BONUS}+ wins in a row: +${RP_STREAK} bonus per win`} good />
              <Rule text="Opponent leaves: counts as a win" good />
              <Rule text={`Lose a match: −${RP_LOSS} RP (never below 0)`} bad />

              <Text style={styles.section}>TIERS</Text>
              {TIERS.map((t, i) => (
                <View key={t.name} style={styles.tierRow}>
                  <TierPill tier={t} />
                  <Text style={styles.tierRange}>
                    {TIERS[i + 1] ? `${t.min}–${TIERS[i + 1].min - 1} RP` : `${t.min}+ RP`}
                  </Text>
                </View>
              ))}

              <Text style={styles.section}>GLOBAL POSITION</Text>
              <Rule text="Your spot among all ranked players, by RP. Ties share a spot." />
            </ScrollView>
            <GameButton label="Got it" variant="green" onPress={onClose} />
          </Panel>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function Rule({ text, good, bad }: { text: string; good?: boolean; bad?: boolean }) {
  return (
    <View style={styles.rule}>
      <View style={[styles.bullet, { backgroundColor: good ? colors.green : bad ? colors.red : colors.textFaint }]} />
      <Text style={styles.ruleText}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flex: {
    flex: 1,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  rp: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  rpUnit: {
    color: colors.textFaint,
    fontSize: 11,
  },
  position: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '900',
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  sub: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '600',
  },
  link: {
    color: colors.blueSoft,
    fontSize: 11,
    fontWeight: '800',
  },
  lockTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 207, 63, 0.5)',
  },
  lockText: {
    color: colors.gold,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(6, 5, 18, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  sheetWrap: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
  },
  sheet: {
    gap: 14,
    paddingVertical: 20,
    paddingHorizontal: 18,
    backgroundColor: '#1c1740',
    borderColor: 'rgba(255, 207, 63, 0.35)',
    borderWidth: 2,
    flexShrink: 1,
  },
  sheetBody: {
    gap: 8,
  },
  title: {
    color: colors.gold,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 4,
  },
  section: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 8,
  },
  rule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  ruleText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tierRange: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '800',
  },
})
