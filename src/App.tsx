import { useState } from 'react'
import { CharacterSelect } from './game/CharacterSelect'
import { GameCanvas } from './game/GameCanvas'
import { IntroScreen } from './game/IntroScreen'
import { LevelSelect } from './game/LevelSelect'
import { loadUnlocked, unlockAfterWin } from './game/levels'
import { loadSkins, saveSkins } from './game/prefs'
import './App.css'

type Screen = 'intro' | 'chars' | 'levels' | 'play'

function App() {
  const [screen, setScreen] = useState<Screen>('intro')
  const [unlocked, setUnlocked] = useState(() => loadUnlocked())
  const [skins, setSkins] = useState(() => loadSkins())
  const [levelId, setLevelId] = useState(1)

  return (
    <main className="app">
      {screen === 'intro' && (
        <IntroScreen
          skins={skins}
          onPlay={() => setScreen('levels')}
          onCharacters={() => setScreen('chars')}
        />
      )}

      {screen === 'chars' && (
        <CharacterSelect
          skins={skins}
          onBack={() => setScreen('intro')}
          onChange={(next) => {
            setSkins(next)
            saveSkins(next)
          }}
        />
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
          skins={skins}
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
