import { OUTLINE, type Painter, type Pt } from './character'

/**
 * Power-up bubbles that float around the arena. Shoot one (or bump into it) to grab it.
 * Durations are in game seconds; `freeze` hits the other fighter instead of the one who grabbed it.
 */
export const POWER_KINDS = ['shield', 'giant', 'tiny', 'freeze', 'triple'] as const
export type PowerKind = (typeof POWER_KINDS)[number]

export const POWERS: Record<PowerKind, { label: string; color: string; seconds: number }> = {
  shield: { label: 'SHIELD!', color: '#5ec8ff', seconds: 10 },
  giant: { label: 'GIANT AMMO!', color: '#ff8c42', seconds: 8 },
  tiny: { label: 'TINY ME!', color: '#46d27e', seconds: 8 },
  freeze: { label: 'FREEZE!', color: '#9be7ff', seconds: 2.5 },
  triple: { label: 'TRIPLE SHOT!', color: '#ffcf3f', seconds: 8 },
}

export const BUBBLE_RADIUS = 17

const WHITE = '#ffffff'

/** Icon centred on (0, 0), about 16 units across. */
export function drawPowerIcon(p: Painter, kind: PowerKind) {
  switch (kind) {
    case 'shield':
      p.poly([[0, -8], [7, -5], [6, 3], [0, 8], [-6, 3], [-7, -5]], true, { fill: '#2a7fad', stroke: WHITE, width: 1.6 })
      p.poly([[-3, 0], [-0.5, 3], [4, -3]], false, { stroke: WHITE, width: 2 })
      break
    case 'giant':
      p.circle(0, 0, 7.5, { fill: '#ff8c42', stroke: OUTLINE, width: 1.6 })
      p.circle(-2.5, -2.5, 2.2, { fill: WHITE, alpha: 0.85 })
      break
    case 'tiny':
      p.circle(0, 1, 4.5, { fill: '#46d27e', stroke: OUTLINE, width: 1.4 })
      p.circle(-1.5, 0.5, 0.8, { fill: OUTLINE })
      p.circle(1.5, 0.5, 0.8, { fill: OUTLINE })
      for (const s of [-1, 1]) {
        p.poly([[s * 8, -7], [s * 5, -4]], false, { stroke: WHITE, width: 1.6 })
        p.poly([[s * 5, -6.5], [s * 5, -4], [s * 7.5, -4]], false, { stroke: WHITE, width: 1.6 })
      }
      break
    case 'freeze':
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI) / 3
        const c = Math.cos(a) * 8
        const s = Math.sin(a) * 8
        p.poly([[-c, -s], [c, s]], false, { stroke: WHITE, width: 2 })
      }
      p.circle(0, 0, 2, { fill: '#9be7ff' })
      break
    case 'triple': {
      const pts: Pt[] = [[-5, 4], [0, -5], [5, 4]]
      for (const [x, y] of pts) p.circle(x, y, 3, { fill: '#ffcf3f', stroke: OUTLINE, width: 1.2 })
      break
    }
  }
}
