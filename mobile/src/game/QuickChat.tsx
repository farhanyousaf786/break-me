import { useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native'
import { playTap } from './sound'

export const CHAT_LINES = [
  'Catch me!',
  'Pew pew!',
  'Too easy!',
  'Nice try!',
  'Oops, my bad',
  'Wheee!',
  'Bring it on!',
  'Lucky shot!',
  'Boop!',
  "I'm dizzy...",
  'Sorry not sorry',
  'Watch this!',
  'First time?',
  'GG!',
]

/** Comebacks the CPU sometimes fires back after the player chats. */
export const CPU_COMEBACKS = [
  'Pfft, whatever',
  'Talk is cheap!',
  'Big words, tiny aim',
  'We will see!',
  'Hmph!',
  'You wish!',
  'Okay bestie',
  'Yeah yeah',
  'Cute. Now aim.',
  'Say that again!',
]

const COOLDOWN_MS = 1500

/** Row of tappable quick-chat lines under the arena. */
export function QuickChat({ onSay, tint }: { onSay: (text: string) => void; tint: string }) {
  const [cooling, setCooling] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const say = (text: string) => {
    if (cooling) return
    playTap()
    onSay(text)
    setCooling(true)
    timer.current = setTimeout(() => setCooling(false), COOLDOWN_MS)
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      style={styles.bar}
      contentContainerStyle={styles.row}
    >
      {CHAT_LINES.map((line) => (
        <Pressable
          key={line}
          onPress={() => say(line)}
          accessibilityRole="button"
          accessibilityLabel={`Say ${line}`}
          style={({ pressed }) => [styles.chip, { borderColor: tint }, cooling && styles.cooling, pressed && styles.pressed]}
        >
          <Text style={styles.chipText}>{line}</Text>
        </Pressable>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexGrow: 0,
  },
  row: {
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 2,
  },
  chipText: {
    color: '#1f1a2e',
    fontSize: 12,
    fontWeight: '900',
  },
  cooling: {
    opacity: 0.45,
  },
  pressed: {
    transform: [{ scale: 0.94 }],
  },
})
