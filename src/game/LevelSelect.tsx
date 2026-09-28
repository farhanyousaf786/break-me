import { LEVELS } from './levels'
import './Screens.css'

type Props = {
  unlocked: number
  onSelect: (levelId: number) => void
  onBack: () => void
}

export function LevelSelect({ unlocked, onSelect, onBack }: Props) {
  return (
    <div className="screen levels-screen">
      <header className="levels-head">
        <button type="button" className="btn-ghost" onClick={onBack}>
          ← Back
        </button>
        <h2 className="levels-title">Select Level</h2>
        <p className="levels-sub">User vs CPU · beat a level to unlock the next</p>
      </header>

      <div className="level-grid">
        {LEVELS.map((lvl) => {
          const open = lvl.id <= unlocked
          return (
            <button
              key={lvl.id}
              type="button"
              className={`level-card ${open ? 'open' : 'locked'} tier-${lvl.tier.toLowerCase()}`}
              disabled={!open}
              onClick={() => open && onSelect(lvl.id)}
            >
              <span className="level-num">{lvl.id}</span>
              <span className="level-name">{open ? lvl.name : 'Locked'}</span>
              <span className="level-tier">{open ? lvl.tier : '🔒'}</span>
              {open && <span className="level-blurb">{lvl.blurb}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
