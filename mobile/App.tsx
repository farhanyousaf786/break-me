import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { StyleSheet } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { GameScreen } from './src/game/GameScreen'
import { IntroScreen } from './src/game/IntroScreen'
import { LevelSelect } from './src/game/LevelSelect'
import { initSound } from './src/game/sound'
import { loadUnlocked, unlockAfterWin } from './src/game/storage'
import { colors } from './src/game/theme'

type Screen = 'intro' | 'levels' | 'play'

export default function App() {
  const [screen, setScreen] = useState<Screen>('intro')
  const [unlocked, setUnlocked] = useState(1)
  const [levelId, setLevelId] = useState(1)

  useEffect(() => {
    initSound()
    loadUnlocked().then(setUnlocked)
  }, [])

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root}>
        <StatusBar style="light" />

        {screen === 'intro' && <IntroScreen onPlay={() => setScreen('levels')} />}

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
          <GameScreen
            key={levelId}
            levelId={levelId}
            onBack={() => setScreen('levels')}
            onWin={async (cleared) => {
              setUnlocked(await unlockAfterWin(cleared, unlocked))
              setScreen('levels')
            }}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
})
