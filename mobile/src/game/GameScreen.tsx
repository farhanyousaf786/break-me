import {
  Canvas,
  Picture,
  createPicture,
  type SkPicture,
} from "@shopify/react-native-skia";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSharedValue } from "react-native-reanimated";
import {
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import {
  ARENA,
  ageTaunts,
  createState,
  sayTaunt,
  tryShootBlue,
  updateGame,
} from "./engine";
import { LEVELS, getLevel } from "./levels";
import { CPU_COMEBACKS, QuickChat } from "./QuickChat";
import { Countdown } from "./Countdown";
import { fitStage, renderStage, type StageFit } from "./render";
import { SoundControls } from "./Settings";
import { playVoice } from "./sound";
import { recordCpuResult } from "./stats";
import { getSkin, type SkinChoice } from "./skins";
import { colors } from "./theme";
import type { GameState } from "./types";
import { CoinDot, GameButton, Icon, IconButton, Panel } from "./ui";
import { useBack } from "./useBack";
import { PAR, addCoins, getWallet, rewardLevel, type LevelReward } from "./wallet";
import { gunForSeed } from "./guns";
import { trackDaily } from "./daily";
import { buzz } from "./haptics";
import { AdRect, maybeShowInterstitial, noteResult, showRewarded, useAds } from "../monetize/ads";

type Props = {
  levelId: number;
  skins: SkinChoice;
  /** Called once when the level is beaten (persist progress); navigation is up to the player. */
  onWin: (levelId: number) => void;
  onNext?: () => void;
  onBack: () => void;
  onHome: () => void;
};

type Overlay = null | "pause" | "sound" | "win" | "lose";

/** Frozen with no banner while the 3-2-1 countdown plays. */
const START_PROMPT = "";
/** Pause after a break so the explosion plays out before the result menu appears. */
const RESULT_DELAY_MS = 2000;

const EMPTY_PICTURE = createPicture(() => {});

/**
 * Holds the current arena frame. Frames go straight to the Skia canvas through a shared value, so a
 * running game never re-renders the React tree 60 times a second.
 */
export function useFramePicture() {
  return useSharedValue<SkPicture>(EMPTY_PICTURE);
}

function drawFrame(
  state: GameState,
  fit: StageFit,
  prompt?: string,
): SkPicture {
  return createPicture(
    (canvas) => renderStage(canvas, state, fit, prompt),
    { width: fit.width, height: fit.height },
  );
}

export function GameScreen({
  levelId,
  skins,
  onWin,
  onNext,
  onBack,
  onHome,
}: Props) {
  const level = getLevel(levelId);
  const [initialState] = useState(() => createState(levelId, skins, { guns: levelGuns(levelId) }));
  const stateRef = useRef<GameState>(initialState);
  const onWinRef = useRef(onWin);
  useEffect(() => {
    onWinRef.current = onWin;
  }, [onWin]);

  const [fit, setFit] = useState<StageFit | null>(null);
  const fitRef = useRef<StageFit | null>(null);
  const picture = useFramePicture();
  const [hint, setHint] = useState(level.blurb);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const shotsRef = useRef(0);
  const [reward, setReward] = useState<LevelReward | null>(null);
  const [doubled, setDoubled] = useState(false);
  const { rewardedReady } = useAds();

  // Frozen with an in-arena banner (start / retry).
  const promptRef = useRef<string | null>(START_PROMPT);
  // Frozen behind a menu overlay (pause / win).
  const pausedRef = useRef(false);
  const needsDrawRef = useRef(true);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    const next = fitStage(width, height);
    fitRef.current = next;
    needsDrawRef.current = true;
    setFit(next);
  };

  const openPause = () => {
    if (pausedRef.current) return;
    pausedRef.current = true;
    setOverlay("pause");
  };

  const resume = () => {
    pausedRef.current = false;
    needsDrawRef.current = true;
    setOverlay(null);
  };

  const [countKey, setCountKey] = useState(0);
  const [counting, setCounting] = useState(true);
  const go = () => {
    promptRef.current = null;
    setHint(`Break them in ${PAR[level.tier]} shots or fewer for 3 stars`);
  };

  const restart = () => {
    stateRef.current = createState(levelId, skins, { guns: levelGuns(levelId) });
    promptRef.current = START_PROMPT;
    setCounting(true);
    setCountKey((k) => k + 1);
    pausedRef.current = false;
    needsDrawRef.current = true;
    shotsRef.current = 0;
    setReward(null);
    setDoubled(false);
    setHint(level.blurb);
    setOverlay(null);
  };

  useEffect(() => {
    const sub = AppState.addEventListener("change", (status) => {
      if (
        status !== "active" &&
        promptRef.current === null &&
        stateRef.current.phase === "playing"
      ) {
        openPause();
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let settleAt = 0;

    const tick = () => {
      const now = performance.now();
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      raf = requestAnimationFrame(tick);

      if (pausedRef.current || promptRef.current !== null) {
        if (stateRef.current.taunts.length > 0) {
          stateRef.current = ageTaunts(stateRef.current, dt);
          needsDrawRef.current = true;
        }
        // Frozen: only redraw when something visible changed, so idle screens cost nothing.
        if (needsDrawRef.current && fitRef.current) {
          needsDrawRef.current = false;
          picture.value = drawFrame(
            stateRef.current,
            fitRef.current,
            promptRef.current ?? undefined,
          );
        }
        return;
      }

      const before = stateRef.current.guns[0].pickups ?? 0;
      let state = updateGame(stateRef.current, dt);
      const grabbed = (state.guns[0].pickups ?? 0) - before;
      if (grabbed > 0) {
        trackDaily("powerups", grabbed);
        buzz("power");
      }

      if ((state.phase === "won" || state.phase === "lost") && settleAt === 0) {
        settleAt = now + RESULT_DELAY_MS;
        setHint(state.phase === "won" ? "Nice shot!" : "Ouch — you got broken");
        const won = state.phase === "won";
        recordCpuResult(won);
        noteResult();
        trackDaily("play");
        if (won) {
          const earned = rewardLevel(level, shotsRef.current);
          setReward(earned);
          trackDaily("win");
          if (earned.stars === 3) trackDaily("stars3");
        }
        // No buzz here: the break already vibrated once. The voice waits for the die whistle to finish.
        setTimeout(() => playVoice(won ? "yay" : "wahwah"), won ? 1100 : 1300);
      }

      if (settleAt && now >= settleAt) {
        settleAt = 0;
        if (state.phase === "won") {
          pausedRef.current = true;
          onWinRef.current(state.level);
          setOverlay("win");
        } else if (state.phase === "lost") {
          pausedRef.current = true;
          setOverlay("lose");
        }
      }

      stateRef.current = state;
      if (fitRef.current) picture.value = drawFrame(state, fitRef.current);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [levelId]);

  const replyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(replyTimer.current), []);

  const say = (text: string) => {
    stateRef.current = sayTaunt(stateRef.current, "blue", text);
    needsDrawRef.current = true;
    clearTimeout(replyTimer.current);
    if (Math.random() < 0.45) {
      replyTimer.current = setTimeout(() => {
        const s = stateRef.current;
        if (s.phase !== "playing" || s.guns[1].broken) return;
        const line = CPU_COMEBACKS[Math.floor(Math.random() * CPU_COMEBACKS.length)];
        stateRef.current = sayTaunt(s, "red", line);
        needsDrawRef.current = true;
      }, 1100);
    }
  };

  const fire = () => {
    if (pausedRef.current || promptRef.current !== null) return;
    const prev = stateRef.current;
    stateRef.current = tryShootBlue(prev);
    if (stateRef.current !== prev) {
      shotsRef.current += 1;
      trackDaily("shots");
    }
  };

  const afterAd = (next: () => void) => () => {
    void maybeShowInterstitial().then(next);
  };

  useBack(() => {
    if (overlay === null) openPause();
    else if (overlay === "pause") resume();
    else if (overlay === "sound") setOverlay("pause");
    else afterAd(onBack)();
  });

  const blue = getSkin(skins.blue);
  const red = getSkin(skins.red);
  const isLast = levelId >= LEVELS.length;

  return (
    <View style={styles.root}>
      <View style={styles.hud}>
        <IconButton
          icon="pause"
          size={HUD_BUTTON}
          onPress={openPause}
          accessibilityLabel="Pause"
        />
        <View style={styles.levelPill}>
          <Text style={styles.levelPillTop} numberOfLines={1}>
            <Text style={{ color: tierColor(level.tier) }}>STAGE {levelId}</Text> ·{" "}
            {level.name}
          </Text>
          <Text style={styles.levelPillSub} numberOfLines={1}>
            <Text style={{ color: colors.blue }}>{blue.name}</Text> vs{" "}
            <Text style={{ color: colors.red }}>{red.name}</Text>
          </Text>
        </View>
        <IconButton
          icon="retry"
          size={HUD_BUTTON}
          onPress={restart}
          accessibilityLabel="Restart level"
        />
      </View>

      <View style={styles.stage} onLayout={onLayout}>
        {fit && (
          <Pressable onPressIn={fire} style={StyleSheet.absoluteFill}>
            <Canvas style={StyleSheet.absoluteFill}>
              <Picture picture={picture} />
            </Canvas>
            <ArenaCaption text={hint} fit={fit} />
          </Pressable>
        )}
        {fit && counting && (
          <Countdown
            key={countKey}
            title={`STAGE ${levelId}`}
            subtitle={`${level.name} · break them before they break you`}
            onGo={go}
            onDone={() => setCounting(false)}
          />
        )}
      </View>

      <QuickChat onSay={say} tint={colors.blue} />

      {overlay === "pause" && (
        <Modal title="Paused" subtitle={`Stage ${levelId} · ${level.name}`}>
          <GameButton
            label="Resume"
            icon="play"
            variant="green"
            size="lg"
            onPress={resume}
          />
          <GameButton
            label="Restart"
            icon="retry"
            variant="blue"
            onPress={restart}
          />
          <GameButton
            label="Sound"
            icon="speaker"
            variant="dark"
            onPress={() => setOverlay("sound")}
          />
          <View style={styles.modalRow}>
            <GameButton
              label="Levels"
              icon="levels"
              variant="dark"
              onPress={onBack}
              style={styles.modalHalf}
            />
            <GameButton
              label="Home"
              icon="home"
              variant="dark"
              onPress={onHome}
              style={styles.modalHalf}
            />
          </View>
        </Modal>
      )}

      {overlay === "sound" && (
        <Modal title="Sound" subtitle="Changes save automatically">
          <SoundControls />
          <GameButton
            label="Back"
            icon="back"
            variant="green"
            onPress={() => setOverlay("pause")}
          />
        </Modal>
      )}

      {overlay === "lose" && (
        <Modal title="Broken!" subtitle={`${level.name} got you this time`} ad>
          <GameButton
            label="Try Again"
            icon="retry"
            variant="green"
            size="lg"
            onPress={afterAd(restart)}
          />
          <View style={styles.modalRow}>
            <GameButton
              label="Levels"
              icon="levels"
              variant="dark"
              onPress={afterAd(onBack)}
              style={styles.modalHalf}
            />
            <GameButton
              label="Home"
              icon="home"
              variant="dark"
              onPress={afterAd(onHome)}
              style={styles.modalHalf}
            />
          </View>
        </Modal>
      )}

      {overlay === "win" && (
        <Modal
          title={isLast ? "All Clear!" : "Level Clear!"}
          subtitle={
            isLast ? "You beat every level. Legend." : `${level.name} broken`
          }
          stars={reward?.stars ?? 3}
          ad
        >
          {reward && <RewardLine reward={reward} par={PAR[level.tier]} doubled={doubled} />}
          {reward && !doubled && rewardedReady && (
            <GameButton
              label={`Watch video · double to +${reward.coins * 2}`}
              icon="play"
              variant="gold"
              onPress={async () => {
                if (await showRewarded()) {
                  addCoins(reward.coins);
                  setDoubled(true);
                  playVoice("yay");
                }
              }}
            />
          )}
          {!isLast && onNext && (
            <GameButton
              label="Next Level"
              icon="next"
              variant="green"
              size="lg"
              onPress={afterAd(onNext)}
            />
          )}
          <GameButton
            label="Replay"
            icon="retry"
            variant="blue"
            onPress={afterAd(restart)}
          />
          <View style={styles.modalRow}>
            <GameButton
              label="Levels"
              icon="levels"
              variant="dark"
              onPress={afterAd(onBack)}
              style={styles.modalHalf}
            />
            <GameButton
              label="Home"
              icon="home"
              variant="dark"
              onPress={afterAd(onHome)}
              style={styles.modalHalf}
            />
          </View>
        </Modal>
      )}
    </View>
  );
}

function tierColor(tier: string) {
  return tier === "Easy"
    ? colors.green
    : tier === "Medium"
      ? colors.gold
      : colors.red;
}

function RewardLine({ reward, par, doubled }: { reward: LevelReward; par: number; doubled: boolean }) {
  const used = `${reward.shots} ${reward.shots === 1 ? "shot" : "shots"}`;
  const shots = reward.stars === 3 ? `${used} · Perfect aim!` : `${used} · 3 stars needs ${par} or fewer`;
  return (
    <View style={styles.reward}>
      <View style={styles.coinPill}>
        <CoinDot size={18} />
        <Text style={styles.coinText}>+{doubled ? reward.coins * 2 : reward.coins}</Text>
        {doubled ? (
          <Text style={styles.coinTag}>DOUBLED</Text>
        ) : reward.firstClear ? (
          <Text style={styles.coinTag}>FIRST CLEAR</Text>
        ) : reward.newBest ? (
          <Text style={styles.coinTag}>NEW BEST</Text>
        ) : null}
      </View>
      <Text style={styles.rewardSub}>{shots}</Text>
    </View>
  );
}

/** You hold your equipped gun; the CPU gets a fixed gun per level for variety. */
function levelGuns(levelId: number) {
  return { blue: getWallet().gun, red: gunForSeed(levelId) };
}

export const HUD_BUTTON = 36;

/** Small hint pill floating just inside the arena's bottom edge, so hints cost no screen height. */
export function ArenaCaption({ text, fit }: { text: string; fit: StageFit }) {
  const arenaBottom = (fit.height - ARENA.height * fit.scale) / 2;
  return (
    <View
      style={[styles.caption, { bottom: arenaBottom + ARENA.wall * fit.scale + 6 }]}
      pointerEvents="none"
    >
      <Text style={styles.captionText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

export function Modal({
  title,
  subtitle,
  stars,
  ad,
  children,
}: {
  title: string;
  subtitle: string;
  /** Show the game-over rectangle ad under the card */
  ad?: boolean;
  /** true = three gold stars; a number fills only that many */
  stars?: boolean | number;
  children: ReactNode;
}) {
  const filled = stars === true ? 3 : typeof stars === "number" ? stars : 0;
  const starColor = (i: number) => (i < filled ? colors.gold : "rgba(255, 255, 255, 0.16)");
  return (
    <View style={styles.scrim}>
      <ScrollView
        contentContainerStyle={styles.scrimScroll}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <Panel style={styles.modal}>
          {stars !== undefined && stars !== false && (
            <View style={styles.stars}>
              <Icon name="star" size={34} color={starColor(0)} />
              <View style={styles.starMid}>
                <Icon name="star" size={46} color={starColor(1)} />
              </View>
              <Icon name="star" size={34} color={starColor(2)} />
            </View>
          )}
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalSub}>{subtitle}</Text>
          <View style={styles.modalActions}>{children}</View>
        </Panel>
        {ad && <AdRect />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  reward: {
    alignItems: "center",
    gap: 6,
  },
  coinPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    paddingLeft: 10,
    paddingRight: 14,
    borderRadius: 999,
    backgroundColor: "rgba(255, 207, 63, 0.14)",
    borderWidth: 2,
    borderColor: colors.gold,
  },
  coinText: {
    color: colors.gold,
    fontSize: 20,
    fontWeight: "900",
  },
  coinTag: {
    color: colors.text,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  rewardSub: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  root: {
    flex: 1,
    paddingBottom: 0,
    gap: 4,
  },
  hud: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingTop: 2,
  },
  levelPill: {
    flex: 1,
    marginHorizontal: 10,
    alignItems: "center",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.panelBorder,
  },
  levelPillTop: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 13,
  },
  levelPillSub: {
    color: colors.textFaint,
    fontWeight: "800",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  stage: {
    flex: 1,
  },
  caption: {
    position: "absolute",
    alignSelf: "center",
    maxWidth: "80%",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(21, 17, 46, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
  },
  captionText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(6, 5, 18, 0.78)",
  },
  scrimScroll: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modal: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: "#1c1740",
    borderColor: "rgba(255, 207, 63, 0.35)",
    borderWidth: 2,
  },
  stars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    marginBottom: 6,
  },
  starMid: {
    marginBottom: 8,
  },
  modalTitle: {
    color: colors.gold,
    fontSize: 34,
    fontWeight: "900",
    textShadowColor: colors.goldDark,
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 0,
  },
  modalSub: {
    color: colors.textDim,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
    marginBottom: 18,
  },
  modalActions: {
    alignSelf: "stretch",
    gap: 12,
  },
  modalRow: {
    flexDirection: "row",
    gap: 12,
  },
  modalHalf: {
    flex: 1,
  },
});
