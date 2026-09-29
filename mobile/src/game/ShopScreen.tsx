import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { COIN_PACKS, HERO_SQUAD, NO_ADS, VIDEO_COINS, VIDEO_COINS_PER_DAY, type Product } from '../monetize/config'
import { EarnCoinsSheet } from './EarnCoins'
import { buy, priceLabel, restore, useStore, type BuyResult } from '../monetize/purchases'
import { PREMIUM_GROUPS, SKINS, premiumGroup } from './skins'
import { SkinPreview } from './SkinPreview'
import { playVoice } from './sound'
import { colors } from './theme'
import { CoinChip, CoinDot, GameButton, Icon, Panel, ScreenHeader } from './ui'
import { useWallet, videosLeft } from './wallet'

const HEROES = SKINS.filter((s) => s.hero)

const MESSAGES: Record<BuyResult, string> = {
  ok: 'Thank you! Enjoy!',
  cancelled: '',
  pending: "Payment pending — you'll get it as soon as the payment goes through.",
  unavailable: "The store isn't available right now. Try again later.",
  error: 'Something went wrong. You were not charged.',
}

export function ShopScreen({ onBack }: { onBack: () => void }) {
  const wallet = useWallet()
  const store = useStore()
  const [busy, setBusy] = useState<string | null>(null)
  const [earning, setEarning] = useState(false)
  const [note, setNote] = useState('')

  const left = videosLeft(VIDEO_COINS_PER_DAY, wallet)
  const ownsSquad = HEROES.every((h) => wallet.owned.includes(h.id))

  const purchase = async (product: Product) => {
    if (busy) return
    setBusy(product.id)
    setNote('')
    const result = await buy(product)
    setBusy(null)
    if (result === 'ok') playVoice('yay')
    setNote(MESSAGES[result])
  }

  return (
    <ScrollView contentContainerStyle={styles.root} showsVerticalScrollIndicator={false}>
      <ScreenHeader title="Shop" onBack={onBack} right={<CoinChip coins={wallet.coins} />} />

      {store.status === 'test' && (
        <View style={styles.testBanner}>
          <Text style={styles.testText}>TEST MODE · purchases are simulated and free (no RevenueCat key yet)</Text>
        </View>
      )}
      {note !== '' && <Text style={styles.note}>{note}</Text>}

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
      {earning && <EarnCoinsSheet onClose={() => setEarning(false)} />}

      <Panel style={[styles.card, styles.noAdsCard]}>
        <Text style={[styles.cardTitle, { color: colors.gold }]}>{NO_ADS.title}</Text>
        <Text style={styles.cardSub}>
          No banners and no videos between levels, forever. Optional reward videos stay available.
        </Text>
        {wallet.noAds ? (
          <View style={styles.ownedRow}>
            <Icon name="check" size={18} color={colors.green} />
            <Text style={styles.ownedText}>Ads removed. Thanks for the support!</Text>
          </View>
        ) : (
          <GameButton
            label={busy === NO_ADS.id ? 'Opening store…' : `Remove Ads · ${priceLabel(NO_ADS, store.prices)}`}
            variant="gold"
            disabled={busy !== null}
            onPress={() => purchase(NO_ADS)}
          />
        )}
      </Panel>

      <Panel style={[styles.card, styles.heroCard]}>
        <View style={styles.row}>
          <Text style={[styles.cardTitle, styles.flex]}>{HERO_SQUAD.title}</Text>
          {HERO_SQUAD.kind === 'skins' && HERO_SQUAD.tag && !ownsSquad && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{HERO_SQUAD.tag}</Text>
            </View>
          )}
        </View>
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
        {ownsSquad ? (
          <View style={styles.ownedRow}>
            <Icon name="check" size={18} color={colors.green} />
            <Text style={styles.ownedText}>You own every premium fighter!</Text>
          </View>
        ) : (
          <GameButton
            label={busy === HERO_SQUAD.id ? 'Opening store…' : `Unlock all · ${priceLabel(HERO_SQUAD, store.prices)}`}
            variant="blue"
            disabled={busy !== null}
            onPress={() => purchase(HERO_SQUAD)}
          />
        )}
      </Panel>

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
        Heroes and Remove Ads are restored on a new phone with the same store account. Coins live on this device.
      </Text>
    </ScrollView>
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
