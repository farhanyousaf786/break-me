import { useEffect, useRef, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import {
  ALL_AURAS,
  ALL_FIGHTERS,
  ALL_FIGHTERS_GUNS,
  ALL_GUNS,
  COIN_PACKS,
  NO_ADS,
  VIDEO_COINS,
  VIDEO_COINS_PER_DAY,
  type Product,
  type ShopFocus,
} from '../monetize/config'
import { EarnCoinsSheet } from './EarnCoins'
import { buy, priceLabel, restore, useStore, type BuyResult } from '../monetize/purchases'
import { AURAS_SHOP } from './auras'
import { GUNS } from './guns'
import { PREMIUM_GROUPS, SKINS, premiumGroup } from './skins'
import { SkinPreview } from './SkinPreview'
import { playVoice } from './sound'
import { colors } from './theme'
import { CoinChip, CoinDot, GameButton, Icon, Panel, ScreenHeader } from './ui'
import { useWallet, videosLeft } from './wallet'

const HEROES = SKINS.filter((s) => s.hero)

const MESSAGES: Record<BuyResult, string> = {
  ok: 'Thank you! Enjoy!',
  cancelled: 'Purchase cancelled.',
  pending: "Payment pending — you'll get it as soon as the payment goes through.",
  unavailable:
    "Google Play Billing can't see this product yet (often 1–6 hours after you create it). Coins/ads already work — reopen the shop later. No code change needed.",
  error: 'Something went wrong. You were not charged. Real billing needs an install from a Play testing track.',
}

export function ShopScreen({ onBack, focus }: { onBack: () => void; focus?: ShopFocus }) {
  const wallet = useWallet()
  const store = useStore()
  const [busy, setBusy] = useState<string | null>(null)
  const [earning, setEarning] = useState(false)
  const [note, setNote] = useState('')
  const scroll = useRef<ScrollView>(null)
  const yOf = useRef<Partial<Record<ShopFocus, number>>>({})

  const left = videosLeft(VIDEO_COINS_PER_DAY, wallet)
  const ownsAllFighters = SKINS.every((s) => wallet.owned.includes(s.id))
  const ownsAllGuns = GUNS.every((g) => wallet.guns.includes(g.id))
  const ownsAllAuras = AURAS_SHOP.every((a) => wallet.auras.includes(a.id))
  const ownsFightersGuns = ownsAllFighters && ownsAllGuns

  useEffect(() => {
    if (!focus) return
    const t = setTimeout(() => {
      const y = yOf.current[focus]
      if (y != null) scroll.current?.scrollTo({ y: Math.max(0, y - 8), animated: true })
    }, 80)
    return () => clearTimeout(t)
  }, [focus])

  const mark = (key: ShopFocus) => (e: { nativeEvent: { layout: { y: number } } }) => {
    yOf.current[key] = e.nativeEvent.layout.y
  }

  const inStore = (id: string) => store.status === 'test' || !!store.prices[id]

  const purchase = async (product: Product) => {
    if (busy) return
    setBusy(product.id)
    setNote('')
    const result = await buy(product)
    setBusy(null)
    if (result === 'ok') playVoice('yay')
    setNote(MESSAGES[result])
  }

  const unlockLabel = (product: Product, owned: boolean, prefix: string) => {
    if (busy === product.id) return 'Opening store…'
    if (store.status === 'ready' && !inStore(product.id)) {
      return `Not in Play yet · ${priceLabel(product, store.prices)}`
    }
    return `${prefix} · ${priceLabel(product, store.prices)}`
  }

  return (
    <ScrollView ref={scroll} contentContainerStyle={styles.root} showsVerticalScrollIndicator={false}>
      <ScreenHeader title="Shop" onBack={onBack} right={<CoinChip coins={wallet.coins} />} />

      {store.status === 'test' && (
        <View style={styles.testBanner}>
          <Text style={styles.testText}>TEST MODE · purchases are simulated and free (no RevenueCat key yet)</Text>
        </View>
      )}
      {note !== '' && (
        <Text style={[styles.note, note.startsWith('Thank') || note.startsWith('Purchases') ? null : styles.noteWarn]}>
          {note}
        </Text>
      )}

      <View onLayout={mark('earn')}>
        <Panel style={styles.card}>
          <View style={styles.row}>
            <View style={styles.videoIcon}>
              <Icon name="play" size={22} color="#0c0b1d" />
            </View>
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>Free Coins</Text>
              <Text style={styles.cardSub}>
                Watch a short video for +{VIDEO_COINS} coins · {left}/{VIDEO_COINS_PER_DAY} left today
              </Text>
            </View>
          </View>
          <GameButton
            label={left === 0 ? 'Come back tomorrow' : `Watch · +${VIDEO_COINS}`}
            icon="play"
            variant="green"
            disabled={left === 0 || busy !== null}
            onPress={() => setEarning(true)}
          />
        </Panel>
      </View>
      {earning && <EarnCoinsSheet onClose={() => setEarning(false)} />}

      <View onLayout={mark('ads')}>
        <Panel style={[styles.card, styles.noAdsCard]}>
          <Text style={[styles.cardTitle, { color: colors.gold }]}>{NO_ADS.title}</Text>
          <Text style={styles.cardSub}>
            No banners and no videos between levels, forever. Optional reward videos stay available.
          </Text>
          {wallet.noAds ? (
            <Owned label="Ads removed. Thanks for the support!" />
          ) : (
            <GameButton
              label={busy === NO_ADS.id ? 'Opening store…' : `Remove Ads · ${priceLabel(NO_ADS, store.prices)}`}
              variant="gold"
              disabled={busy !== null}
              onPress={() => purchase(NO_ADS)}
            />
          )}
        </Panel>
      </View>

      <View onLayout={mark('unlocks')}>
        <Text style={styles.section}>UNLOCK PACKS</Text>

        <Panel style={[styles.card, styles.bundleCard]}>
          <View style={styles.row}>
            <Text style={[styles.cardTitle, styles.flex]}>{ALL_FIGHTERS_GUNS.title}</Text>
            {ALL_FIGHTERS_GUNS.kind === 'unlock' && ALL_FIGHTERS_GUNS.tag && !ownsFightersGuns && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{ALL_FIGHTERS_GUNS.tag}</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardSub}>Every fighter and every gun — the full loadout.</Text>
          {ownsFightersGuns ? (
            <Owned />
          ) : (
            <GameButton
              label={unlockLabel(ALL_FIGHTERS_GUNS, ownsFightersGuns, 'Unlock')}
              variant="gold"
              disabled={busy !== null}
              onPress={() => purchase(ALL_FIGHTERS_GUNS)}
            />
          )}
        </Panel>

        <Panel style={[styles.card, styles.heroCard]}>
          <View style={styles.row}>
            <Text style={[styles.cardTitle, styles.flex]}>{ALL_FIGHTERS.title}</Text>
            {ALL_FIGHTERS.kind === 'unlock' && ALL_FIGHTERS.tag && !ownsAllFighters && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{ALL_FIGHTERS.tag}</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardSub}>Unlock every fighter, including the premium squad.</Text>
          {PREMIUM_GROUPS.map((g) => {
            const members = HEROES.filter((h) => premiumGroup(h) === g.id)
            if (!members.length) return null
            return (
              <View key={g.id} style={styles.groupBlock}>
                <Text style={[styles.groupTitle, { color: g.color }]}>{g.title}</Text>
                <View style={styles.heroRow}>
                  {members.map((h) => (
                    <SkinPreview key={h.id} skinId={h.id} side="blue" size={56} />
                  ))}
                </View>
              </View>
            )
          })}
          {ownsAllFighters ? (
            <Owned label="You own every fighter!" />
          ) : (
            <GameButton
              label={unlockLabel(ALL_FIGHTERS, ownsAllFighters, 'Unlock all')}
              variant="blue"
              disabled={busy !== null}
              onPress={() => purchase(ALL_FIGHTERS)}
            />
          )}
        </Panel>

        <Panel style={[styles.card, styles.gunCard]}>
          <View style={styles.row}>
            <Text style={[styles.cardTitle, styles.flex]}>{ALL_GUNS.title}</Text>
            {ALL_GUNS.kind === 'unlock' && ALL_GUNS.tag && !ownsAllGuns && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{ALL_GUNS.tag}</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardSub}>Every blaster, wand and premium spray gun — {GUNS.length} total.</Text>
          {ownsAllGuns ? (
            <Owned label="You own every gun!" />
          ) : (
            <GameButton
              label={unlockLabel(ALL_GUNS, ownsAllGuns, 'Unlock all')}
              variant="blue"
              disabled={busy !== null}
              onPress={() => purchase(ALL_GUNS)}
            />
          )}
        </Panel>

        <Panel style={[styles.card, styles.auraCard]}>
          <View style={styles.row}>
            <Text style={[styles.cardTitle, styles.flex]}>{ALL_AURAS.title}</Text>
            {ALL_AURAS.kind === 'unlock' && ALL_AURAS.tag && !ownsAllAuras && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{ALL_AURAS.tag}</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardSub}>Every glow and ring around your buddy — {AURAS_SHOP.length} auras.</Text>
          {ownsAllAuras ? (
            <Owned label="You own every aura!" />
          ) : (
            <GameButton
              label={unlockLabel(ALL_AURAS, ownsAllAuras, 'Unlock all')}
              variant="blue"
              disabled={busy !== null}
              onPress={() => purchase(ALL_AURAS)}
            />
          )}
        </Panel>
      </View>

      <View onLayout={mark('coins')}>
        <Text style={styles.section}>COIN PACKS</Text>
        <View style={styles.packs}>
          {COIN_PACKS.map((pack, i) => (
            <Panel key={pack.id} style={styles.pack}>
              {pack.kind === 'coins' && pack.tag ? (
                <View style={[styles.tag, styles.packTag]}>
                  <Text style={styles.tagText}>{pack.tag}</Text>
                </View>
              ) : (
                <View style={styles.packTagSpace} />
              )}
              <View style={styles.coinStack}>
                {Array.from({ length: i + 1 }, (_, k) => (
                  <View key={k} style={{ marginLeft: k ? -10 : 0 }}>
                    <CoinDot size={26} />
                  </View>
                ))}
              </View>
              <Text style={styles.packCoins}>{pack.kind === 'coins' ? pack.coins.toLocaleString() : ''}</Text>
              <Text style={styles.packName} numberOfLines={1}>
                {pack.title}
              </Text>
              <GameButton
                label={busy === pack.id ? '…' : priceLabel(pack, store.prices)}
                variant="green"
                size="sm"
                disabled={busy !== null}
                onPress={() => purchase(pack)}
                style={styles.packBtn}
              />
            </Panel>
          ))}
        </View>
      </View>

      <GameButton
        label="Restore Purchases"
        variant="dark"
        size="sm"
        disabled={busy !== null}
        onPress={async () => {
          setBusy('restore')
          const result = await restore()
          setBusy(null)
          setNote(result === 'ok' ? 'Purchases restored.' : MESSAGES[result])
        }}
        style={styles.restore}
      />
      <Text style={styles.fine}>
        Unlock packs and Remove Ads restore on a new phone with the same store account. Coins live on this device.
      </Text>
    </ScrollView>
  )
}

function Owned({ label = 'Unlocked. Thanks for the support!' }: { label?: string }) {
  return (
    <View style={styles.ownedRow}>
      <Icon name="check" size={18} color={colors.green} />
      <Text style={styles.ownedText}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 18,
    paddingBottom: 36,
    gap: 14,
  },
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  testBanner: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 207, 63, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 207, 63, 0.5)',
  },
  testText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  note: {
    color: colors.green,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  noteWarn: {
    color: colors.gold,
  },
  card: {
    padding: 14,
    gap: 10,
  },
  noAdsCard: {
    borderColor: 'rgba(255, 207, 63, 0.5)',
  },
  heroCard: {
    borderColor: 'rgba(76, 180, 255, 0.5)',
  },
  gunCard: {
    borderColor: 'rgba(70, 210, 126, 0.45)',
  },
  auraCard: {
    borderColor: 'rgba(177, 140, 255, 0.5)',
  },
  bundleCard: {
    borderColor: 'rgba(255, 207, 63, 0.65)',
  },
  videoIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  cardSub: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '600',
  },
  ownedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 6,
  },
  ownedText: {
    color: colors.green,
    fontWeight: '800',
  },
  heroRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  groupBlock: {
    gap: 2,
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.gold,
  },
  tagText: {
    color: '#3d2805',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  section: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
  },
  packs: {
    flexDirection: 'row',
    gap: 10,
  },
  pack: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    gap: 6,
  },
  packTag: {
    alignSelf: 'center',
  },
  packTagSpace: {
    height: 17,
  },
  coinStack: {
    flexDirection: 'row',
    height: 30,
    alignItems: 'center',
  },
  packCoins: {
    color: colors.gold,
    fontSize: 20,
    fontWeight: '900',
  },
  packName: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: '700',
  },
  packBtn: {
    alignSelf: 'stretch',
  },
  restore: {
    alignSelf: 'center',
  },
  fine: {
    color: colors.textFaint,
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
})
