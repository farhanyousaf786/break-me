import { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { AURAS_SHOP, AURA_TIER, getAura, type AuraDef } from './auras'
import { SkinPreview } from './SkinPreview'
import { playTap, playVoice, previewAura } from './sound'
import { colors } from './theme'
import { CoinDot, GameButton, Icon, Panel } from './ui'
import type { ShopFocus } from '../monetize/config'
import { buyAura, equipAura, useWallet } from './wallet'

const COLUMNS = 3

/** Equippable auras: tap to preview on your fighter, then equip or unlock with coins. */
export function AuraLocker({ skinId, onShop }: { skinId: string; onShop: (focus?: ShopFocus) => void }) {
  const wallet = useWallet()
  const [viewing, setViewing] = useState(wallet.aura)
  const aura = getAura(viewing)
  const owned = wallet.auras.includes(aura.id)
  const equipped = wallet.aura === aura.id
  const short = aura.price - wallet.coins
  const tier = AURA_TIER[aura.tier]
  const [shopping, setShopping] = useState<AuraDef | null>(null)

  const act = () => {
    if (owned) {
      playVoice('woo')
      equipAura(aura.id)
    } else {
      playTap()
      setShopping(aura)
    }
  }

  const fillers = (COLUMNS - (AURAS_SHOP.length % COLUMNS)) % COLUMNS

  return (
    <View style={styles.root}>
      <Panel style={styles.stage}>
        <SkinPreview skinId={skinId} side="blue" size={150} animated weapon={wallet.gun} aura={aura.id} />
        <Text style={styles.name}>{aura.name}</Text>
        <Text style={[styles.tier, { color: tier.color }]}>{tier.label.toUpperCase()}</Text>
        <GameButton
          label={
            equipped ? 'Equipped' : owned ? 'Equip' : short > 0 ? `Need ${short} more coins` : `Unlock · ${aura.price}`
          }
          icon={equipped || owned ? 'check' : short > 0 ? 'bag' : 'lock'}
          variant={equipped ? 'dark' : owned ? 'green' : short > 0 ? 'blue' : 'gold'}
          size="sm"
          disabled={equipped}
          onPress={act}
        />
        <Text style={styles.blurb}>{aura.blurb}</Text>
      </Panel>

      <View style={styles.grid}>
        {AURAS_SHOP.map((a) => {
          const has = wallet.auras.includes(a.id)
          const on = wallet.aura === a.id
          const t = AURA_TIER[a.tier]
          return (
            <Pressable
              key={a.id}
              onPress={() => {
                previewAura(a.id)
                setViewing(a.id)
              }}
              accessibilityLabel={has ? a.name : `${a.name}, locked, ${a.price} coins`}
              style={({ pressed }) => [
                styles.card,
                !has && { borderColor: `${t.color}55` },
                a.tier === 'premium' && { borderColor: t.color, backgroundColor: 'rgba(255, 95, 162, 0.1)' },
                viewing === a.id && styles.cardViewing,
                pressed && styles.pressed,
              ]}
            >
              <View style={!has && styles.locked}>
                <SkinPreview skinId={skinId} side="blue" size={64} glow={false} aura={a.id} />
              </View>
              <Text style={styles.cardName} numberOfLines={1}>
                {a.name}
              </Text>
              {has ? (
                <Text style={[styles.cardTier, { color: t.color }]}>{on ? 'EQUIPPED' : t.label.toUpperCase()}</Text>
              ) : (
                <View style={styles.pricePill}>
                  <CoinDot size={12} />
                  <Text style={styles.priceText}>{a.price}</Text>
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
        <AuraBuySheet
          aura={shopping}
          skinId={skinId}
          gun={wallet.gun}
          coins={wallet.coins}
          onClose={() => setShopping(null)}
          onShop={(focus) => {
            setShopping(null)
            onShop(focus)
          }}
          onBuy={() => {
            if (!buyAura(shopping.id)) return
            playVoice('yay')
            equipAura(shopping.id)
            setShopping(null)
          }}
        />
      )}
    </View>
  )
}

function AuraBuySheet({
  aura,
  skinId,
  gun,
  coins,
  onBuy,
  onShop,
  onClose,
}: {
  aura: AuraDef
  skinId: string
  gun: string
  coins: number
  onBuy: () => void
  onShop: (focus?: ShopFocus) => void
  onClose: () => void
}) {
  const tier = AURA_TIER[aura.tier]
  const short = aura.price - coins
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable onPress={() => {}}>
          <Panel style={[styles.sheet, { borderColor: tier.color }]}>
            <View style={[styles.rarityPill, { backgroundColor: tier.color }]}>
              <Text style={styles.rarityPillText}>{tier.label.toUpperCase()}</Text>
            </View>
            <SkinPreview skinId={skinId} side="blue" size={150} animated weapon={gun} aura={aura.id} />
            <Text style={styles.sheetName}>{aura.name}</Text>
            <Text style={styles.blurb}>{aura.blurb}</Text>
            <View style={styles.sheetPrice}>
              <CoinDot size={22} />
              <Text style={styles.sheetPriceText}>{aura.price}</Text>
            </View>
            {short > 0 ? (
              <>
                <Text style={styles.sheetShort}>
                  You need {short} more {short === 1 ? 'coin' : 'coins'}. Clear levels with fewer shots to earn more!
                </Text>
                <GameButton label="Get Coins" icon="bag" variant="gold" onPress={() => onShop('coins')} />
                <GameButton label="Unlock all auras" icon="star" variant="blue" onPress={() => onShop('unlocks')} />
              </>
            ) : (
              <GameButton label={`Unlock for ${aura.price}`} icon="check" variant="green" size="lg" onPress={onBuy} />
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
  name: {
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
  blurb: {
    color: colors.textFaint,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 8,
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
