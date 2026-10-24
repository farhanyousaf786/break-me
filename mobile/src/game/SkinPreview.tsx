import { Canvas, Picture, createPicture, type SkPicture } from '@shopify/react-native-skia'
import { useEffect, useState } from 'react'
import { drawCharacter } from './character'
import { skiaPainter } from './render'
import { useMyCharacter } from './myCharacter'
import { withAura } from './auras'
import { ME_ID, getSkin, type AuraKind, type Skin } from './skins'

type Props = {
  skinId: string
  side: 'blue' | 'red'
  size: number
  /** Bob + blink. Off for grid cards so a screen full of previews stays cheap. */
  animated?: boolean
  /** Team-colored halo behind the character */
  glow?: boolean
  /** Draw this skin instead of looking up `skinId` (creator drafts) */
  skin?: Skin
  /** Gun skin id (guns.ts) */
  weapon?: string
  /** Override / equip aura (auras.ts); when set, replaces the skin's built-in aura */
  aura?: AuraKind
}

const TEAM = { blue: '#5ec8ff', red: '#ff6b7a' }

export function SkinPreview({ skinId, side, size, animated = false, glow = true, skin: override, weapon, aura }: Props) {
  const [picture, setPicture] = useState<SkPicture | null>(null)
  const meRev = useMyCharacter().rev
  const rev = skinId === ME_ID || override?.photo ? meRev : 0
  const overrideKey = override ? JSON.stringify(override) : ''

  useEffect(() => {
    const skin = withAura(override ?? getSkin(skinId), aura)
    const pose = {
      angle: side === 'blue' ? 0.25 : Math.PI - 0.25,
      spin: 0,
      kick: 0,
      color: glow ? TEAM[side] : '',
      seed: skinId.length,
      weapon,
    }
    // The character plus its gun spans roughly 110 units across.
    const zoom = size / 110
    const draw = (now: number) =>
      createPicture(
        (canvas) => {
          canvas.translate(size / 2, size / 2 + 4 * zoom)
          canvas.scale(zoom, zoom)
          drawCharacter(skiaPainter(canvas), side === 'blue' ? -8 : 8, 0, pose, skin, now)
        },
        { width: size, height: size },
      )

    let raf = 0
    let last = 0
    const tick = (t: number) => {
      if (!animated) {
        setPicture(draw(1000))
        return
      }
      if (t - last > 33) {
        last = t
        setPicture(draw(Date.now()))
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [skinId, side, size, animated, glow, rev, overrideKey, weapon, aura])

  return (
    <Canvas style={{ width: size, height: size }} pointerEvents="none">
      {picture && <Picture picture={picture} />}
    </Canvas>
  )
}
