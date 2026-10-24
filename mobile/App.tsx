import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { CharacterSelect } from './src/game/CharacterSelect'
import { GameScreen } from './src/game/GameScreen'
import { IntroScreen } from './src/game/IntroScreen'
import { LevelSelect } from './src/game/LevelSelect'
import { OnlineGame } from './src/game/OnlineGame'
import { OnlineLobby } from './src/game/OnlineLobby'
import { watchPlayer, type Player } from './src/net/account'
import type { Match } from './src/net/rooms'
import { ProfileScreen } from './src/game/ProfileScreen'
import { SettingsScreen } from './src/game/Settings'
import { ShopScreen } from './src/game/ShopScreen'
import { useBack } from './src/game/useBack'
import { AdBanner, initAds } from './src/monetize/ads'
import type { ShopFocus } from './src/monetize/config'
import { initPurchases } from './src/monetize/purchases'
import { SplashIntro } from './src/game/SplashIntro'
import { DEFAULT_SKINS, ME_ID, randomRival, type SkinChoice } from './src/game/skins'
import { initSound, setMusicMuted } from './src/game/sound'
import { loadSkins, loadUnlocked, loadWelcomed, saveSkins, saveWelcomed, unlockAfterWin, unlockAllLevels } from './src/game/storage'
import { WelcomeScreen } from './src/game/WelcomeScreen'
import { onlineConfigured } from './src/net/firebase'
import { colors } from './src/game/theme'
import { grantCoins, loadWallet } from './src/game/wallet'
import { loadMyCharacter } from './src/game/myCharacter'
import { loadDaily } from './src/game/daily'
import { Backdrop } from './src/game/ui'

void SplashScreen.preventAutoHideAsync()

const TESTER_COINS = 5000

type Screen = 'intro' | 'chars' | 'levels' | 'play' | 'online' | 'online-play' | 'settings' | 'profile' | 'shop'

