import { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { GUNS, GUN_TIER, getGun, type GunSkin } from './guns'
import { SkinPreview } from './SkinPreview'
import { playTap, playVoice, previewShot } from './sound'
import { colors } from './theme'
import { CoinDot, GameButton, Icon, Panel } from './ui'
import type { ShopFocus } from '../monetize/config'
import { buyGun, equipGun, useWallet } from './wallet'

const COLUMNS = 3

/** Gun skins: tap to preview in your fighter's hand, then equip or unlock with coins. */
export function GunLocker({ skinId, onShop }: { skinId: string; onShop: (focus?: ShopFocus) => void }) {
  const wallet = useWallet()
  const [viewing, setViewing] = useState(wallet.gun)
  const gun = getGun(viewing)
  const owned = wallet.guns.includes(gun.id)
  const equipped = wallet.gun === gun.id
  const short = gun.price - wallet.coins
  const tier = GUN_TIER[gun.tier]
  const [shopping, setShopping] = useState<GunSkin | null>(null)

  const act = () => {
    if (owned) {
      playVoice('woo')
      equipGun(gun.id)
    } else {
      playTap()
      setShopping(gun)
    }
  }

  const fillers = (COLUMNS - (GUNS.length % COLUMNS)) % COLUMNS

  return (
    <View style={styles.root}>
      <Panel style={styles.stage}>
        <SkinPreview skinId={skinId} side="blue" size={150} animated weapon={gun.id} aura={wallet.aura} />
        <Text style={styles.gunName}>{gun.name}</Text>
        <Text style={[styles.tier, { color: tier.color }]}>{tier.label.toUpperCase()}</Text>
        <GameButton
          label={
            equipped ? 'Equipped' : owned ? 'Equip' : short > 0 ? `Need ${short} more coins` : `Unlock · ${gun.price}`
          }
          icon={equipped || owned ? 'check' : short > 0 ? 'bag' : 'lock'}
          variant={equipped ? 'dark' : owned ? 'green' : short > 0 ? 'blue' : 'gold'}
          size="sm"
          disabled={equipped}
          onPress={act}
        />
        {gun.perk ? (
          <Text style={[styles.perk, { color: tier.color }]}>PREMIUM · {gun.perk}</Text>
        ) : (
          <Text style={styles.fair}>Own look, bullet and sound.</Text>
        )}
      </Panel>

      <View style={styles.grid}>
        {GUNS.map((g) => {
          const has = wallet.guns.includes(g.id)
          const on = wallet.gun === g.id
          const t = GUN_TIER[g.tier]
          return (
            <Pressable
              key={g.id}
              onPress={() => {
                previewShot(g.id)
                setViewing(g.id)
              }}
              accessibilityLabel={has ? g.name : `${g.name}, locked, ${g.price} coins`}
              style={({ pressed }) => [
                styles.card,
                !has && { borderColor: `${t.color}55` },
                g.fire && { borderColor: t.color, backgroundColor: 'rgba(255, 95, 162, 0.1)' },
                viewing === g.id && styles.cardViewing,
                pressed && styles.pressed,
              ]}
            >
              <View style={!has && styles.locked}>
                <SkinPreview skinId={skinId} side="blue" size={72} glow={false} weapon={g.id} aura={wallet.aura} />
              </View>
              <Text style={styles.cardName} numberOfLines={1}>
                {g.name}
              </Text>
              {has ? (
                <Text style={[styles.cardTier, { color: t.color }]}>{on ? 'IN HAND' : t.label.toUpperCase()}</Text>
              ) : (
                <View style={styles.pricePill}>
                  <CoinDot size={12} />
                  <Text style={styles.priceText}>{g.price}</Text>
                </View>
              )}
              {on && (
                <View style={[styles.badge, { backgroundColor: colors.blue }]}>
                  <Icon name="check" size={13} color="#0c0b1d" />
                </View>
              )}
              {!has && (
                <View style={[styles.badge, styles.lockBadge]}>
                  <Icon name="lock" size={12} color={t.color} />
                </View>
              )}
            </Pressable>
          )
        })}
        {Array.from({ length: fillers }, (_, i) => (
          <View key={`filler-${i}`} style={styles.filler} />
        ))}
      </View>

      {shopping && (
        <GunBuySheet
          gun={shopping}
          skinId={skinId}
          coins={wallet.coins}
          onClose={() => setShopping(null)}
          onShop={(focus) => {
            setShopping(null)
            onShop(focus)
          }}
          onBuy={() => {
            if (!buyGun(shopping.id)) return
            playVoice('yay')
            equipGun(shopping.id)
            setShopping(null)
          }}
        />
      )}
    </View>
  )
}

/** Same unlock popup as characters: preview, price, then unlock or go earn coins. */
function GunBuySheet({
  gun,
  skinId,
  coins,
  onBuy,
  onShop,
  onClose,
}: {
  gun: GunSkin
  skinId: string
  coins: number
  onBuy: () => void
  onShop: (focus?: ShopFocus) => void
  onClose: () => void
}) {
  const tier = GUN_TIER[gun.tier]
  const short = gun.price - coins
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable onPress={() => {}}>
          <Panel style={[styles.sheet, { borderColor: tier.color }]}>
            <View style={[styles.rarityPill, { backgroundColor: tier.color }]}>
              <Text style={styles.rarityPillText}>{tier.label.toUpperCase()}</Text>
            </View>
            <SkinPreview skinId={skinId} side="blue" size={150} animated weapon={gun.id} />
            <Text style={styles.sheetName}>{gun.name}</Text>
            {gun.perk ? (
              <Text style={[styles.perk, { color: tier.color }]}>{gun.perk}</Text>
            ) : (
              <Text style={styles.fair}>Own look, bullet and sound.</Text>
            )}
            <View style={styles.sheetPrice}>
              <CoinDot size={22} />
              <Text style={styles.sheetPriceText}>{gun.price}</Text>
            </View>
            {short > 0 ? (
              <>
                <Text style={styles.sheetShort}>
                  You need {short} more {short === 1 ? 'coin' : 'coins'}. Clear levels with fewer shots to earn more!
                </Text>
                <GameButton label="Get Coins" icon="bag" variant="gold" onPress={() => onShop('coins')} />
                <GameButton label="Unlock all guns" icon="star" variant="blue" onPress={() => onShop('unlocks')} />
              </>
            ) : (
              <GameButton label={`Unlock for ${gun.price}`} icon="check" variant="green" size="lg" onPress={onBuy} />
            )}
            <GameButton label="Not now" variant="dark" size="sm" onPress={onClose} />
          </Panel>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: {
    gap: 14,
  },
  stage: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  gunName: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  tier: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginTop: -4,
    marginBottom: 4,
  },
  fair: {
    color: colors.textFaint,
    fontSize: 11,
  },
  perk: {
    fontSize: 12,
    fontWeight: '900',
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
  cardViewing: {
    borderColor: colors.blue,
    backgroundColor: 'rgba(94, 200, 255, 0.14)',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  locked: {
    opacity: 0.55,
  },
  cardName: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 12,
    paddingHorizontal: 4,
  },
  cardTier: {
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
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
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
    textAlign: 'center',
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
  sheetShort: {
    color: colors.textDim,
    fontSize: 13,
    textAlign: 'center',
  },
})
