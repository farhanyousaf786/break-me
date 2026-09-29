import { useState } from 'react'
import { SKINS, getSkin, type SkinChoice } from './skins'
import { SkinPreview } from './SkinPreview'
import './Screens.css'

type Props = {
  skins: SkinChoice
  onChange: (skins: SkinChoice) => void
  onBack: () => void
}

export function CharacterSelect({ skins, onChange, onBack }: Props) {
  const [side, setSide] = useState<'blue' | 'red'>('blue')

  return (
    <div className="screen chars-screen">
      <button type="button" className="btn-ghost" onClick={onBack}>
        ← Back
      </button>
      <h2 className="levels-title">Choose Characters</h2>

      <div className="chars-duel">
        {(['blue', 'red'] as const).map((s) => (
          <button
            key={s}
            type="button"
            className={`chars-slot ${s} ${side === s ? 'active' : ''}`}
            onClick={() => setSide(s)}
          >
            <span className="chars-slot-label">{s === 'blue' ? 'YOU' : 'CPU'}</span>
            <SkinPreview skinId={skins[s]} side={s} size={110} />
            <span className="chars-slot-name">{getSkin(skins[s]).name}</span>
          </button>
        ))}
      </div>

      <p className="levels-sub">
        Picking for <strong className={side}>{side === 'blue' ? 'You' : 'CPU'}</strong> — tap a slot above to switch
      </p>

      <div className="chars-grid">
        {SKINS.map((skin) => {
          const selected = skins[side] === skin.id
          return (
            <button
              key={skin.id}
              type="button"
              className={`chars-card ${side} ${selected ? 'selected' : ''}`}
              onClick={() => onChange({ ...skins, [side]: skin.id })}
            >
              <SkinPreview skinId={skin.id} side={side} size={84} />
              <span className="chars-card-name">{skin.name}</span>
            </button>
          )
        })}
      </div>

      <button type="button" className="btn-primary chars-done" onClick={onBack}>
        Done
      </button>
    </div>
  )
}
