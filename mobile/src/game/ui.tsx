import {
  BlendMode,
  Canvas,
  PaintStyle,
  Picture,
  Skia,
  StrokeCap,
  StrokeJoin,
  TileMode,
  createPicture,
  type SkCanvas,
} from '@shopify/react-native-skia'
import { useMemo, type ReactNode } from 'react'
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { playTap } from './sound'
import { colors } from './theme'

/* ------------------------------------------------------------------ icons */

export type IconName =
  | 'back'
  | 'next'
  | 'pause'
  | 'play'
  | 'retry'
  | 'lock'
  | 'check'
  | 'home'
  | 'levels'
  | 'star'
  | 'google'
  | 'gear'
  | 'music'
  | 'speaker'
  | 'voice'
  | 'trophy'
  | 'user'
  | 'fire'
  | 'bag'

/** Icons drawn in a 24×24 box. */
function drawIcon(c: SkCanvas, name: IconName, color: string) {
  const line = Skia.Paint()
  line.setAntiAlias(true)
  line.setColor(Skia.Color(color))
  line.setStyle(PaintStyle.Stroke)
  line.setStrokeWidth(3)
  line.setStrokeCap(StrokeCap.Round)
  line.setStrokeJoin(StrokeJoin.Round)
  const solid = Skia.Paint()
  solid.setAntiAlias(true)
  solid.setColor(Skia.Color(color))

  const path = () => Skia.PathBuilder.Make()
  const rr = (x: number, y: number, w: number, h: number, r: number) => Skia.RRectXY(Skia.XYWHRect(x, y, w, h), r, r)

  switch (name) {
    case 'back':
      c.drawPath(path().moveTo(15, 5).lineTo(8, 12).lineTo(15, 19).detach(), line)
      break
    case 'next':
      c.drawPath(path().moveTo(9, 5).lineTo(16, 12).lineTo(9, 19).detach(), line)
      break
    case 'pause':
      c.drawRRect(rr(6, 5, 4.5, 14, 1.5), solid)
      c.drawRRect(rr(13.5, 5, 4.5, 14, 1.5), solid)
      break
    case 'play':
      c.drawPath(path().moveTo(8, 4.5).lineTo(19.5, 12).lineTo(8, 19.5).close().detach(), solid)
      break
    case 'retry':
      c.drawPath(path().addArc(Skia.XYWHRect(5, 5, 14, 14), -50, 290).detach(), line)
      c.drawPath(path().moveTo(17.5, 2.5).lineTo(17.5, 7.8).lineTo(12.2, 7.8).detach(), line)
      break
    case 'lock':
      c.drawPath(path().moveTo(8.5, 11).lineTo(8.5, 8.5).addArc(Skia.XYWHRect(8.5, 4.5, 7, 7), 180, 180).lineTo(15.5, 11).detach(), line)
      c.drawRRect(rr(5.5, 10.5, 13, 10, 2.5), solid)
      break
    case 'check':
      c.drawPath(path().moveTo(5, 12.5).lineTo(10, 17.5).lineTo(19, 7).detach(), line)
      break
    case 'home':
      c.drawPath(path().moveTo(4, 11.5).lineTo(12, 4.5).lineTo(20, 11.5).detach(), line)
      c.drawPath(path().moveTo(6.5, 10).lineTo(6.5, 19.5).lineTo(17.5, 19.5).lineTo(17.5, 10).detach(), line)
      break
    case 'levels':
      c.drawRRect(rr(4, 4, 7, 7, 2), solid)
      c.drawRRect(rr(13, 4, 7, 7, 2), solid)
      c.drawRRect(rr(4, 13, 7, 7, 2), solid)
      c.drawRRect(rr(13, 13, 7, 7, 2), solid)
      break
    case 'google': {
      // Brand colors are fixed regardless of the requested icon color.
      const ring = Skia.XYWHRect(4.5, 4.5, 15, 15)
      const seg = (start: number, sweep: number, hex: string) => {
        const p = Skia.Paint()
        p.setAntiAlias(true)
        p.setColor(Skia.Color(hex))
        p.setStyle(PaintStyle.Stroke)
        p.setStrokeWidth(3.4)
        c.drawPath(path().addArc(ring, start, sweep).detach(), p)
        return p
      }
      seg(-150, 110, '#ea4335')
      seg(150, 60, '#fbbc05')
      seg(40, 110, '#34a853')
      const blue = seg(0, 40, '#4285f4')
      c.drawPath(path().moveTo(12, 12).lineTo(19.5, 12).detach(), blue)
      break
    }
    case 'star': {
      const b = path()
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 9.5 : 4.2
        const a = -Math.PI / 2 + (i * Math.PI) / 5
        const x = 12 + Math.cos(a) * r
        const y = 12.5 + Math.sin(a) * r
        if (i === 0) b.moveTo(x, y)
        else b.lineTo(x, y)
      }
      c.drawPath(b.close().detach(), solid)
      break
    }
    case 'gear': {
      const b = path()
      for (let i = 0; i < 32; i++) {
        const r = i % 4 < 2 ? 10.5 : 7.8
        const a = ((i - 0.5) * Math.PI) / 16
        const x = 12 + Math.cos(a) * r
        const y = 12 + Math.sin(a) * r
        if (i === 0) b.moveTo(x, y)
        else b.lineTo(x, y)
      }
      c.drawPath(b.close().detach(), solid)
      const hole = Skia.Paint()
      hole.setAntiAlias(true)
      hole.setBlendMode(BlendMode.Clear)
      c.drawCircle(12, 12, 3.2, hole)
      break
    }
    case 'music':
      c.drawPath(path().moveTo(9, 17).lineTo(9, 5.5).lineTo(19, 3.5).lineTo(19, 15).detach(), line)
      c.drawCircle(6.5, 17.5, 3, solid)
      c.drawCircle(16.5, 15.5, 3, solid)
      break
    case 'speaker':
      c.drawPath(path().moveTo(3.5, 9).lineTo(7.5, 9).lineTo(12.5, 4.5).lineTo(12.5, 19.5).lineTo(7.5, 15).lineTo(3.5, 15).close().detach(), solid)
      c.drawPath(path().addArc(Skia.XYWHRect(10, 8, 7, 8), -55, 110).detach(), line)
      c.drawPath(path().addArc(Skia.XYWHRect(9, 4, 12, 16), -55, 110).detach(), line)
      break
    case 'trophy':
      c.drawPath(
        path().moveTo(6.5, 4).lineTo(17.5, 4).lineTo(17, 10).cubicTo(16.6, 13.5, 14.5, 15, 12, 15).cubicTo(9.5, 15, 7.4, 13.5, 7, 10).close().detach(),
        solid,
      )
      c.drawPath(path().moveTo(6.8, 6).cubicTo(3, 6, 3.5, 11, 7.6, 11).detach(), line)
      c.drawPath(path().moveTo(17.2, 6).cubicTo(21, 6, 20.5, 11, 16.4, 11).detach(), line)
      c.drawRRect(rr(10.8, 14, 2.4, 4, 1), solid)
      c.drawRRect(rr(7.5, 17.5, 9, 3, 1.5), solid)
      break
    case 'user':
      c.drawCircle(12, 8.5, 4.2, solid)
      c.drawPath(path().moveTo(4.5, 20).cubicTo(5, 14.5, 19, 14.5, 19.5, 20).close().detach(), solid)
      break
    case 'fire':
      c.drawPath(
        path().moveTo(12, 3).cubicTo(13, 7, 18, 9, 18, 14.5).cubicTo(18, 18, 15.3, 21, 12, 21).cubicTo(8.7, 21, 6, 18, 6, 14.5).cubicTo(6, 11.5, 8, 10, 9, 8).cubicTo(9.5, 10, 10.5, 11, 11, 11).cubicTo(10.5, 8, 11, 5, 12, 3).close().detach(),
        solid,
      )
      break
    case 'bag':
      c.drawPath(path().moveTo(8.5, 9).lineTo(8.5, 7).cubicTo(8.5, 2.5, 15.5, 2.5, 15.5, 7).lineTo(15.5, 9).detach(), line)
      c.drawRRect(rr(4.5, 8.5, 15, 12, 3), solid)
      break
    case 'voice':
      c.drawPath(path().addCircle(12, 12, 8.5).detach(), line)
      c.drawCircle(9, 10, 1.6, solid)
      c.drawCircle(15, 10, 1.6, solid)
      c.drawPath(path().addArc(Skia.XYWHRect(8, 10, 8, 6), 20, 140).detach(), line)
      break
  }
}

