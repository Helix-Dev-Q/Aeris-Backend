"use client";

import { JSX, useEffect, useState } from "react";
import { Sidebar } from "./components/sidebar";
import SessionManager from "./components/SessionManager";
import { GlossyBackground } from "./components/GlossyBackground";
import { VideoBackground } from "./components/VideoBackground";
import { Tutorial } from "./components/Tutorial";
import type { View } from "./utils/types/views";
import Home from "./home/page";
import Library from "./library/page";
import Shop from "./shop/page";
import Settings from "./settings/page";
import Leaderboard from "./leaderboard/page";
import { AnimatePresence, motion } from "framer-motion";
import { useProfileStore } from "./packages/zustand/profile";
import { useRouter } from "next/navigation";
import { useConfigStore } from "./packages/zustand/configs";
import { useTheme } from "./utils/hooks/theme";
import { useNavStore } from "./packages/zustand/nav";

export default function App() {
  const [view, setView] = useState<View>("home");
  const router = useRouter();
  const { animationSpeed } = useConfigStore();
  const { current: themeColors } = useTheme();
  const { pendingView, clearPending } = useNavStore();
  const { accountId, displayName, hydrated } = useProfileStore();
  const validSession = useProfileStore((s) => s.validSession)();
  const [prevView, setPrevView] = useState<View>("home");

  useEffect(() => {
    if (pendingView) { handleSetView(pendingView); clearPending(); }
  }, [pendingView]);

  useEffect(() => {
    if (!hydrated) return;
    if (!validSession) router.replace("/auth");
  }, [accountId, displayName, validSession, hydrated, router]);

  const NAV_ORDER: View[] = ["home", "library", "shop", "leaderboard", "settings"];
  const slideDir = NAV_ORDER.indexOf(view) >= NAV_ORDER.indexOf(prevView) ? 1 : -1;
  const handleSetView = (v: View) => { setPrevView(view); setView(v); };
  const dur = animationSpeed === "none" ? 0 : animationSpeed === "fast" ? 0.1 : 0.22;

  const views: Record<View, JSX.Element> = {
    home: <Home />,
    library: <Library />,
    shop: <Shop />,
    leaderboard: <Leaderboard />,
    settings: <Settings />,
  };

  return (
    <div className={`h-full w-full relative overflow-hidden ${themeColors.background}`}>

      {/* Only render if session is valid */}
      {validSession && (
        <>
          <VideoBackground />
          <SessionManager />
          <Tutorial />
          <Sidebar view={view} setView={handleSetView} />
          <div className="absolute inset-0" style={{ top: "76px", zIndex: 2 }}>
            <GlossyBackground />
            <AnimatePresence mode="wait" custom={slideDir}>
              <motion.div
                key={view}
                custom={slideDir}
                variants={{
                  enter: (d: number) => ({ x: d * 30, opacity: 0 }),
                  center: { x: 0, opacity: 1 },
                  exit:  (d: number) => ({ x: d * -30, opacity: 0 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: dur, ease: [0.32, 0, 0.67, 0] }}
                className="absolute w-full h-full"
              >
                {views[view]}
              </motion.div>
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}
