import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors } from './theme'

type Props = {
  onPlay: () => void
}

export function IntroScreen({ onPlay }: Props) {
  return (
    <View style={styles.root}>
      <Text style={styles.eyebrow}>User vs CPU</Text>
      <Text style={styles.title}>BreakMe</Text>
      <Text style={styles.tag}>
        Tap to shoot. Recoil kicks your buddy back. Hit the red one before they hit you.
      </Text>

      <View style={styles.duel}>
        <Text style={[styles.buddy, styles.blue]}>YOU</Text>
        <Text style={styles.vs}>VS</Text>
        <Text style={[styles.buddy, styles.red]}>CPU</Text>
      </View>

      <Pressable
        onPress={onPlay}
        style={({ pressed }) => [styles.play, pressed && styles.pressed]}
      >
        <Text style={styles.playText}>Play</Text>
      </Pressable>
      <Text style={styles.foot}>10 levels · Easy → Hard</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  eyebrow: {
    color: '#9ad0ff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.gold,
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -2,
    textShadowColor: colors.goldDark,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 0,
  },
  tag: {
    color: colors.textDim,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
    maxWidth: 290,
  },
  duel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 8,
  },
  buddy: {
    fontWeight: '800',
    fontSize: 14,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
  },
  blue: {
    color: colors.blue,
    backgroundColor: 'rgba(94, 200, 255, 0.2)',
    borderColor: 'rgba(94, 200, 255, 0.45)',
  },
  red: {
    color: colors.red,
    backgroundColor: 'rgba(255, 107, 122, 0.2)',
    borderColor: 'rgba(255, 107, 122, 0.45)',
  },
  vs: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '800',
    fontSize: 12,
  },
  play: {
    backgroundColor: '#e6c04a',
    paddingVertical: 14,
    paddingHorizontal: 44,
    borderRadius: 999,
    shadowColor: '#d4a82a',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  playText: {
    color: '#1a1508',
    fontWeight: '800',
    fontSize: 19,
  },
  foot: {
    color: 'rgba(232, 236, 242, 0.45)',
    fontSize: 13,
  },
})
