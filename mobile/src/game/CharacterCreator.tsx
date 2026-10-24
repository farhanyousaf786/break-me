import { useState } from 'react'
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import {
  AURAS,
  COLORS,
  DEFAULT_LOOK,
  EARS,
  EXTRAS,
  EXTRAS_FOR,
  EYES,
  GLOWS,
  HAIRS,
  HAIR_COLORS,
  HATS,
  LOOK_PRICES,
  MOUTHS,
  OUTFITS,
  SHAPES,
  TONES,
  lockedItems,
  lookItemKey,
  lookItemPrice,
  lookToSkin,
  randomLook,
  type Look,
} from './look'
import {
  photoAllowed,
  pickFacePhoto,
  removeFacePhoto,
  saveMyCharacter,
  useMyCharacter,
  type PickResult,
} from './myCharacter'
import { ME_ID, type Shape } from './skins'
import { SkinPreview } from './SkinPreview'
import { playTap, playVoice, previewAura } from './sound'
import { colors } from './theme'
import { Backdrop, CoinChip, CoinDot, GameButton, Icon, IconButton } from './ui'
import { buyLookItems, equipAura, useWallet } from './wallet'

type Tab =
  | 'body' | 'skin' | 'hair' | 'hairColor' | 'eyes' | 'face' | 'ears' | 'extras'
  | 'hat' | 'color' | 'outfit' | 'glow' | 'aura' | 'photo'

const TAB_LABEL: Record<Tab, string> = {
  body: 'Body',
  skin: 'Skin',
  hair: 'Hair',
  hairColor: 'Hair Color',
  eyes: 'Eyes',
  face: 'Mouth',
  ears: 'Ears',
  extras: 'Extras',
  hat: 'Hats',
  color: 'Colors',
  outfit: 'Outfit',
  glow: 'Lights',
  aura: 'Aura',
  photo: 'My Photo',
}

const TABS_FOR: Record<Shape, Tab[]> = {
  human: ['body', 'skin', 'hair', 'hairColor', 'eyes', 'face', 'extras', 'hat', 'color', 'outfit', 'aura', 'photo'],
  blob: ['body', 'color', 'eyes', 'ears', 'face', 'extras', 'hat', 'outfit', 'aura'],
  ghost: ['body', 'color', 'eyes', 'face', 'extras', 'hat', 'outfit', 'aura'],
  robot: ['body', 'color', 'glow', 'hat', 'outfit', 'aura'],
}

/** The tab that edits each look field; a field only matters when its tab exists for the body. */
const FIELD_TAB: Record<keyof Look, Tab> = {
  shape: 'body',
  tone: 'skin',
  hair: 'hair',
  hairColor: 'hairColor',
  eyes: 'eyes',
  mouth: 'face',
  ears: 'ears',
  extra: 'extras',
  hat: 'hat',
  color: 'color',
  outfit: 'outfit',
  glow: 'glow',
  aura: 'aura',
}

const PREMIUM_TABS = new Set((Object.keys(LOOK_PRICES) as (keyof Look)[]).map((f) => FIELD_TAB[f]))

const PICK_MESSAGES: Record<PickResult, string> = {
  ok: '',
  cancelled: '',
  denied: 'Allow photo access in your phone Settings to pick a picture.',
  error: "Couldn't open that photo. Try another one.",
}

type Props = { onClose: () => void; onSaved: () => void }

