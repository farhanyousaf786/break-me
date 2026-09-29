import AsyncStorage from '@react-native-async-storage/async-storage'
import { Skia, type SkImage } from '@shopify/react-native-skia'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'
import { useSyncExternalStore } from 'react'
import { DEFAULT_LOOK, SHAPES, encodeLook, lookToSkin, sanitizeLook, type Look } from './look'
import { ME_ID, setMySkin } from './skins'

/**
 * The player's own character: a look from the creator plus an optional photo face. The photo is
 * shrunk to a small JPEG and kept only on this phone — it is never uploaded or shown to others.
 */

const KEY = 'breakme_me'
const LEGACY_FACE_KEY = 'breakme_face'
const PHOTO_SIZE = 256
const NAME_MAX = 12

type MyCharacter = {
  look: Look
  name: string
  /** Base64 JPEG, or null before the player picks one */
  photo: string | null
  /** Photo replaces the drawn face (kid body only) */
  usePhoto: boolean
  /** The player has saved a buddy at least once */
  created: boolean
  /** Bumps on every change so cached previews redraw */
  rev: number
}

let state: MyCharacter = { look: DEFAULT_LOOK, name: 'Me!', photo: null, usePhoto: false, created: false, rev: 0 }
let image: SkImage | null = null
const listeners = new Set<() => void>()

/** Read by the Skia painter every frame. */
export const getFaceImage = () => image

export const photoAllowed = (look: Look) => SHAPES[look.shape].id === 'human'

function apply(next: Omit<MyCharacter, 'rev'>, persist = true) {
  if (next.photo !== state.photo) {
    image = next.photo ? Skia.Image.MakeImageFromEncoded(Skia.Data.fromBase64(next.photo)) : null
  }
  const skin = lookToSkin(next.look, ME_ID, next.name)
  setMySkin({ ...skin, photo: next.usePhoto && Boolean(next.photo) && photoAllowed(next.look) })
  state = { ...next, rev: state.rev + 1 }
  listeners.forEach((l) => l())
  if (persist) {
    const { look, name, photo, usePhoto } = next
    AsyncStorage.setItem(KEY, JSON.stringify({ look, name, photo, usePhoto })).catch(() => {})
  }
}

const cleanName = (name: unknown) =>
  typeof name === 'string' && name.trim() ? name.trim().slice(0, NAME_MAX) : 'Me!'

export async function loadMyCharacter() {
  try {
    const raw = JSON.parse((await AsyncStorage.getItem(KEY)) ?? 'null')
    if (raw) {
      apply(
        {
          look: sanitizeLook(raw.look ?? {}),
          name: cleanName(raw.name),
          photo: typeof raw.photo === 'string' ? raw.photo : null,
          usePhoto: Boolean(raw.usePhoto),
          created: true,
        },
        false,
      )
      return
    }
    // Earlier builds stored only a photo face.
    const legacy = JSON.parse((await AsyncStorage.getItem(LEGACY_FACE_KEY)) ?? 'null')
    const photo = typeof legacy?.photo === 'string' ? legacy.photo : null
    apply({ ...state, photo, usePhoto: Boolean(photo) }, false)
  } catch {
    apply({ ...state }, false)
  }
}

export function useMyCharacter(): MyCharacter {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

export function saveMyCharacter(look: Look, name: string, usePhoto: boolean) {
  apply({ look, name: cleanName(name), photo: state.photo, usePhoto, created: true })
}

/** What other players receive for "Me!": the look only. */
export const myNetworkSkin = () => encodeLook(state.look)

export type PickResult = 'ok' | 'cancelled' | 'denied' | 'error'

/** Opens the gallery with a square crop, then stores a small copy of the result. */
export async function pickFacePhoto(): Promise<PickResult> {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    })
    if (result.canceled || !result.assets[0]) return 'cancelled'
    const asset = result.assets[0]

    // iOS may hand back a non-square crop on some images; center-crop to a square first.
    const side = Math.min(asset.width, asset.height)
    const ctx = ImageManipulator.manipulate(asset.uri)
    if (asset.width !== asset.height && side > 0) {
      ctx.crop({ originX: (asset.width - side) / 2, originY: (asset.height - side) / 2, width: side, height: side })
    }
    ctx.resize({ width: PHOTO_SIZE, height: PHOTO_SIZE })
    const ref = await ctx.renderAsync()
    const saved = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true })
    if (!saved.base64) return 'error'
    apply({ ...state, photo: saved.base64 })
    return 'ok'
  } catch (e) {
    const msg = String((e as Error)?.message ?? e)
    return /permission/i.test(msg) ? 'denied' : 'error'
  }
}

export function removeFacePhoto() {
  apply({ ...state, photo: null, usePhoto: false })
}
