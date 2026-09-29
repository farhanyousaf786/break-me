import { useRef, useState, type ReactNode } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { GunLocker } from './GunLocker'
import { MyCharacterPanel } from './MyCharacterPanel'
import { ME_ID, PREMIUM_GROUPS, SKINS, getSkin, premiumGroup, type Skin, type SkinChoice } from './skins'
import { SkinPreview } from './SkinPreview'
import { playTap, playVoice, type Voice } from './sound'
import { colors } from './theme'
import { CoinChip, CoinDot, GameButton, Icon, Panel, ScreenHeader } from './ui'
import { RARITY, buySkin, priceOf, rarityOf, useWallet } from './wallet'
import { heroProduct } from '../monetize/config'
import { buy, priceLabel, useStore } from '../monetize/purchases'

const COLUMNS = 3

/** Invisible cards so a short last row keeps column alignment under space-between. */
const gridFillers = (count: number) =>
  Array.from({ length: (COLUMNS - (count % COLUMNS)) % COLUMNS }, (_, i) => (
    <View key={`filler-${i}`} style={styles.filler} />
  ))

const PICK_VOICES: Voice[] = ['yay', 'hehe', 'woo', 'wee']

type Props = {
  skins: SkinChoice
  onChange: (skins: SkinChoice) => void
  onBack: () => void
  onShop: () => void
}

type Side = 'blue' | 'red'

const sideColor: Record<Side, string> = { blue: colors.blue, red: colors.red }
const sideTint: Record<Side, string> = {
  blue: 'rgba(94, 200, 255, 0.14)',
  red: 'rgba(255, 107, 122, 0.14)',
}

const PREMIUM = SKINS.filter((s) => s.hero)

export function CharacterSelect({ skins, onChange, onBack, onShop }: Props) {
  const side: Side = 'blue'
  const [tab, setTab] = useState<'fighters' | 'guns'>('fighters')
  const [shopping, setShopping] = useState<Skin | null>(null)
  const wallet = useWallet()
  const owns = (id: string) => wallet.owned.includes(id)

  // Owned first, then cheapest first, so the next thing to aim for is always near the top.
  const regular = SKINS.filter((s) => !s.hero).sort(
    (a, b) => Number(owns(b.id)) - Number(owns(a.id)) || priceOf(a) - priceOf(b),
  )
  const ownedCount = SKINS.filter((s) => owns(s.id)).length

  const pick = (skin: Skin) => {
    playTap()
    if (!owns(skin.id)) {
      setShopping(skin)
      return
    }
    playVoice(PICK_VOICES[Math.floor(Math.random() * PICK_VOICES.length)])
    onChange({ ...skins, [side]: skin.id })
  }

  const card = (skin: Skin) => (
    <SkinCard
      key={skin.id}
      skin={skin}
      side={side}
      owned={owns(skin.id)}
      selected={skins[side] === skin.id}
      onPress={() => pick(skin)}
    />
  )

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.root} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Characters" onBack={onBack} right={<CoinChip coins={wallet.coins} onPress={onShop} />} />

        <View style={styles.tabs}>
          {(['fighters', 'guns'] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => {
                playTap()
                setTab(t)
              }}
              style={[styles.tab, tab === t && styles.tabOn]}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>{t === 'fighters' ? 'Fighters' : 'Guns'}</Text>
            </Pressable>
          ))}
        </View>

        {tab === 'guns' && <GunLocker skinId={skins.blue} onShop={onShop} />}

        {tab === 'fighters' && (
          <>
            <View style={styles.youRow}>
              <SkinPreview skinId={skins.blue} side="blue" size={76} animated weapon={wallet.gun} />
              <View style={styles.youInfo}>
                <View style={styles.slotPill}>
                  <Text style={styles.slotPillText}>YOU</Text>
                </View>
                <Text style={styles.slotName} numberOfLines={1}>
                  {getSkin(skins.blue).name}
                </Text>
                <Text style={styles.sub}>
                  {ownedCount}/{SKINS.length} unlocked · CPU picks a random rival
                </Text>
              </View>
            </View>

            <MyCharacterPanel
              side={side}
              selected={skins[side] === ME_ID}
              sideColor={sideColor[side]}
              onSelect={() => {
                playVoice(PICK_VOICES[Math.floor(Math.random() * PICK_VOICES.length)])
                onChange({ ...skins, [side]: ME_ID })
              }}
            />

            <PremiumPager owns={owns} card={card} />

            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>ALL CHARACTERS</Text>
            </View>
            <View style={styles.grid}>
              {regular.map(card)}
              {gridFillers(regular.length)}
            </View>

            <Text style={styles.earnHint}>
              Earn coins by clearing levels (fewer shots = more stars = more coins) and playing online.
            </Text>

          </>
        )}

        <GameButton label="Done" icon="check" variant="green" onPress={onBack} style={styles.done} />
      </ScrollView>

      {shopping && (
        <BuySheet
          skin={shopping}
          side={side}
          coins={wallet.coins}
          onClose={() => setShopping(null)}
          onShop={() => {
            setShopping(null)
            onShop()
          }}
          onBuy={() => {
            if (!buySkin(shopping)) return
            playVoice('yay')
            onChange({ ...skins, [side]: shopping.id })
            setShopping(null)
          }}
          onBought={() => {
            playVoice('yay')
            onChange({ ...skins, [side]: shopping.id })
            setShopping(null)
          }}
        />
      )}
    </View>
  )
}

