import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { LevelMap } from './LevelMap'
import { LEVELS, WORLDS, getLevel, getWorld, type LevelConfig } from './levels'
import type { SkinChoice } from './skins'
import { playTap } from './sound'
import { colors } from './theme'
import { GameButton, Icon, Panel, ScreenHeader } from './ui'
import { PAR, useWallet } from './wallet'

type Props = {
  unlocked: number
  skins: SkinChoice
  onSelect: (levelId: number) => void
  onBack: () => void
}

type TileState = 'cleared' | 'current' | 'locked'

const TIER_COLOR: Record<LevelConfig['tier'], string> = {
  Easy: colors.green,
  Medium: colors.gold,
  Hard: colors.red,
}

export function LevelSelect({ unlocked, skins, onSelect, onBack }: Props) {
  const current = Math.min(unlocked, LEVELS.length)
  const [selected, setSelected] = useState(current)
  const allClear = unlocked > LEVELS.length
  const { stars } = useWallet()
  const totalStars = LEVELS.reduce((sum, l) => sum + (stars[l.id] ?? 0), 0)

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Adventure"
        onBack={onBack}
        right={
          <View style={styles.counter}>
            <Icon name="star" size={14} color={colors.gold} />
            <Text style={styles.counterText}>
              {totalStars}/{LEVELS.length * 3}
            </Text>
          </View>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <LevelCard
          level={getLevel(selected)}
          skins={skins}
          isCleared={selected < unlocked || allClear}
          best={stars[selected] ?? 0}
          onPlay={() => onSelect(selected)}
        />

        {WORLDS.map((world) => {
          const levels = LEVELS.filter((l) => l.world === world.id)
          const done = levels.filter((l) => l.id < unlocked).length
          const worldLocked = levels[0].id > unlocked
          return (
            <View key={world.id} style={[styles.world, worldLocked && styles.worldLocked]}>
              <View style={[styles.worldStripe, { backgroundColor: world.color }]} />
              <View style={styles.worldHead}>
                <View style={styles.worldTitles}>
                  <Text style={[styles.worldNum, { color: world.color }]}>WORLD {world.id}</Text>
                  <Text style={styles.worldName}>{world.name}</Text>
                  <Text style={styles.worldTag}>{worldLocked ? `Clear level ${levels[0].id - 1} to unlock` : world.tagline}</Text>
                </View>
                {worldLocked ? (
                  <Icon name="lock" size={22} color={colors.textFaint} />
                ) : (
                  <View style={styles.worldProgress}>
                    <Text style={[styles.worldCount, { color: world.color }]}>
                      {done}/{levels.length}
                    </Text>
                    <View style={styles.worldBar}>
                      <View
                        style={[styles.worldBarFill, { width: `${(done / levels.length) * 100}%`, backgroundColor: world.color }]}
                      />
                    </View>
                  </View>
                )}
              </View>
              <View style={styles.tiles}>
                {levels.map((lvl) => {
                  const state: TileState = lvl.id < unlocked ? 'cleared' : lvl.id === unlocked ? 'current' : 'locked'
                  return (
                    <LevelTile
                      key={lvl.id}
                      level={lvl}
                      state={state}
                      stars={stars[lvl.id] ?? 0}
                      color={world.color}
                      selected={lvl.id === selected}
                      onPress={() => {
                        playTap()
                        setSelected(lvl.id)
                      }}
                    />
                  )
                })}
              </View>
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}

function LevelCard({
  level,
  skins,
  isCleared,
  best,
  onPlay,
}: {
  level: LevelConfig
  skins: SkinChoice
  isCleared: boolean
  best: number
  onPlay: () => void
}) {
  const world = getWorld(level.world)
  const mines = level.obstacles.filter((o) => o.kind === 'hazard').length
  const moving = level.obstacles.some((o) => o.vx || o.vy)

  return (
    <Panel style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.mapFrame, { borderColor: world.color }]}>
          <LevelMap levelId={level.id} skins={skins} width={92} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardWorld, { color: world.color }]} numberOfLines={1}>
            {world.name.toUpperCase()}
          </Text>
          <Text style={styles.cardLevel}>LEVEL {level.id}</Text>
          <Text style={styles.cardName} numberOfLines={1} adjustsFontSizeToFit>
            {level.name}
          </Text>
          <Text style={styles.cardBlurb}>{level.blurb}</Text>
          <View style={styles.chips}>
            <Chip label={level.tier} color={TIER_COLOR[level.tier]} />
            {level.intro && <Chip label={`New: ${level.intro}`} color={colors.gold} solid />}
            {level.bulletMode === 'bounce' && <Chip label="Ricochet" color="#4cb4ff" />}
            {moving && <Chip label="Moving" color="#ff9f43" />}
            {mines > 0 && <Chip label={mines === 1 ? '1 mine' : `${mines} mines`} color={colors.red} />}
            {isCleared && <Chip label="Cleared" color={colors.green} solid />}
          </View>
          <Text style={styles.cardGoal}>
            <Text style={styles.cardGoalStars}>{'★'.repeat(best)}</Text>
            <Text style={styles.cardGoalEmpty}>{'★'.repeat(3 - best)}</Text>
            {'  '}3 stars = {PAR[level.tier]} shots or fewer
          </Text>
        </View>
      </View>
      <GameButton
        label={isCleared ? 'Play Again' : 'Play'}
        icon={isCleared ? 'retry' : 'play'}
        variant="green"
        size="lg"
        onPress={onPlay}
      />
    </Panel>
  )
}

function Chip({ label, color, solid }: { label: string; color: string; solid?: boolean }) {
  return (
    <View style={[styles.chip, { borderColor: color }, solid && { backgroundColor: color }]}>
      <Text style={[styles.chipText, { color: solid ? '#0c0b1d' : color }]}>{label}</Text>
    </View>
  )
}

const TILE = {
  cleared: { depth: 'rgba(0, 0, 0, 0.35)', text: '#0c0b1d' },
  current: { face: '#ffcf3f', depth: '#c28a12', text: '#3d2805' },
  locked: { face: '#221f45', depth: '#15132b', text: 'rgba(241, 243, 250, 0.3)' },
}

function LevelTile({
  level,
  state,
  stars,
  color,
  selected,
  onPress,
}: {
  level: LevelConfig
  state: TileState
  stars: number
  color: string
  selected: boolean
  onPress: () => void
}) {
  const locked = state === 'locked'
  const face = state === 'cleared' ? color : TILE[state].face
  const depth = TILE[state].depth
  const text = TILE[state].text

  return (
    <Pressable
      onPress={onPress}
      disabled={locked}
      style={styles.tileWrap}
      accessibilityRole="button"
      accessibilityLabel={locked ? `Level ${level.id}, locked` : `Level ${level.id}, ${level.name}`}
    >
      {({ pressed }) => (
        <View style={[styles.tileRing, selected && { borderColor: '#ffffff' }]}>
          <View style={{ backgroundColor: depth, borderRadius: 14 }}>
            <View style={[styles.tileFace, { backgroundColor: face, marginBottom: pressed ? 1 : 4, marginTop: pressed ? 3 : 0 }]}>
              {!locked && <View style={styles.tileShine} />}
              {locked ? (
                <Icon name="lock" size={18} color={text} />
              ) : (
                <Text style={[styles.tileNum, { color: text }]}>{level.id}</Text>
              )}
            </View>
          </View>
          {state === 'cleared' && (
            <View style={styles.tileCheck}>
              <Icon name="check" size={10} color="#ffffff" />
            </View>
          )}
          {level.intro && !locked && state !== 'cleared' && <View style={styles.tileNew} />}
          {stars > 0 && (
            <Text style={styles.tileStars}>
              {'★'.repeat(stars)}
              <Text style={styles.tileStarsEmpty}>{'★'.repeat(3 - stars)}</Text>
            </Text>
          )}
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scroll: {
    paddingTop: 8,
    paddingBottom: 36,
    gap: 14,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.panelBorder,
  },
  counterText: {
    color: colors.gold,
    fontWeight: '900',
    fontSize: 12,
  },
  card: {
    gap: 14,
    padding: 14,
    borderColor: 'rgba(255, 207, 63, 0.35)',
    borderWidth: 2,
    backgroundColor: '#1c1740',
  },
  cardTop: {
    flexDirection: 'row',
    gap: 14,
  },
  mapFrame: {
    borderWidth: 2,
    borderRadius: 14,
    padding: 2,
    alignSelf: 'flex-start',
  },
  cardInfo: {
    flex: 1,
    gap: 3,
  },
  cardWorld: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
  },
  cardLevel: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  cardName: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  cardBlurb: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  world: {
    backgroundColor: colors.panel,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    padding: 14,
    paddingLeft: 18,
    gap: 12,
    overflow: 'hidden',
  },
  worldLocked: {
    opacity: 0.55,
  },
  worldStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  worldHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  worldTitles: {
    flex: 1,
  },
  worldNum: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
  },
  worldName: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '900',
  },
  worldTag: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '600',
  },
  worldProgress: {
    alignItems: 'flex-end',
    gap: 4,
    width: 64,
  },
  worldCount: {
    fontSize: 14,
    fontWeight: '900',
  },
  worldBar: {
    alignSelf: 'stretch',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    overflow: 'hidden',
  },
  worldBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  tiles: {
    flexDirection: 'row',
    gap: 8,
  },
  tileWrap: {
    flex: 1,
  },
  tileRing: {
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 17,
    padding: 1,
  },
  tileFace: {
    aspectRatio: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tileShine: {
    position: 'absolute',
    top: 3,
    left: 6,
    right: 6,
    height: '30%',
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  tileNum: {
    fontSize: 22,
    fontWeight: '900',
  },
  tileCheck: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1c8c4a',
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileStars: {
    color: colors.gold,
    fontSize: 10,
    textAlign: 'center',
    letterSpacing: 1,
    marginTop: 1,
  },
  tileStarsEmpty: {
    color: 'rgba(255, 255, 255, 0.2)',
  },
  cardGoal: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
  },
  cardGoalStars: {
    color: colors.gold,
    fontSize: 13,
  },
  cardGoalEmpty: {
    color: 'rgba(255, 255, 255, 0.2)',
    fontSize: 13,
  },
  tileNew: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.gold,
    borderWidth: 2,
    borderColor: '#0c0b1d',
  },
})
