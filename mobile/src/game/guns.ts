/**
 * Gun skins. Regular guns are purely visual (own look, bullet and sound). Premium guns also change
 * how they fire — a quick burst or a spray of thin pellets — via `fire`. Drawn by `drawWeapon` /
 * `drawProjectile` in character.ts (the muzzle of each design sits ~46 units out, where bullets
 * spawn); each id also needs a `shoot-<id>.wav` in sound.ts.
 */

export type GunFire = {
  /** Shots fired one after another per trigger pull */
  burst: number
  /** Bullets per shot, fanned across `spread` radians */
  count: number
  spread: number
}

export type GunSkin = { id: string; name: string; price: number; tier: GunTier; fire?: Partial<GunFire>; perk?: string }

export type GunTier = 'free' | 'common' | 'rare' | 'epic' | 'legendary' | 'premium'

export const GUN_TIER: Record<GunTier, { label: string; color: string }> = {
  free: { label: 'Free', color: '#9aa3b8' },
  common: { label: 'Common', color: '#46d27e' },
  rare: { label: 'Rare', color: '#4cb4ff' },
  epic: { label: 'Epic', color: '#b18cff' },
  legendary: { label: 'Legendary', color: '#ffcf3f' },
  premium: { label: 'Premium', color: '#ff5fa2' },
}

export const DEFAULT_GUN = 'blaster'

/** Starter guns every player owns — never locked. */
export const FREE_GUNS = ['blaster', 'pistol', 'water'] as const

export const GUNS: GunSkin[] = [
  { id: 'blaster', name: 'Buddy Blaster', price: 0, tier: 'free' },
  { id: 'pistol', name: 'Pew Pistol', price: 0, tier: 'free' },
  { id: 'water', name: 'Splash Squirter', price: 0, tier: 'free' },
  { id: 'snow', name: 'Snowball Launcher', price: 100, tier: 'common' },
  { id: 'star', name: 'Star Wand', price: 110, tier: 'common' },
  { id: 'bubble', name: 'Bubble Wand', price: 120, tier: 'common' },
  { id: 'slingshot', name: 'Pebble Slingshot', price: 130, tier: 'common' },
  { id: 'kitty', name: 'Kitty Paw', price: 140, tier: 'common' },
  { id: 'plunger', name: 'Plunger Popper', price: 150, tier: 'common' },
  { id: 'banana', name: 'Banana Blaster', price: 170, tier: 'rare' },
  { id: 'pizza', name: 'Pizza Launcher', price: 210, tier: 'rare' },
  { id: 'ghost', name: 'Boo Blaster', price: 250, tier: 'rare' },
  { id: 'double', name: 'Double Pop', price: 180, tier: 'rare' },
  { id: 'crossbow', name: 'Heart Crossbow', price: 200, tier: 'rare' },
  { id: 'ray', name: 'Retro Ray Gun', price: 220, tier: 'rare' },
  { id: 'bee', name: 'Honey Bee', price: 240, tier: 'rare' },
  { id: 'carrot', name: 'Carrot Cannon', price: 260, tier: 'rare' },
  { id: 'music', name: 'Music Box', price: 280, tier: 'rare' },
  { id: 'confetti', name: 'Party Popper', price: 300, tier: 'rare' },
  { id: 'cupcake', name: 'Cupcake Cannon', price: 330, tier: 'epic' },
  { id: 'duck', name: 'Quack Shot', price: 350, tier: 'epic' },
  { id: 'donut', name: 'Donut Tosser', price: 380, tier: 'epic' },
  { id: 'candy', name: 'Candy Cannon', price: 400, tier: 'epic' },
  { id: 'minigun', name: 'Mini Spinner', price: 450, tier: 'epic' },
  { id: 'grenade', name: 'Boom Tube', price: 500, tier: 'epic' },
  { id: 'ice', name: 'Frost Beam', price: 520, tier: 'epic' },
  { id: 'laser', name: 'Laser Cannon', price: 550, tier: 'epic' },
  { id: 'rocket', name: 'Rocket Launcher', price: 600, tier: 'epic' },
  { id: 'thunder', name: 'Thunder Zapper', price: 800, tier: 'legendary' },
  { id: 'unicorn', name: 'Unicorn Horn', price: 1000, tier: 'legendary' },
  { id: 'golden', name: 'Golden Blaster', price: 1200, tier: 'legendary' },
  { id: 'twin', name: 'Twin Heart', price: 1500, tier: 'premium', fire: { burst: 2 }, perk: 'Fires 2 shots in a row' },
  { id: 'triple', name: 'Tri-Star', price: 2000, tier: 'premium', fire: { count: 3, spread: 0.3 }, perk: 'Shoots 3 stars at once' },
  { id: 'pumpkin', name: 'Pumpkin Scatter', price: 2200, tier: 'premium', fire: { count: 4, spread: 0.45 }, perk: 'Scatters 4 candy corns' },
  { id: 'sprinkle', name: 'Sprinkle Storm', price: 2500, tier: 'premium', fire: { count: 7, spread: 0.55 }, perk: 'Sprays 7 thin sprinkles' },
  { id: 'rainbow', name: 'Rainbow Burst', price: 3000, tier: 'premium', fire: { burst: 3 }, perk: 'Fires 3 shots in a row' },
  { id: 'storm', name: 'Storm Caller', price: 3500, tier: 'premium', fire: { burst: 4 }, perk: 'Fires 4 zaps in a row' },
  { id: 'dragon', name: 'Dragon Breath', price: 4000, tier: 'premium', fire: { burst: 2, count: 5, spread: 0.4 }, perk: 'Breathes 2 waves of 5 flames' },
  { id: 'galaxy', name: 'Galaxy Blaster', price: 5000, tier: 'premium', fire: { burst: 2, count: 3, spread: 0.35 }, perk: 'Fires 2 waves of 3 comets' },
]

export const getGun = (id: string | undefined) => GUNS.find((g) => g.id === id) ?? GUNS[0]

export const isGunId = (id: unknown): id is string => typeof id === 'string' && GUNS.some((g) => g.id === id)

const SINGLE: GunFire = { burst: 1, count: 1, spread: 0 }
export const gunFire = (id: string | undefined): GunFire => ({ ...SINGLE, ...getGun(id).fire })

/** Guns the CPU and bots may carry — never premium, so levels stay equally hard for everyone. */
export const CPU_GUNS = GUNS.filter((g) => !g.fire).map((g) => g.id)

/** CPU / bots pick a gun that stays the same for a given seed (e.g. the level). */
export const gunForSeed = (seed: number) => CPU_GUNS[Math.abs(Math.floor(seed * 7919)) % CPU_GUNS.length]
