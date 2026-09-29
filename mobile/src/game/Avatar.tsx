import { Image, StyleSheet, View } from 'react-native'
import type { Player } from '../net/account'
import { SkinPreview } from './SkinPreview'
import { colors } from './theme'

/** Google photo when available, otherwise the player's chosen character in a circle. */
export function Avatar({
  player,
  skinId,
  size,
  ring = colors.blue,
}: {
  player: Player | null | undefined
  skinId: string
  size: number
  ring?: string
}) {
  const inner = size - 6
  return (
    <View style={[styles.ring, { width: size, height: size, borderRadius: size / 2, borderColor: ring }]}>
      {player?.photoURL ? (
        <Image source={{ uri: player.photoURL }} style={{ width: inner, height: inner, borderRadius: inner / 2 }} />
      ) : (
        <View style={[styles.clip, { width: inner, height: inner, borderRadius: inner / 2 }]}>
          <SkinPreview skinId={skinId} side="blue" size={inner * 1.35} />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  ring: {
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1c1740',
  },
  clip: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2458',
  },
})