/** Snapchat-style builder for the player's own fighter ("Me!"). */
export function CharacterCreator({ onClose, onSaved }: Props) {
  const saved = useMyCharacter()
  const wallet = useWallet()
  const [look, setLook] = useState<Look>(saved.look)
  const [name, setName] = useState(saved.name === 'Me!' ? '' : saved.name)
  const [usePhoto, setUsePhoto] = useState(saved.usePhoto)
  const [tab, setTab] = useState<Tab>('body')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const shape = SHAPES[look.shape].id
  const tabs = TABS_FOR[shape]
  const activeTab = tabs.includes(tab) ? tab : 'body'
  const photoOn = usePhoto && Boolean(saved.photo) && photoAllowed(look)

  const skinFor = (l: Look) => ({ ...lookToSkin(l, ME_ID, 'Me!'), photo: photoOn && photoAllowed(l) })
  const draft = skinFor(look)

  // Locker-bought auras count as unlocked in the creator too.
  const ownedKeys = [
    ...wallet.looks,
    ...wallet.auras.flatMap((id) => {
      const i = AURAS.indexOf(id)
      return i >= 0 ? [lookItemKey('aura', i)] : []
    }),
  ]

  const set = (patch: Partial<Look>) => {
    playTap()
    setLook((l) => ({ ...l, ...patch }))
    if (typeof patch.aura === 'number') {
      const id = AURAS[patch.aura]
      if (id) previewAura(id)
      if (id && (lookItemPrice('aura', patch.aura) === 0 || ownedKeys.includes(lookItemKey('aura', patch.aura)))) {
        equipAura(id)
      }
    }
  }
  const lockPrice = (field: keyof Look, index: number) =>
    ownedKeys.includes(lookItemKey(field, index)) ? 0 : lookItemPrice(field, index)
  const locked = lockedItems(look, ownedKeys).filter((i) => tabs.includes(FIELD_TAB[i.field]))
  const lockedTotal = locked.reduce((sum, i) => sum + i.price, 0)

  /** Unpaid premium picks this body doesn't show are dropped, so nothing unpaid gets saved. */
  const cleanLook = (): Look => {
    const next = { ...look }
    for (const i of lockedItems(look, ownedKeys)) {
      if (!tabs.includes(FIELD_TAB[i.field])) next[i.field] = DEFAULT_LOOK[i.field]
    }
    return next
  }

  const takeOffLocked = () => {
    playTap()
    setLook((l) => {
      const next = { ...l }
      for (const i of locked) next[i.field] = DEFAULT_LOOK[i.field]
      return next
    })
  }

  const unlockAndSave = () => {
    if (wallet.coins < lockedTotal) {
      playTap()
      Alert.alert(
        'Not enough coins',
        `You need ${(lockedTotal - wallet.coins).toLocaleString()} more coins. Win levels and online matches to earn more!`,
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Take them off', onPress: takeOffLocked },
        ],
      )
      return
    }
    const next = cleanLook()
    if (!buyLookItems(locked)) return
    playVoice('yay')
    saveMyCharacter(next, name, usePhoto)
    onSaved()
  }

  const pickPhoto = async () => {
    if (busy) return
    setBusy(true)
    setNote('')
    const result = await pickFacePhoto()
    setBusy(false)
    setNote(PICK_MESSAGES[result])
    if (result === 'ok') {
      setUsePhoto(true)
      playVoice('yay')
    }
  }

  const confirmRemove = () => {
    playTap()
    Alert.alert('Remove photo?', 'Your buddy goes back to a drawn face. The photo is deleted from this phone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          removeFacePhoto()
          setUsePhoto(false)
        },
      },
    ])
  }

  const save = () => {
    saveMyCharacter(cleanLook(), name, usePhoto)
    playVoice('yay')
    onSaved()
  }

  const priceTag = (price: number, style: object) => (
    <View style={[styles.priceTag, style]} pointerEvents="none">
      <CoinDot size={11} />
      <Text style={styles.priceText}>{price}</Text>
    </View>
  )

  /** Thumbnails show the draft with that one option swapped in; premium ones can be tried on before buying. */
  const styleGrid = <T,>(options: T[], toPatch: (index: number) => Partial<Look>, label?: (o: T) => string) => (
    <View style={styles.grid}>
      {options.map((o, i) => {
        const index = toPatch(i)
        const on = Object.entries(index).every(([k, v]) => look[k as keyof Look] === v)
        const price = Object.entries(index).reduce((sum, [k, v]) => sum + lockPrice(k as keyof Look, v as number), 0)
        return (
          <Pressable
            key={i}
            onPress={() => set(index)}
            style={({ pressed }) => [styles.tile, price > 0 && styles.tileLocked, on && styles.tileOn, pressed && styles.pressed]}
          >
            <SkinPreview skinId={`draft-${i}`} skin={skinFor({ ...look, ...index })} side="blue" size={70} glow={false} />
            {label && (
              <Text style={styles.tileLabel} numberOfLines={1}>
                {label(o)}
              </Text>
            )}
            {price > 0 && priceTag(price, styles.tileTag)}
          </Pressable>
        )
      })}
    </View>
  )

  const swatches = (list: string[], current: number, field: keyof Look) => (
    <View style={styles.swatchGrid}>
      {list.map((c, i) => {
        const price = lockPrice(field, i)
        return (
          <Pressable
            key={c + i}
            onPress={() => set({ [field]: i })}
            accessibilityLabel={price > 0 ? `Premium color, ${price} coins` : `Color ${i + 1}`}
            style={styles.swatchCell}
          >
            <View style={[styles.swatch, { backgroundColor: c }, price > 0 && styles.swatchLocked, current === i && styles.swatchOn]} />
            {price > 0 && priceTag(price, styles.swatchTag)}
          </Pressable>
        )
      })}
    </View>
  )

  const content = () => {
    switch (activeTab) {
      case 'body':
        return styleGrid(SHAPES, (i) => ({ shape: i }), (s) => s.label)
      case 'skin':
        return swatches(TONES, look.tone, 'tone')
      case 'hair':
        return styleGrid(HAIRS, (i) => ({ hair: i }), (h) => (h ? cap(h) : 'None'))
      case 'hairColor':
        return swatches(HAIR_COLORS, look.hairColor, 'hairColor')
      case 'face':
        return styleGrid(MOUTHS, (i) => ({ mouth: i }), (m) => cap(m))
      case 'ears':
        return styleGrid(EARS, (i) => ({ ears: i }), (e) => cap(e))
      case 'extras': {
        const allowed = EXTRAS_FOR[shape]
        return styleGrid(allowed, (i) => ({ extra: EXTRAS.indexOf(allowed[i]) }), (x) => cap(x))
      }
      case 'color':
        return swatches(COLORS.map((c) => c.body), look.color, 'color')
      case 'glow':
        return swatches(GLOWS, look.glow, 'glow')
      case 'eyes':
        return styleGrid(EYES, (i) => ({ eyes: i }), (e) => cap(e))
      case 'hat':
        return styleGrid(HATS, (i) => ({ hat: i }), (h) => HAT_LABEL[h] ?? cap(h))
      case 'outfit':
        return styleGrid(OUTFITS, (i) => ({ outfit: i }), (o) => OUTFIT_LABEL[o] ?? cap(o))
      case 'aura':
        return styleGrid(AURAS, (i) => ({ aura: i }), (a) => cap(a))
      case 'photo':
        return (
          <View style={styles.photoPane}>
            <Text style={styles.photoLead}>Put your real face on your buddy!</Text>
            {saved.photo && (
              <Image source={{ uri: `data:image/jpeg;base64,${saved.photo}` }} style={styles.photoThumb} />
            )}
            <GameButton
              label={busy ? 'Opening…' : saved.photo ? 'Change Photo' : 'Pick from Gallery'}
              icon="user"
              variant="blue"
              size="sm"
              disabled={busy}
              onPress={() => void pickPhoto()}
            />
            {saved.photo && (
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Use my photo as the face</Text>
                <Switch
                  value={usePhoto}
                  onValueChange={(v) => {
                    playTap()
                    setUsePhoto(v)
                  }}
                  trackColor={{ true: colors.green, false: 'rgba(255,255,255,0.2)' }}
                />
              </View>
            )}
            {saved.photo && (
              <GameButton label="Remove Photo" icon="retry" variant="red" size="sm" onPress={confirmRemove} />
            )}
            {note !== '' && <Text style={styles.note}>{note}</Text>}
            <Text style={styles.privacy}>
              Tip: center your face in the square. Your photo stays on this phone — online rivals see your drawn buddy.
            </Text>
          </View>
        )
    }
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaProvider>
        <View style={styles.screen}>
          <Backdrop />
          <SafeAreaView style={styles.safe}>
            <View style={styles.header}>
              <IconButton icon="back" onPress={onClose} accessibilityLabel="Close" />
              <Text style={styles.title}>CREATE YOUR BUDDY</Text>
              <IconButton
                icon="retry"
                variant="blue"
                onPress={() => {
                  playVoice('wee')
                  setLook(randomLook((f, i) => lockPrice(f, i) === 0))
                }}
                accessibilityLabel="Random look"
              />
            </View>

            <View style={styles.stage}>
              <View style={styles.previewRing}>
                <SkinPreview skinId="draft" skin={draft} side="blue" size={170} animated />
              </View>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Name your buddy"
                placeholderTextColor={colors.textFaint}
                maxLength={12}
                style={styles.nameInput}
                returnKeyType="done"
              />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tabsScroll}
              contentContainerStyle={styles.tabs}
            >
              {tabs.map((t) => (
                <Pressable
                  key={t}
                  onPress={() => {
                    playTap()
                    setTab(t)
                  }}
                  style={[styles.tab, activeTab === t && styles.tabOn]}
                >
                  <Text style={[styles.tabText, activeTab === t && styles.tabTextOn]}>{TAB_LABEL[t]}</Text>
                  {PREMIUM_TABS.has(t) && <View style={styles.tabDot} />}
                </Pressable>
              ))}
            </ScrollView>

            <ScrollView style={styles.options} contentContainerStyle={styles.optionsContent}>
              {content()}
            </ScrollView>

            <View style={styles.footer}>
              {locked.length > 0 ? (
                <>
                  <View style={styles.lockRow}>
                    <Icon name="lock" size={14} color={colors.gold} />
                    <Text style={styles.lockText} numberOfLines={1}>
                      Trying on {locked.length} premium {locked.length === 1 ? 'item' : 'items'}
                    </Text>
                    <Pressable onPress={takeOffLocked} hitSlop={8}>
                      <Text style={styles.takeOff}>Take off</Text>
                    </Pressable>
                    <CoinChip coins={wallet.coins} />
                  </View>
                  <GameButton
                    label={`Unlock & Save · ${lockedTotal.toLocaleString()}`}
                    icon="lock"
                    variant="gold"
                    onPress={unlockAndSave}
                  />
                </>
              ) : (
                <GameButton label="Save Buddy" icon="check" variant="green" onPress={save} />
              )}
            </View>
          </SafeAreaView>
        </View>
      </SafeAreaProvider>
    </Modal>
  )
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const HAT_LABEL: Record<string, string> = { tophat: 'Top Hat', headphones: 'Phones', propeller: 'Propeller', none: 'None' }
const OUTFIT_LABEL: Record<string, string> = { bowtie: 'Bow Tie', chain: 'Gold Chain', wings: 'Wings', none: 'None' }

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  safe: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  stage: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  previewRing: {
    borderRadius: 999,
    backgroundColor: 'rgba(94, 200, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(94, 200, 255, 0.35)',
  },
  nameInput: {
    minWidth: 200,
    textAlign: 'center',
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1.5,
    borderColor: colors.panelBorder,
  },
  tabsScroll: {
    flexGrow: 0,
  },
  tabs: {
    gap: 8,
    paddingVertical: 8,
  },
  tabDot: {
    position: 'absolute',
    top: 3,
    right: 5,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.gold,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1.5,
    borderColor: colors.panelBorder,
  },
  tabOn: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  tabText: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '900',
  },
  tabTextOn: {
    color: '#0c0b1d',
  },
  options: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: colors.panel,
    borderWidth: 2,
    borderColor: colors.panelBorder,
  },
  optionsContent: {
    padding: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  tile: {
    width: 78,
    alignItems: 'center',
    paddingBottom: 4,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  tileLocked: {
    borderColor: 'rgba(255, 207, 63, 0.35)',
    backgroundColor: 'rgba(255, 207, 63, 0.08)',
  },
  tileOn: {
    borderColor: colors.blue,
    backgroundColor: 'rgba(94, 200, 255, 0.16)',
  },
  priceTag: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: 'rgba(12, 11, 29, 0.85)',
    borderWidth: 1,
    borderColor: colors.gold,
  },
  priceText: {
    color: colors.gold,
    fontSize: 9,
    fontWeight: '900',
  },
  tileTag: {
    top: 3,
    right: 3,
  },
  swatchCell: {
    alignItems: 'center',
  },
  swatchLocked: {
    borderColor: colors.gold,
    borderStyle: 'dashed',
  },
  swatchTag: {
    bottom: -8,
  },
  tileLabel: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: '800',
    marginTop: -4,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  swatchOn: {
    borderColor: '#ffffff',
    borderWidth: 4,
    transform: [{ scale: 1.1 }],
  },
  photoPane: {
    gap: 12,
    alignItems: 'stretch',
    paddingVertical: 4,
  },
  photoLead: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  switchLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  photoThumb: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignSelf: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  note: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  privacy: {
    color: colors.textFaint,
    fontSize: 11,
    textAlign: 'center',
  },
  footer: {
    paddingVertical: 10,
    gap: 8,
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lockText: {
    flex: 1,
    color: colors.gold,
    fontSize: 13,
    fontWeight: '900',
  },
  takeOff: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
})
