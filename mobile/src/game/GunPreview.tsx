import { Canvas, Picture, createPicture } from '@shopify/react-native-skia'
import { useMemo } from 'react'
import { drawWeapon } from './character'
import { skiaPainter } from './render'

/** A gun on its own, centered and scaled to fit (gun space spans roughly x 0–54, y −12–15). */
export function GunPreview({ weapon, size }: { weapon: string; size: number }) {
  const picture = useMemo(
    () =>
      createPicture(
        (canvas) => {
          const zoom = size / 62
          canvas.translate(size / 2, size / 2)
          canvas.scale(zoom, zoom)
          canvas.rotate(-12, 0, 0)
          canvas.translate(-27, -1)
          drawWeapon(skiaPainter(canvas), weapon)
        },
        { width: size, height: size },
      ),
    [weapon, size],
  )
  return (
    <Canvas style={{ width: size, height: size }} pointerEvents="none">
      <Picture picture={picture} />
    </Canvas>
  )
}
