import { Canvas, Picture, createPicture } from '@shopify/react-native-skia'
import { useMemo } from 'react'
import { ARENA, createState } from './engine'
import { renderLevelPreview } from './render'
import type { SkinChoice } from './skins'

/** Miniature, static drawing of a level's arena. */
export function LevelMap({ levelId, skins, width }: { levelId: number; skins: SkinChoice; width: number }) {
  const scale = width / ARENA.width
  const height = ARENA.height * scale
  const picture = useMemo(
    () =>
      createPicture(
        (canvas) => {
          canvas.scale(scale, scale)
          renderLevelPreview(canvas, createState(levelId, skins))
        },
        { width, height },
      ),
    [levelId, skins, scale, width, height],
  )
  return (
    <Canvas style={{ width, height, borderRadius: 12, overflow: 'hidden' }} pointerEvents="none">
      <Picture picture={picture} />
    </Canvas>
  )
}
