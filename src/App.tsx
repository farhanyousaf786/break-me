import { useState } from 'react'
import { GameCanvas } from './game/GameCanvas'
import { IntroScreen } from './game/IntroScreen'
import { LevelSelect } from './game/LevelSelect'
import { loadUnlocked, unlockAfterWin } from './game/levels'
import './App.css'

type Screen = 'intro' | 'levels' | 'play'

function App() {
  const [screen, setScreen] = useState<Screen>('intro')
  const [unlocked, setUnlocked] = useState(() => loadUnlocked())
  const [levelId, setLevelId] = useState(1)

  return (
    <main className="app">
      {screen === 'intro' && (
        <IntroScreen onPlay={() => setScreen('levels')} />
      )}

      {screen === 'levels' && (
        <LevelSelect
          unlocked={unlocked}
          onBack={() => setScreen('intro')}
          onSelect={(id) => {
            setLevelId(id)
            setScreen('play')
          }}
        />
      )}

      {screen === 'play' && (
        <GameCanvas
          key={levelId}
          levelId={levelId}
          onBack={() => setScreen('levels')}
          onWin={(cleared) => {
            const next = unlockAfterWin(cleared)
            setUnlocked(next)
            setScreen('levels')
          }}
        />
      )}
    </main>
  )
}

export default App
