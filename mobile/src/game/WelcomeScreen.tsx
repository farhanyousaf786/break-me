import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  ActivityIndicator,
  Animated,
  Easing,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { signInWithGoogle } from '../net/account'
import { onlineConfigured } from '../net/firebase'
import { MIN_AGE, PRIVACY_URL, TERMS_URL } from './legal'
import { SkinPreview } from './SkinPreview'
import { playTap } from './sound'
import { colors } from './theme'
import { Backdrop, GameButton, Icon, Panel, type IconName } from './ui'

type Props = {
  /** Signed in with Google (the player listener takes it from here) */
  onSignedIn: () => void
  onSkip: () => void
  /** Already has a Google session — skip the Google CTA, still need age + legal. */
  alreadySignedIn?: boolean
}

type Step = 'consent' | 'signin'

/** First launch: consent page first, then Google sign-in or skip. */
export function WelcomeScreen({ onSignedIn, onSkip, alreadySignedIn }: Props) {
  const [step, setStep] = useState<Step>('consent')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ageOk, setAgeOk] = useState(false)
  const [privacyOk, setPrivacyOk] = useState(false)
  const [termsOk, setTermsOk] = useState(false)

  const consented = ageOk && privacyOk && termsOk

  const open = (url: string) => {
    playTap()
    void Linking.openURL(url)
  }

  const goSignIn = () => {
    if (!consented) return
    playTap()
    // Already signed in or no online → leave welcome; otherwise show sign-in page.
    if (alreadySignedIn) {
      onSignedIn()
      return
    }
    if (!onlineConfigured) {
      onSkip()
      return
    }
    setStep('signin')
  }

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

  const skip = () => {
    playTap()
    onSkip()
  }

  return (
    <View style={styles.root}>
      <Backdrop />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.titleWrap}>
          <Text style={styles.eyebrow}>Welcome to</Text>
          <Text style={styles.title}>BREAK</Text>
          <Text style={[styles.title, styles.titleSub]}>BUDDIES!</Text>
        </View>

        <View style={styles.fighters}>
          <SkinPreview skinId="cosmo" side="blue" size={100} animated />
          <SkinPreview skinId="nova" side="red" size={100} animated />
        </View>

        {step === 'consent' ? (
          <>
            <Panel style={styles.card}>
              <Text style={styles.cardTitle}>Before you play</Text>
              <Text style={styles.cardSub}>Tap each box to confirm — then continue.</Text>

              <CheckRow
                checked={ageOk}
                nudge={!ageOk}
                onToggle={() => {
                  playTap()
                  setAgeOk((v) => !v)
                }}
                label={`I confirm I am ${MIN_AGE} years of age or older`}
              />
              <CheckRow
                checked={privacyOk}
                nudge={!privacyOk}
                onToggle={() => {
                  playTap()
                  setPrivacyOk((v) => !v)
                }}
                label={
                  <Text style={styles.checkLabel}>
                    I agree to the{' '}
                    <Text style={styles.link} onPress={() => open(PRIVACY_URL)}>
                      Privacy Policy
                    </Text>
                  </Text>
                }
              />
              <CheckRow
                checked={termsOk}
                nudge={!termsOk}
                onToggle={() => {
                  playTap()
                  setTermsOk((v) => !v)
                }}
                label={
                  <Text style={styles.checkLabel}>
                    I agree to the{' '}
                    <Text style={styles.link} onPress={() => open(TERMS_URL)}>
                      Terms of Service
                    </Text>
                  </Text>
                }
              />
            </Panel>

            <GameButton
              label="Continue"
              icon="play"
              variant="green"
              size="lg"
              disabled={!consented}
              onPress={goSignIn}
            />
            {!consented && <Text style={styles.hint}>Tap the empty boxes above to check them.</Text>}
          </>
        ) : (
          <>
            <Panel style={styles.card}>
              <Text style={styles.cardTitle}>Sign in to unlock online</Text>
              <Text style={styles.cardSub}>Optional — you can skip and play vs CPU.</Text>
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

            <GameButton label="Skip for now" variant="dark" size="sm" disabled={busy} onPress={skip} />
            <Text style={styles.hint}>You can sign in any time from Online or your profile.</Text>
          </>
        )}
      </ScrollView>
    </View>
  )
}

function CheckRow({
  checked,
  nudge,
  onToggle,
  label,
}: {
  checked: boolean
  /** Soft pulse so unchecked boxes look tappable. */
  nudge?: boolean
  onToggle: () => void
  label: ReactNode
}) {
  const pulse = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!nudge || checked) {
      pulse.stopAnimation()
      pulse.setValue(0)
      return
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [nudge, checked, pulse])

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] })
  const glow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] })

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityHint="Tap to check this box"
      style={({ pressed }) => [styles.checkRow, pressed && { opacity: 0.85 }]}
    >
      <Animated.View
        style={[
          styles.boxWrap,
          nudge && !checked && { transform: [{ scale }], opacity: glow },
        ]}
      >
        <View style={[styles.box, checked && styles.boxOn, nudge && !checked && styles.boxNudge]}>
          {checked && <Icon name="check" size={14} color="#10122a" />}
        </View>
      </Animated.View>
      {typeof label === 'string' ? <Text style={styles.checkLabel}>{label}</Text> : label}
    </Pressable>
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
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 28,
    gap: 14,
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
    fontSize: 46,
    lineHeight: 50,
    fontWeight: '900',
    letterSpacing: 1,
    textShadowColor: colors.goldDark,
    textShadowOffset: { width: 0, height: 5 },
    textShadowRadius: 0,
  },
  titleSub: {
    color: '#ffffff',
    fontSize: 34,
    lineHeight: 40,
    textShadowColor: '#3b2f7a',
  },
  fighters: {
    flexDirection: 'row',
    gap: 8,
  },
  card: {
    alignSelf: 'stretch',
    gap: 10,
    paddingVertical: 16,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  cardSub: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 6,
  },
  boxWrap: {
    marginTop: 1,
  },
  box: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.textFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxNudge: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(255, 207, 63, 0.12)',
  },
  boxOn: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  checkLabel: {
    flex: 1,
    color: colors.textDim,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  link: {
    color: colors.gold,
    fontWeight: '900',
    textDecorationLine: 'underline',
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