export function Icon({ name, size = 22, color = colors.text }: { name: IconName; size?: number; color?: string }) {
  const picture = useMemo(
    () =>
      createPicture(
        (c) => {
          c.scale(size / 24, size / 24)
          drawIcon(c, name, color)
        },
        { width: size, height: size },
      ),
    [name, size, color],
  )
  return (
    <Canvas style={{ width: size, height: size }} pointerEvents="none">
      <Picture picture={picture} />
    </Canvas>
  )
}

/** Round gold coin used wherever coins are shown. */
export function CoinDot({ size = 16 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.gold,
        borderWidth: Math.max(1.5, size * 0.12),
        borderColor: '#c28a12',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: size * 0.28,
          height: size * 0.42,
          borderRadius: size,
          backgroundColor: 'rgba(255, 246, 200, 0.85)',
        }}
      />
    </View>
  )
}

/** Coin balance pill. */
export function CoinChip({ coins, onPress }: { coins: number; onPress?: () => void }) {
  return (
    <Pressable
      onPress={
        onPress &&
        (() => {
          playTap()
          onPress()
        })
      }
      disabled={!onPress}
      accessibilityLabel={`${coins} coins`}
      hitSlop={6}
      style={({ pressed }) => [styles.coinChip, pressed && { opacity: 0.75 }]}
    >
      <CoinDot size={22} />
      <Text style={styles.coinChipText} numberOfLines={1}>
        {coins.toLocaleString()}
      </Text>
      {onPress && (
        <View style={styles.coinChipPlus}>
          <Text style={styles.coinChipPlusText}>+</Text>
        </View>
      )}
    </Pressable>
  )
}