const PREMIUM_PAGES = PREMIUM_GROUPS.map((g) => ({ ...g, members: PREMIUM.filter((s) => premiumGroup(s) === g.id) })).filter(
  (g) => g.members.length > 0,
)

/** One premium category per page: swipe left / right, or tap a category chip. */
function PremiumPager({ owns, card }: { owns: (id: string) => boolean; card: (skin: Skin) => ReactNode }) {
  const [width, setWidth] = useState(0)
  const [page, setPage] = useState(0)
  const pager = useRef<ScrollView>(null)

  const go = (i: number) => {
    playTap()
    setPage(i)
    pager.current?.scrollTo({ x: i * width, animated: true })
  }

  return (
    <View style={styles.pager} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={styles.chips}>
        {PREMIUM_PAGES.map((g, i) => (
          <Pressable
            key={g.id}
            onPress={() => go(i)}
            style={[styles.chip, { borderColor: `${g.color}80` }, page === i && { backgroundColor: g.color, borderColor: g.color }]}
          >
            <Text style={[styles.chipText, { color: page === i ? '#0c0b1d' : g.color }]} numberOfLines={1}>
              {g.title}
            </Text>
          </Pressable>
        ))}
      </View>

      {width > 0 && (
        <ScrollView
          ref={pager}
          horizontal
          pagingEnabled
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        >
          {PREMIUM_PAGES.map((g) => {
            const ownedHere = g.members.filter((s) => owns(s.id)).length
            return (
              <View key={g.id} style={{ width }}>
                <Panel style={[styles.heroPanel, { borderColor: `${g.color}80` }]}>
                  <View style={styles.sectionHead}>
                    <Text style={[styles.sectionTitle, { color: g.color }]}>{g.title}</Text>
                    <View style={[styles.premiumTag, { backgroundColor: g.color }]}>
                      <Text style={styles.premiumTagText}>PREMIUM</Text>
                    </View>
                    <Text style={styles.groupCount}>
                      {ownedHere}/{g.members.length}
                    </Text>
                  </View>
                  <Text style={styles.sectionSub}>{g.blurb}</Text>
                  <View style={styles.grid}>
                    {g.members.map(card)}
                    {gridFillers(g.members.length)}
                  </View>
                </Panel>
              </View>
            )
          })}
        </ScrollView>
      )}

      <View style={styles.dots}>
        {PREMIUM_PAGES.map((g, i) => (
          <View key={g.id} style={[styles.dot, page === i && { backgroundColor: g.color, width: 18 }]} />
        ))}
        <Text style={styles.swipeHint}>swipe for more</Text>
      </View>
    </View>
  )
}

function SkinCard({
  skin,
  side,
  owned,
  selected,
  onPress,
}: {
  skin: Skin
  side: Side
  owned: boolean
  selected: boolean
  onPress: () => void
}) {
  const rarity = RARITY[rarityOf(skin)]
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={owned ? skin.name : `${skin.name}, locked, ${rarity.price} coins`}
      style={({ pressed }) => [
        styles.card,
        !owned && { borderColor: `${rarity.color}55` },
        selected && { borderColor: sideColor[side], backgroundColor: sideTint[side] },
        pressed && styles.pressed,
      ]}
    >
      <View style={!owned && styles.lockedPreview}>
        <SkinPreview skinId={skin.id} side={side} size={84} />
      </View>
      <Text style={styles.cardName} numberOfLines={1}>
        {skin.name}
      </Text>
      {owned ? (
        <Text style={[styles.rarityText, { color: rarity.color }]}>{rarity.label.toUpperCase()}</Text>
      ) : (
        <View style={styles.pricePill}>
          <CoinDot size={12} />
          <Text style={styles.priceText}>{rarity.price}</Text>
        </View>
      )}
      {selected && (
        <View style={[styles.badge, { backgroundColor: sideColor[side] }]}>
          <Icon name="check" size={13} color="#0c0b1d" />
        </View>
      )}
      {!owned && (
        <View style={[styles.badge, styles.lockBadge]}>
          <Icon name="lock" size={12} color={rarity.color} />
        </View>
      )}
    </Pressable>
  )
}

