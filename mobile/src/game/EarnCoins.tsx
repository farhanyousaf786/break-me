import { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { showRewarded, useAds } from '../monetize/ads'
import { VIDEO_COINS, VIDEO_COINS_PER_DAY } from '../monetize/config'
import { playTap, playVoice } from './sound'
import { colors } from './theme'
import { CoinDot, GameButton, Icon, Panel } from './ui'
import { claimVideoCoins, useWallet, videosLeft } from './wallet'

/** Home-screen pill that opens the watch-a-video popup. */
export function EarnCoinsButton() {
  const [open, setOpen] = useState(false)
  const wallet = useWallet()
  const left = videosLeft(VIDEO_COINS_PER_DAY, wallet)

  return (
    <>
      <Pressable
        onPress={() => {
          playTap()
          setOpen(true)
        }}
        accessibilityRole="button"
        accessibilityLabel={`Earn free coins, ${left} videos left today`}
        style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
      >
        <View style={styles.pillIcon}>
          <Icon name="play" size={14} color="#05331a" />
        </View>
        <Text style={styles.pillText}>Earn Free Coins</Text>
        <View style={styles.pillReward}>
          <CoinDot size={14} />
          <Text style={styles.pillRewardText}>+{VIDEO_COINS}</Text>
        </View>
        {left > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{left}</Text>
          </View>
        )}
      </Pressable>
      {open && <EarnCoinsSheet onClose={() => setOpen(false)} />}
    </>
  )
}

export function EarnCoinsSheet({ onClose }: { onClose: () => void }) {
  const wallet = useWallet()
  const { rewardedReady } = useAds()
  const [phase, setPhase] = useState<'offer' | 'watching' | 'earned' | 'skipped'>('offer')
  const left = videosLeft(VIDEO_COINS_PER_DAY, wallet)

  const watch = async () => {
    setPhase('watching')
    const earned = await showRewarded()
    if (earned) {
      claimVideoCoins(VIDEO_COINS)
      playVoice('yay')
      setPhase('earned')
    } else {
      setPhase('skipped')
    }
  }

  const earned = phase === 'earned'

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.scrim} onPress={phase === 'watching' ? undefined : onClose}>
        <Pressable onPress={() => {}}>
          <Panel style={styles.sheet}>
            <View style={styles.coins}>
              <View style={styles.coinSide}>
                <CoinDot size={34} />
              </View>
              <CoinDot size={52} />
              <View style={styles.coinSide}>
                <CoinDot size={34} />
              </View>
            </View>

            <Text style={styles.title}>{earned ? `+${VIDEO_COINS} Coins!` : 'Free Coins!'}</Text>
            <Text style={styles.sub}>
              {earned
                ? `You now have ${wallet.coins.toLocaleString()} coins. Spend them on new characters!`
                : phase === 'skipped'
                  ? 'Watch the whole video to get your coins.'
                  : `Watch a short video and get ${VIDEO_COINS} coins.`}
            </Text>

            <View style={styles.dots}>
              {Array.from({ length: VIDEO_COINS_PER_DAY }, (_, i) => (
                <View key={i} style={[styles.dot, i < VIDEO_COINS_PER_DAY - left && styles.dotUsed]} />
              ))}
            </View>
            <Text style={styles.left}>
              {left === 0 ? 'All videos used today. Come back tomorrow!' : `${left} of ${VIDEO_COINS_PER_DAY} left today`}
            </Text>

            {left > 0 && phase !== 'earned' && (
              <GameButton
                label={phase === 'watching' ? 'Playing…' : rewardedReady ? 'Watch Video' : 'Video loading…'}
                icon="play"
                variant="green"
                size="lg"
                disabled={!rewardedReady || phase === 'watching'}
                onPress={watch}
              />
            )}
            {earned && left > 0 && (
              <GameButton
                label={rewardedReady ? `Watch another · +${VIDEO_COINS}` : 'Next video loading…'}
                icon="play"
                variant="green"
                disabled={!rewardedReady}
                onPress={watch}
              />
            )}
            <GameButton
              label={earned || left === 0 ? 'Done' : 'Maybe later'}
              variant="dark"
              size="sm"
              disabled={phase === 'watching'}
              onPress={onClose}
            />
          </Panel>
        </Pressable>
      </Pressable>
    </Modal>
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
    paddingRight: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(70, 210, 126, 0.14)',
    borderWidth: 2,
    borderColor: colors.green,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.85,
  },
  pillIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 2,
  },
  pillText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  pillReward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  pillRewardText: {
    color: colors.gold,
    fontSize: 13,
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
    backgroundColor: 'rgba(6, 5, 20, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    width: 300,
    alignItems: 'center',
    gap: 10,
    paddingTop: 22,
    paddingBottom: 18,
    paddingHorizontal: 18,
    borderWidth: 2,
    borderColor: 'rgba(255, 207, 63, 0.55)',
  },
  coins: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    marginBottom: 2,
  },
  coinSide: {
    marginBottom: 4,
  },
  title: {
    color: colors.gold,
    fontSize: 26,
    fontWeight: '900',
  },
  sub: {
    color: colors.textDim,
    fontSize: 14,
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  dot: {
    width: 22,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.green,
  },
  dotUsed: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  left: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
})
