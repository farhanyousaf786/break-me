import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextStyle } from 'react-native'
import { NAME_MAX, setPlayerName, type Player } from '../net/account'
import { playTap } from './sound'
import { colors } from './theme'
import { GameButton } from './ui'

/** The player's name with an EDIT pill; editing swaps in an input with Save / Cancel. */
export function PlayerName({
  player,
  textStyle,
  onEditing,
}: {
  player: Player
  textStyle: StyleProp<TextStyle>
  onEditing?: (editing: boolean) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(player.name)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggle = (on: boolean) => {
    setEditing(on)
    onEditing?.(on)
  }

  if (!editing) {
    return (
      <>
        <Text style={textStyle} numberOfLines={1}>
          {player.name}
        </Text>
        <Pressable
          onPress={() => {
            playTap()
            setDraft(player.name)
            setError(null)
            toggle(true)
          }}
          hitSlop={10}
          style={styles.pill}
          accessibilityRole="button"
          accessibilityLabel="Edit name"
        >
          <Text style={styles.pillText}>EDIT</Text>
        </Pressable>
      </>
    )
  }

  const save = async () => {
    if (busy) return
    setError(null)
    setBusy(true)
    try {
      await setPlayerName(draft)
      toggle(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save. Try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={styles.editor}>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        maxLength={NAME_MAX}
        autoFocus
        selectTextOnFocus
        placeholder="Your name"
        placeholderTextColor={colors.textFaint}
        returnKeyType="done"
        onSubmitEditing={save}
        style={styles.input}
      />
      <View style={styles.actions}>
        <GameButton label="Cancel" variant="dark" size="sm" disabled={busy} onPress={() => toggle(false)} style={styles.action} />
        <GameButton label={busy ? 'Saving…' : 'Save'} variant="green" size="sm" disabled={busy} onPress={save} style={styles.action} />
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  pill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  pillText: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  editor: {
    flex: 1,
    alignSelf: 'stretch',
    gap: 8,
  },
  input: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1.5,
    borderColor: colors.gold,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  action: {
    flex: 1,
  },
  error: {
    color: colors.red,
    fontSize: 12,
    fontWeight: '800',
  },
})
