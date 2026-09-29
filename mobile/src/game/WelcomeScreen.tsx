import { useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { signInWithGoogle } from '../net/account'
import { SkinPreview } from './SkinPreview'
import { playTap } from './sound'
import { colors } from './theme'
import { Backdrop, GameButton, Icon, Panel, type IconName } from './ui'

type Props = {
  /** Signed in with Google (the player listener takes it from here) */
  onSignedIn: () => void
  onSkip: () => void
}

/** First launch only: sign in with Google for online play, or skip and play offline. */
export function WelcomeScreen({ onSignedIn, onSkip }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signIn = async () => {
    setError(null)
    setBusy(true)
    try {
      if (await signInWithGoogle()) onSignedIn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={styles.root}>
      <Backdrop />
      <View style={styles.content}>
        <View style={styles.titleWrap}>
          <Text style={styles.eyebrow}>Welcome to</Text>
          <Text style={styles.title}>BREAK</Text>
          <Text style={[styles.title, styles.titleSub]}>BUDDIES!</Text>
        </View>

        <View style={styles.fighters}>
          <SkinPreview skinId="cosmo" side="blue" size={120} animated />
          <SkinPreview skinId="nova" side="red" size={120} animated />
        </View>

        <Panel style={styles.card}>
          <Text style={styles.cardTitle}>Sign in to unlock online</Text>
          <Perk icon="user" text="Duel real players and friends online" />
          <Perk icon="trophy" text="Get ranked and climb the global board" />
          <Perk icon="star" text="Your name and photo on every device" />

          <GameButton
            label={busy ? 'Signing in…' : 'Sign in with Google'}
            icon="google"
            variant="white"
            size="lg"
            disabled={busy}
            onPress={() => void signIn()}
            style={styles.google}
          />
          {busy && <ActivityIndicator color={colors.gold} />}
          {error && <Text style={styles.error}>{error}</Text>}
        </Panel>

        <GameButton
          label="Skip for now"
          variant="dark"
          size="sm"
          disabled={busy}
          onPress={() => {
            playTap()
            onSkip()
          }}
        />
        <Text style={styles.hint}>You can still play vs CPU. Sign in any time from Online or your profile.</Text>
      </View>
    </View>
  )
}

function Perk({ icon, text }: { icon: IconName; text: string }) {
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
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 32,
    gap: 16,
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
    fontSize: 50,
    lineHeight: 54,
    fontWeight: '900',
    letterSpacing: 1,
    textShadowColor: colors.goldDark,
    textShadowOffset: { width: 0, height: 5 },
    textShadowRadius: 0,
  },
  titleSub: {
    color: '#ffffff',
    fontSize: 38,
    lineHeight: 44,
    textShadowColor: '#3b2f7a',
  },
  fighters: {
    flexDirection: 'row',
    gap: 8,
  },
  card: {
    alignSelf: 'stretch',
    gap: 10,
    paddingVertical: 18,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 2,
  },
  perk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  perkIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 207, 63, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  perkText: {
    flex: 1,
    color: colors.textDim,
    fontSize: 14,
    fontWeight: '700',
  },
  google: {
    marginTop: 6,
  },
  error: {
    color: colors.red,
    fontWeight: '800',
    textAlign: 'center',
  },
  hint: {
    color: colors.textFaint,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
})