function BuySheet({
  skin,
  side,
  coins,
  onBuy,
  onBought,
  onShop,
  onClose,
}: {
  skin: Skin
  side: Side
  coins: number
  onBuy: () => void
  /** Bought with real money through the store */
  onBought: () => void
  onShop: () => void
  onClose: () => void
}) {
  const rarity = RARITY[rarityOf(skin)]
  const short = rarity.price - coins
  const store = useStore()
  const product = heroProduct(skin.id)
  const [paying, setPaying] = useState(false)
  const [failed, setFailed] = useState('')

  const payNow = async () => {
    if (!product || paying) return
    setPaying(true)
    setFailed('')
    const result = await buy(product)
    setPaying(false)
    if (result === 'ok') onBought()
    else if (result === 'pending') setFailed("Payment pending — the hero unlocks as soon as it goes through.")
    else if (result !== 'cancelled') setFailed("Couldn't reach the store. Try again later.")
  }
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable onPress={() => {}}>
          <Panel style={[styles.sheet, { borderColor: rarity.color }]}>
            <View style={[styles.rarityPill, { backgroundColor: rarity.color }]}>
              <Text style={styles.rarityPillText}>{rarity.label.toUpperCase()}</Text>
            </View>
            <SkinPreview skinId={skin.id} side={side} size={150} animated />
            <Text style={styles.sheetName}>{skin.name}</Text>
            <View style={styles.sheetPrice}>
              <CoinDot size={22} />
              <Text style={styles.sheetPriceText}>{rarity.price}</Text>
            </View>
            {short > 0 ? (
              <>
                <Text style={styles.sheetShort}>
                  You need {short} more {short === 1 ? 'coin' : 'coins'}. Clear levels with fewer shots to earn more!
                </Text>
                <GameButton label="Get Coins" icon="bag" variant="gold" onPress={onShop} />
              </>
            ) : (
              <GameButton label={`Unlock for ${rarity.price}`} icon="check" variant="green" size="lg" onPress={onBuy} />
            )}
            {product && (
              <>
                <Text style={styles.or}>or unlock instantly</Text>
                <GameButton
                  label={paying ? 'Opening store…' : `Buy now · ${priceLabel(product, store.prices)}`}
                  variant="blue"
                  disabled={paying}
                  onPress={payNow}
                />
              </>
            )}
            {failed !== '' && <Text style={styles.sheetShort}>{failed}</Text>}
            <GameButton label="Not now" variant="dark" size="sm" onPress={onClose} />
          </Panel>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  root: {
    paddingHorizontal: 18,
    paddingBottom: 36,
    gap: 14,
  },
  tabs: {
    flexDirection: 'row',
    padding: 4,
    gap: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1.5,
    borderColor: colors.panelBorder,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 999,
  },
  tabOn: {
    backgroundColor: colors.blue,
  },
  tabText: {
    color: colors.textDim,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tabTextOn: {
    color: '#0c0b1d',
  },
  youRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.blue,
    backgroundColor: 'rgba(94, 200, 255, 0.1)',
  },
  youInfo: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 3,
  },
  slotPill: {
    paddingVertical: 2,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: colors.blue,
  },
  slotPillText: {
    color: '#0c0b1d',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  slotName: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 17,
  },
  sub: {
    color: colors.textFaint,
    fontSize: 11,
  },
  pager: {
    gap: 8,
  },
  chips: {
    flexDirection: 'row',
    gap: 6,
  },
  chip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1.5,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  swipeHint: {
    color: colors.textFaint,
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 4,
  },
  heroPanel: {
    gap: 10,
    padding: 12,
    borderColor: 'rgba(255, 207, 63, 0.5)',
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
  },
  sectionSub: {
    color: colors.textFaint,
    fontSize: 12,
    marginTop: -6,
  },
  premiumTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  groupCount: {
    marginLeft: 'auto',
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '800',
  },
  premiumTagText: {
    color: '#3d2805',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  filler: {
    width: '31.5%',
  },
  card: {
    width: '31.5%',
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 9,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.panelBorder,
    backgroundColor: colors.panel,
    gap: 2,
  },
  lockedPreview: {
    opacity: 0.5,
  },
  cardName: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 13,
    paddingHorizontal: 4,
  },
  rarityText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  pricePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  priceText: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '900',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  earnHint: {
    color: colors.textFaint,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  done: {
    alignSelf: 'center',
    minWidth: 200,
    marginTop: 4,
  },
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(6, 5, 20, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    width: 300,
    alignItems: 'center',
    gap: 10,
    paddingVertical: 20,
    paddingHorizontal: 18,
    borderWidth: 2,
  },
  rarityPill: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 999,
  },
  rarityPillText: {
    color: '#0c0b1d',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
  },
  sheetName: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  sheetPrice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetPriceText: {
    color: colors.gold,
    fontSize: 24,
    fontWeight: '900',
  },
  or: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sheetShort: {
    color: colors.textDim,
    fontSize: 13,
    textAlign: 'center',
  },
})