export default function App() {
  const [screen, setScreen] = useState<Screen>('intro')
  const [match, setMatch] = useState<Match | null>(null)
  const [unlocked, setUnlocked] = useState(1)
  const [skins, setSkins] = useState<SkinChoice>({ ...DEFAULT_SKINS })
  const [levelId, setLevelId] = useState(1)
  const [player, setPlayer] = useState<Player | null | undefined>(undefined)
  const [charsFrom, setCharsFrom] = useState<Screen>('intro')
  const [shopFrom, setShopFrom] = useState<Screen>('intro')
  const [shopFocus, setShopFocus] = useState<ShopFocus | undefined>()
  /** Online lobby entry: `friend` opens Create Room right away. */
  const [onlineFocus, setOnlineFocus] = useState<'friend' | undefined>()
  const [settingsFrom, setSettingsFrom] = useState<Screen>('intro')
  const [showSplash, setShowSplash] = useState(true)
  // undefined while loading; the welcome screen waits for both this and the restored sign-in.
  const [welcomed, setWelcomed] = useState<boolean | undefined>(undefined)
  // Don't dismiss splash (or show menu) until we know whether Welcome or Intro should appear.
  // Wait for welcome flag + auth restore so we never flash the menu under the consent screen.
  const bootReady = welcomed !== undefined && player !== undefined
  // First launch: age + privacy/terms (even if already signed in with Google).
  const needWelcome = welcomed === false && player !== undefined
  const finishWelcome = () => {
    setWelcomed(true)
    saveWelcomed()
  }
  const [rival, setRival] = useState(() => randomRival(DEFAULT_SKINS.blue))
  const matchSkins = useMemo<SkinChoice>(() => ({ blue: skins.blue, red: rival }), [skins.blue, rival])
  const newRival = () => setRival((prev) => randomRival(skins.blue, prev))

  useEffect(() => {
    initSound()
    loadUnlocked().then(setUnlocked)
    loadWelcomed().then(setWelcomed)
    loadSkins().then(async (saved) => {
      const [wallet] = await Promise.all([loadWallet([saved.blue, saved.red]), loadMyCharacter(), loadDaily()])
      const owned = (id: string, fallback: string) => (id === ME_ID || wallet.owned.includes(id) ? id : fallback)
      setSkins({ blue: owned(saved.blue, DEFAULT_SKINS.blue), red: owned(saved.red, DEFAULT_SKINS.red) })
      // After the wallet loads, so restored heroes / Remove Ads land in the saved wallet.
      void initPurchases()
    })
    return watchPlayer(setPlayer)
  }, [])

  const openCharacters = (from: Screen) => {
    setCharsFrom(from)
    setScreen('chars')
  }

  const openSettings = (from: Screen) => {
    setSettingsFrom(from)
    setScreen('settings')
  }

  const openShop = (from: Screen, focus?: ShopFocus) => {
    setShopFrom(from)
    setShopFocus(focus)
    setScreen('shop')
  }

  const playCpu = () => setScreen('levels')

  const isGame = screen === 'play' || screen === 'online-play'

  // Game screens register their own back handling (pause / leave match), which runs before this.
  useBack(() => {
    if (showSplash) return true
    if (needWelcome) {
      finishWelcome()
      return true
    }
    switch (screen) {
      case 'intro':
        return false
      case 'chars':
        setScreen(charsFrom)
        return true
      case 'shop':
        setScreen(shopFrom)
        return true
      case 'settings':
        setScreen(settingsFrom)
        return true
      case 'play':
        setScreen('levels')
        return true
      case 'online-play':
        setMatch(null)
        setScreen('online')
        return true
      default:
        setScreen('intro')
        return true
    }
  })

  useEffect(() => {
    setMusicMuted(isGame)
  }, [isGame])

  // A fresh CPU rival after every visit to a match, and whenever the player changes fighter.
  const playing = screen === 'play'
  useEffect(() => {
    if (!playing) newRival()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, skins.blue])

  return (
    <SafeAreaProvider>
      <View style={styles.shell}>
        <Backdrop />
        <SafeAreaView style={styles.root}>
          <StatusBar style="light" />
          <View style={[styles.content, !isGame && styles.menu]}>

          {screen === 'intro' && bootReady && !needWelcome && (
            <IntroScreen
              skins={matchSkins}
              unlocked={unlocked}
              player={player}
              onPlay={playCpu}
              onOnline={() => {
                setOnlineFocus(undefined)
                setScreen('online')
              }}
              onPlayFriend={() => {
                setOnlineFocus('friend')
                setScreen('online')
              }}
              onCharacters={() => openCharacters('intro')}
              onShop={() => openShop('intro')}
              onProfile={() => setScreen('profile')}
              onSettings={() => openSettings('intro')}
              onUnlockAll={async () => {
                grantCoins(TESTER_COINS)
                setUnlocked(await unlockAllLevels())
              }}
            />
          )}

          {screen === 'profile' && (
            <ProfileScreen
              player={player}
              skinId={skins.blue}
              unlocked={unlocked}
              onCharacters={() => openCharacters('profile')}
              onBack={() => setScreen('intro')}
            />
          )}

          {screen === 'settings' && (
            <SettingsScreen player={player} skinId={skins.blue} onBack={() => setScreen(settingsFrom)} />
          )}

          {screen === 'shop' && (
            <ShopScreen
              focus={shopFocus}
              onBack={() => {
                setShopFocus(undefined)
                setScreen(shopFrom)
              }}
            />
          )}

          {screen === 'online' && (
            <OnlineLobby
              mySkin={skins.blue}
              focus={onlineFocus}
              onSettings={() => openSettings('online')}
              onBack={() => {
                setOnlineFocus(undefined)
                setScreen('intro')
              }}
              onMatched={(m) => {
                setOnlineFocus(undefined)
                setMatch(m)
                setScreen('online-play')
              }}
            />
          )}

          {screen === 'online-play' && match && (
            <OnlineGame
              key={match.code}
              match={match}
              onRematch={setMatch}
              onExit={() => {
                setMatch(null)
                setScreen('online')
              }}
            />
          )}

          {screen === 'chars' && (
            <CharacterSelect
              skins={skins}
              onBack={() => setScreen(charsFrom)}
              onShop={(focus) => openShop('chars', focus)}
              onChange={(next) => {
                setSkins(next)
                void saveSkins(next)
              }}
            />
          )}

          {screen === 'levels' && (
            <LevelSelect
              unlocked={unlocked}
              skins={matchSkins}
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
              skins={matchSkins}
              onBack={() => setScreen('levels')}
              onHome={() => setScreen('intro')}
              onWin={async (cleared) => {
                setUnlocked(await unlockAfterWin(cleared, unlocked))
              }}
              onNext={() => {
                newRival()
                setLevelId((id) => id + 1)
              }}
            />
          )}
          </View>
          {!isGame && <AdBanner />}
        </SafeAreaView>
        {!showSplash && needWelcome && (
          <WelcomeScreen
            alreadySignedIn={player?.kind === 'google'}
            onSignedIn={finishWelcome}
            onSkip={finishWelcome}
          />
        )}
        {showSplash && (
          <SplashIntro
            ready={bootReady}
            onDone={() => {
              setShowSplash(false)
              // Any consent form should appear over the menu / welcome, not the splash.
              void initAds()
            }}
          />
        )}
      </View>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
  menu: {
    maxWidth: 560,
  },
})