/* ---------------------------------------------------------------- buttons */

export type Variant = 'gold' | 'green' | 'blue' | 'red' | 'dark' | 'white'

const PALETTE: Record<Variant, { face: string; depth: string; text: string; shine: string }> = {
  gold: { face: '#ffcf3f', depth: '#c28a12', text: '#3d2805', shine: 'rgba(255, 246, 200, 0.55)' },
  green: { face: '#46d27e', depth: '#1c8c4a', text: '#05331a', shine: 'rgba(210, 255, 228, 0.5)' },
  blue: { face: '#4cb4ff', depth: '#1f6ec2', text: '#04284d', shine: 'rgba(214, 238, 255, 0.5)' },
  red: { face: '#ff6474', depth: '#b8323f', text: '#4a0810', shine: 'rgba(255, 220, 224, 0.5)' },
  dark: { face: '#322d5c', depth: '#17142f', text: colors.text, shine: 'rgba(255, 255, 255, 0.12)' },
  white: { face: '#ffffff', depth: '#b9c0d0', text: '#1f2937', shine: 'rgba(255, 255, 255, 0)' },
}

const SIZES = {
  lg: { depth: 6, padV: 13, padH: 30, font: 19, icon: 21, radius: 20 },
  md: { depth: 5, padV: 11, padH: 22, font: 16, icon: 18, radius: 16 },
  sm: { depth: 4, padV: 8, padH: 16, font: 14, icon: 16, radius: 14 },
}

type ButtonProps = {
  label: string
  onPress: () => void
  icon?: IconName
  variant?: Variant
  size?: keyof typeof SIZES
  disabled?: boolean
  style?: StyleProp<ViewStyle>
}

