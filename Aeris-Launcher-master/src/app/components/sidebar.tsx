"use client";

import { useEffect, useState } from "react";
import { Home, Package, ShoppingBag, Settings, User, Trophy } from "lucide-react";
import { View } from "@/app/utils/types/views";
import { useProfileStore } from "@/app/packages/zustand/profile";
import { useAccent } from "@/app/utils/hooks/accent";
import { useConfigStore } from "@/app/packages/zustand/configs";
import { useTheme } from "@/app/utils/hooks/theme";
import { Config } from "@/app/config/config";
import { motion } from "framer-motion";

const NAV = [
  { id: "home"        as View, Icon: Home,        label: "Home"        },
  { id: "library"     as View, Icon: Package,     label: "Library"     },
  { id: "shop"        as View, Icon: ShoppingBag, label: "Shop"        },
  { id: "leaderboard" as View, Icon: Trophy,      label: "Leaderboard" },
];

export function Sidebar({ view, setView }: { view: View; setView: (v: View) => void }) {
  const profile = useProfileStore();
  const { sidebarBlur } = useConfigStore();
  const { accent, rgba } = useAccent();
  const { current: themeColors } = useTheme();
  const [avatar, setAvatar] = useState<string | null>(profile.discordAvatar || null);

  useEffect(() => {
    if (!profile.accountId || profile.accountId === "unknown") return;
    fetch(`${Config.LAUNCHER_API_URL}/api/user/profile/${profile.accountId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.discordAvatar) setAvatar(d.discordAvatar); })
      .catch(() => {});
  }, [profile.accountId]);

  return (
    <nav
      className={`absolute left-0 right-0 z-[201] flex items-center px-4 ${themeColors.background}`}
      style={{
        top: "32px", // below titlebar (h-8)
        height: "44px",
        backdropFilter: `blur(${sidebarBlur}px)`,
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
      data-tauri-drag-region
    >
      {/* Logo + name */}
      <div className="flex items-center gap-2.5 flex-shrink-0 mr-6 pointer-events-none">
        <div
          className="w-6 h-6 rounded-lg overflow-hidden flex-shrink-0"
          style={{ boxShadow: `0 0 10px ${rgba(0.3)}` }}
        >
          <img src="/AerisMP.png" alt="Logo" className="w-full h-full object-contain" />
        </div>
        <span
          className="text-[11px] font-bold tracking-wide"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          {Config.NAME}
        </span>
      </div>

      {/* Nav tabs */}
      <div className="flex items-center gap-0.5 flex-1 pointer-events-auto">
        {NAV.map(({ id, Icon, label }) => {
          const active = view === id;
          return (
            <button
              key={id}
              onClick={() => setView(id)}
              className="relative flex items-center gap-2 px-3.5 h-8 rounded-lg text-[11px] font-semibold transition-all duration-150"
              style={{
                color: active ? "#fff" : "rgba(255,255,255,0.3)",
                background: active ? rgba(0.1) : "transparent",
              }}
            >
              {active && (
                <motion.div
                  layoutId="topnav-pill"
                  className="absolute inset-0 rounded-lg"
                  style={{ background: rgba(0.1), border: `1px solid ${rgba(0.18)}` }}
                  transition={{ type: "spring", stiffness: 420, damping: 36 }}
                />
              )}
              <Icon size={12} className="relative z-10 flex-shrink-0" style={{ color: active ? accent : "rgba(255,255,255,0.28)" }} />
              <span className="relative z-10">{label}</span>
              {active && (
                <span
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-[2px] rounded-full"
                  style={{ background: accent }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Right: settings + avatar */}
      <div className="flex items-center gap-2 flex-shrink-0 pointer-events-auto">
        <button
          onClick={() => setView("settings")}
          className="relative flex items-center gap-2 px-3 h-8 rounded-lg text-[11px] font-semibold transition-all duration-150"
          style={{
            color: view === "settings" ? "#fff" : "rgba(255,255,255,0.3)",
            background: view === "settings" ? rgba(0.1) : "transparent",
          }}
        >
          {view === "settings" && (
            <motion.div
              layoutId="topnav-pill"
              className="absolute inset-0 rounded-lg"
              style={{ background: rgba(0.1), border: `1px solid ${rgba(0.18)}` }}
              transition={{ type: "spring", stiffness: 420, damping: 36 }}
            />
          )}
          <Settings size={12} className="relative z-10" style={{ color: view === "settings" ? accent : "rgba(255,255,255,0.28)" }} />
          <span className="relative z-10">Settings</span>
          {view === "settings" && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-[2px] rounded-full" style={{ background: accent }} />
          )}
        </button>

        {/* Divider */}
        <div className="w-px h-4" style={{ background: "rgba(255,255,255,0.07)" }} />

        {/* Avatar */}
        <button
          onClick={() => setView("settings")}
          className="flex items-center gap-2 px-1.5 h-8 rounded-lg transition-all duration-150 hover:bg-white/5"
        >
          <div
            className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0"
            style={{ border: `1px solid ${rgba(0.25)}` }}
          >
            {avatar
              ? <img src={avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={() => setAvatar(null)} />
              : <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <User size={11} className="text-white/20" />
                </div>
            }
          </div>
          <span className="text-[11px] font-semibold text-white/50 max-w-[80px] truncate">
            {profile.displayName ?? "Player"}
          </span>
        </button>
      </div>
    </nav>
  );
}
