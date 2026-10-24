import { useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { CharacterCreator } from './CharacterCreator'
import { removeFacePhoto, useMyCharacter } from './myCharacter'
import { useWallet } from './wallet'
import { ME_ID } from './skins'
import { SkinPreview } from './SkinPreview'
import { playTap } from './sound'
import { colors } from './theme'
import { GameButton, Icon, Panel } from './ui'

type Props = {
  side: 'blue' | 'red'
  selected: boolean
  sideColor: string
  onSelect: () => void
}

/** Top of the Characters screen: your own buddy, with a way into the creator. */
export function MyCharacterPanel({ side, selected, sideColor, onSelect }: Props) {
  const me = useMyCharacter()
  const { gun, aura } = useWallet()
  const [creating, setCreating] = useState(false)
  const created = me.created || me.photo !== null

  return (
    <Panel style={[styles.panel, selected && { borderColor: sideColor }]}>
      <View style={styles.head}>
        <Text style={styles.title}>MY BUDDY</Text>
        <View style={styles.newTag}>
          <Text style={styles.newTagText}>NEW</Text>
        </View>
      </View>

      <View style={styles.row}>
        <Pressable
          onPress={() => {
            playTap()
            onSelect()
          }}
          accessibilityLabel={`Play as ${me.name}`}
          style={({ pressed }) => [styles.preview, selected && { borderColor: sideColor }, pressed && styles.pressed]}
        >
          <SkinPreview
            skinId={ME_ID}
            side={side}
            size={104}
            animated
            weapon={side === 'blue' ? gun : undefined}
            aura={side === 'blue' ? aura : undefined}
          />
          {selected && (
            <View style={[styles.check, { backgroundColor: sideColor }]}>
              <Icon name="check" size={13} color="#0c0b1d" />
            </View>
          )}
        </Pressable>

        <View style={styles.side}>
          <Text style={styles.name} numberOfLines={1}>
            {me.name}
          </Text>
          <Text style={styles.lead}>
            {created ? 'Your one-of-a-kind fighter.' : 'Make a fighter that looks like you — or your photo!'}
          </Text>
          <GameButton
            label={created ? 'Edit Buddy' : 'Create Buddy'}
            icon="user"
            variant="blue"
            size="sm"
            onPress={() => {
              playTap()
              setCreating(true)
            }}
          />
          {!selected && <GameButton label="Play as Buddy" icon="check" variant="green" size="sm" onPress={onSelect} />}
        </View>
      </View>

      {me.photo && (
        <Pressable
          onPress={() => {
            playTap()
            Alert.alert('Remove photo?', 'Your buddy goes back to a drawn face. The photo is deleted from this phone.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Remove', style: 'destructive', onPress: removeFacePhoto },
            ])
          }}
          hitSlop={8}
          style={styles.removeRow}
        >
          <Text style={styles.remove}>Remove my photo</Text>
        </Pressable>
      )}

      {creating && (
        <CharacterCreator
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false)
            onSelect()
          }}
        />
      )}
    </Panel>
  )
}

const styles = StyleSheet.create({
  panel: {
    gap: 10,
    padding: 12,
    borderColor: 'rgba(94, 200, 255, 0.45)',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: colors.blue,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
  },
  newTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.green,
  },
  newTagText: {
    color: '#0c2a17',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  preview: {
    width: 116,
    height: 116,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.panelBorder,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  side: {
    flex: 1,
    gap: 7,
  },
  name: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  removeRow: {
    alignSelf: 'center',
  },
  remove: {
    color: colors.red,
    fontSize: 13,
    fontWeight: '800',
  },
  lead: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '700',
  },
})