/** Chunky "3D" button: the face sinks into its darker base when pressed. */
export function GameButton({ label, onPress, icon, variant = 'gold', size = 'md', disabled, style }: ButtonProps) {
  const p = PALETTE[variant]
  const s = SIZES[size]
  return (
    <Pressable
      onPress={() => {
        playTap()
        onPress()
      }}
      disabled={disabled}
      style={[disabled && styles.disabled, style]}
    >
      {({ pressed }) => (
        <View style={{ backgroundColor: p.depth, borderRadius: s.radius }}>
          <View
            style={[
              styles.face,
              {
                backgroundColor: p.face,
                borderRadius: s.radius,
                paddingVertical: s.padV,
                paddingHorizontal: s.padH,
                marginBottom: pressed ? 1 : s.depth,
                marginTop: pressed ? s.depth - 1 : 0,
              },
            ]}
          >
            <View style={[styles.shine, { backgroundColor: p.shine, borderRadius: s.radius }]} />
            {icon && <Icon name={icon} size={s.icon} color={p.text} />}
            <Text
              style={[styles.label, { color: p.text, fontSize: s.font }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {label}
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  )
}

export function IconButton({
  icon,
  onPress,
  variant = 'dark',
  size = 46,
  accessibilityLabel,
}: {
  icon: IconName
  onPress: () => void
  variant?: Variant
  size?: number
  accessibilityLabel: string
}) {
  const p = PALETTE[variant]
  const depth = 4
  return (
    <Pressable
      onPress={() => {
        playTap()
        onPress()
      }}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {({ pressed }) => (
        <View style={{ backgroundColor: p.depth, borderRadius: size / 2 }}>
          <View
            style={[
              styles.iconFace,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: p.face,
                marginBottom: pressed ? 1 : depth,
                marginTop: pressed ? depth - 1 : 0,
              },
            ]}
          >
            <Icon name={icon} size={size * 0.48} color={p.text} />
          </View>
        </View>
      )}
    </Pressable>
  )
}

/* ----------------------------------------------------------------- layout */

export function Panel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.panel, style]}>{children}</View>
}

export function ScreenHeader({ title, onBack, right }: { title: string; onBack: () => void; right?: ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={[styles.headerSide, styles.headerLeft]}>
        <IconButton icon="back" onPress={onBack} accessibilityLabel="Back" />
      </View>
      <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {title}
      </Text>
      <View style={styles.headerSide}>{right}</View>
    </View>
  )
}

/** Full-screen painted background shared by every screen. */
export function Backdrop() {
  const { width, height } = useWindowDimensions()
  const picture = useMemo(
    () =>
      createPicture(
        (c) => {
          const all = Skia.XYWHRect(0, 0, width, height)
          const bg = Skia.Paint()
          bg.setShader(
            Skia.Shader.MakeLinearGradient(
              { x: 0, y: 0 },
              { x: 0, y: height },
              [Skia.Color('#241b52'), Skia.Color('#0c0b1d')],
              null,
              TileMode.Clamp,
            ),
          )
          c.drawRect(all, bg)

          const glow = Skia.Paint()
          glow.setShader(
            Skia.Shader.MakeRadialGradient(
              { x: width / 2, y: height * 0.2 },
              width * 0.85,
              [Skia.Color('rgba(255, 207, 63, 0.16)'), Skia.Color('rgba(255, 207, 63, 0)')],
              null,
              TileMode.Clamp,
            ),
          )
          c.drawRect(all, glow)

          let seed = 11
          const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
          const star = Skia.Paint()
          star.setAntiAlias(true)
          star.setColor(Skia.Color('#ffffff'))
          for (let i = 0; i < 70; i++) {
            star.setAlphaf(0.06 + rnd() * 0.28)
            c.drawCircle(rnd() * width, rnd() * height, 0.6 + rnd() * 1.4, star)
          }
        },
        { width, height },
      ),
    [width, height],
  )
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Picture picture={picture} />
    </Canvas>
  )
}

const styles = StyleSheet.create({
  coinChip: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 6,
    height: 36,
    paddingLeft: 5,
    paddingRight: 5,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 207, 63, 0.45)',
  },
  coinChipText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    minWidth: 28,
    paddingRight: 4,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  coinChipPlus: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.green,
    borderWidth: 1.5,
    borderColor: '#1c8c4a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinChipPlusText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 20,
  },
  face: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  shine: {
    position: 'absolute',
    top: 3,
    left: 8,
    right: 8,
    height: '38%',
  },
  label: {
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  disabled: {
    opacity: 0.4,
  },
  iconFace: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    backgroundColor: colors.panel,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    paddingBottom: 4,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  headerSide: {
    flexShrink: 0,
    minWidth: 46,
    alignItems: 'flex-end',
  },
  headerLeft: {
    alignItems: 'flex-start',
  },
})
