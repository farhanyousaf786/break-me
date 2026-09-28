import './Screens.css'
import { unlockAudio } from './sound'

type Props = {
  onPlay: () => void
}

export function IntroScreen({ onPlay }: Props) {
  return (
    <div className="screen intro-screen">
      <div className="intro-glow" aria-hidden />
      <p className="intro-eyebrow">User vs CPU</p>
      <h1 className="intro-title">BreakMe</h1>
      <p className="intro-tag">
        Tap to shoot. Recoil kicks your buddy back.
        Hit the red one before they hit you.
      </p>
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
      <p className="intro-foot">10 levels · Easy → Hard</p>
    </div>
  )
}
