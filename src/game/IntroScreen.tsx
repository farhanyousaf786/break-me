import './Screens.css'
import type { SkinChoice } from './skins'
import { SkinPreview } from './SkinPreview'
import { unlockAudio } from './sound'

type Props = {
  skins: SkinChoice
  onPlay: () => void
  onCharacters: () => void
}

export function IntroScreen({ skins, onPlay, onCharacters }: Props) {
  return (
    <div className="screen intro-screen">
      <div className="intro-glow" aria-hidden />
      <p className="intro-eyebrow">User vs CPU</p>
      <h1 className="intro-title">Break Buddies</h1>
      <p className="intro-tag">
        Tap to shoot. Recoil kicks your buddy back.
        Hit the other one before they hit you.
      </p>
      <div className="intro-buddies">
        <SkinPreview skinId={skins.blue} side="blue" size={120} />
        <span className="vs">VS</span>
        <SkinPreview skinId={skins.red} side="red" size={120} />
      </div>
      <div className="intro-duel" aria-hidden>
        <span className="buddy blue">YOU</span>
        <span className="vs">VS</span>
        <span className="buddy red">CPU</span>
      </div>
      <button
        type="button"
        className="btn-primary"
        onClick={() => {
          unlockAudio()
          onPlay()
        }}
      >
        Play
      </button>
      <button type="button" className="btn-secondary" onClick={onCharacters}>
        Characters
      </button>
      <p className="intro-foot">10 levels · Easy → Hard</p>
    </div>
  )
}
