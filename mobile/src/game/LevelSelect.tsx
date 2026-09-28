import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { LEVELS, type LevelConfig } from './levels'
import { colors } from './theme'

type Props = {
  unlocked: number
  onSelect: (levelId: number) => void
  onBack: () => void
}

const tierBorder: Record<LevelConfig['tier'], string> = {
  Easy: 'rgba(94, 200, 255, 0.35)',
  Medium: 'rgba(242, 213, 107, 0.4)',
  Hard: 'rgba(255, 107, 122, 0.4)',
}

export function LevelSelect({ unlocked, onSelect, onBack }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.root}>
      <Pressable onPress={onBack} hitSlop={12} style={styles.backWrap}>
        <Text style={styles.back}>← Back</Text>
      </Pressable>
      <Text style={styles.title}>Select Level</Text>
      <Text style={styles.sub}>User vs CPU · beat a level to unlock the next</Text>

      <View style={styles.grid}>
        {LEVELS.map((lvl) => {
          const open = lvl.id <= unlocked
          return (
            <Pressable
              key={lvl.id}
              disabled={!open}
              onPress={() => onSelect(lvl.id)}
              style={({ pressed }) => [
                styles.card,
                open ? { borderColor: tierBorder[lvl.tier] } : styles.locked,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.num}>{lvl.id}</Text>
              <Text style={styles.name}>{open ? lvl.name : 'Locked'}</Text>
              <Text style={styles.tier}>{open ? lvl.tier : '🔒'}</Text>
              {open && <Text style={styles.blurb}>{lvl.blurb}</Text>}
            </Pressable>
          )
        })}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 6,
  },
  backWrap: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  back: {
    color: colors.textDim,
    fontWeight: '700',
    fontSize: 15,
  },
  title: {
    color: colors.gold,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  sub: {
    color: colors.textFaint,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  card: {
    width: '48.5%',
    minHeight: 96,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    gap: 3,
  },
  locked: {
    opacity: 0.45,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  num: {
    color: colors.gold,
    fontWeight: '800',
    fontSize: 20,
  },
  name: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  tier: {
    color: colors.textFaint,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  blurb: {
    color: 'rgba(232, 236, 242, 0.45)',
    fontSize: 12,
    marginTop: 2,
  },
})
