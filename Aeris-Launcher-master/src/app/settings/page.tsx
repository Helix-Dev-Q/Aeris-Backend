"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Check, LogOut, Palette, SlidersHorizontal,
  Copy, Shield, Clock, Package, Hash, Mail, AlertTriangle,
  ExternalLink, Pencil, ChevronRight, Info,
} from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { invoke } from "@tauri-apps/api/core";
import { useTheme } from "@/app/utils/hooks/theme";
import { useAccent } from "@/app/utils/hooks/accent";
import { useProfileStore } from "@/app/packages/zustand/profile";
import { useConfigStore } from "@/app/packages/zustand/configs";
import { useLibraryStore } from "@/app/packages/zustand/library";
import { themes } from "@/app/css/themes";
import { Config } from "@/app/config/config";

type Tab = "profile" | "appearance" | "preferences" | "about";

function getRoleColor(role: string, alpha: number): string {
  const r = role.toLowerCase();
  if (r.includes("owner"))   return `rgba(255, 100, 50, ${alpha})`;
  if (r.includes("admin"))   return `rgba(255, 60, 60, ${alpha})`;
  if (r.includes("dev") || r.includes("developer")) return `rgba(255, 165, 0, ${alpha})`;
  if (r.includes("mod"))     return `rgba(50, 180, 255, ${alpha})`;
  if (r.includes("staff"))   return `rgba(100, 220, 180, ${alpha})`;
  if (r.includes("vip"))     return `rgba(200, 100, 255, ${alpha})`;
  if (r.includes("booster")) return `rgba(255, 100, 200, ${alpha})`;
  return `rgba(180, 180, 180, ${alpha})`;
}

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "profile",     label: "Profile",     icon: <User size={15} /> },
  { id: "appearance",  label: "Appearance",  icon: <Palette size={15} /> },
  { id: "preferences", label: "Preferences", icon: <SlidersHorizontal size={15} /> },
  { id: "about",       label: "About",       icon: <Info size={15} /> },
];

const SWATCH: Record<string, string> = {
  midnight:"#1e2749", obsidian:"#262626", deepocean:"#0d3a54",
  royalpurple:"#3d1f6b", lavender:"#4d3266", cobalt:"#243a6e",
  arctic:"#1d3847", forest:"#1f4029", matrix:"#153a15",
  ember:"#3d2415", crimson:"#441e2a", cyberpunk:"#2a1a4a",
  synthwave:"#3e1f5c", slate:"#242d38", blackhole:"#111111",
  rose:"#4a1628", gold:"#3d2e00", neon:"#0d2e2e",
  sunset:"#4a2000", ocean:"#003347", sakura:"#4a2233",
  military:"#252e12", ice:"#1a3045", volcanic:"#3d0f00", aurora:"#0f2e38",
};

type ToggleProps = { on: boolean; toggle: () => void; accent: string };
function Toggle({ on, toggle, accent }: ToggleProps) {
  const hex = accent.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) || 124;
  const g = parseInt(hex.substring(2, 4), 16) || 58;
  const b = parseInt(hex.substring(4, 6), 16) || 237;
  return (
    <button onClick={toggle}
      className="relative w-10 h-[22px] rounded-full flex-shrink-0 transition-colors duration-200"
      style={{ background: on ? `rgba(${r},${g},${b},0.85)` : "rgba(255,255,255,0.08)" }}>
      <motion.div
        className="absolute top-[3px] w-4 h-4 rounded-full shadow-md"
        style={{ background: on ? "#fff" : "rgba(255,255,255,0.4)" }}
        animate={{ x: on ? 19 : 3 }}
        transition={{ type: "spring", stiffness: 500, damping: 35 }}
      />
    </button>
  );
}


type PrefRowProps = { label: string; desc: string; on: boolean; toggle: () => void; last?: boolean; accent: string };
function PrefRow({ label, desc, on, toggle, last = false, accent }: PrefRowProps) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5"
      style={{ borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.04)" }}>
      <div>
        <p className="text-sm text-white/85 font-medium leading-none">{label}</p>
        <p className="text-xs text-white/25 mt-1">{desc}</p>
      </div>
      <Toggle on={on} toggle={toggle} accent={accent} />
    </div>
  );
}

type SectionLabelProps = { children: React.ReactNode };
function SectionLabel({ children }: SectionLabelProps) {
  return <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/20 mb-2.5 px-1">{children}</p>;
}

type CardProps = { children: React.ReactNode; className?: string };
function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`rounded-2xl border border-white/[0.05] overflow-hidden ${className}`}
      style={{ background: "rgba(255,255,255,0.025)" }}>
      {children}
    </div>
  );
}


export default function Settings() {
  const [tab, setTab] = useState<Tab>("profile");
  const [showLogout, setShowLogout] = useState(false);
  const [showClearData, setShowClearData] = useState(false);
  const [showChangeUsername, setShowChangeUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameSuccess, setUsernameSuccess] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [bubbleStatus, setBubbleStatus] = useState<"idle" | "downloading" | "done" | "error">("idle");
  const [soundExpanded, setSoundExpanded] = useState(false);

  const BUBBLE_FILES = [
    {
      url: "https://github.com/Wayyz01/Random-Launcher-skidde-with-ai-/raw/refs/heads/main/pakchunkSolarisBubble-WindowsClient.pak",
      name: "pakchunkSolarisBubble-WindowsClient.pak",
    },
    {
      url: "https://github.com/Wayyz01/Random-Launcher-skidde-with-ai-/raw/refs/heads/main/pakchunkSolarisBubble-WindowsClient.sig",
      name: "pakchunkSolarisBubble-WindowsClient.sig",
    },
  ];

  const handleBubbleToggle = async () => {
    const next = !cfg.bubbleBuilds;
    cfg.setBubbleBuilds(next);

    // Find the 9.10 build path from library
    const build910 = Array.from(builds.entries()).find(([, b]) => b.season === "9.10" || b.version?.startsWith("9.10"));
    if (!build910) return;

    const [buildPath] = build910;
    const paksDir = `${buildPath}\\FortniteGame\\Content\\Paks`;

    if (!next) {
      // Remove the files when toggling off
      try {
        for (const file of BUBBLE_FILES) {
          await invoke("delete_file", { path: `${paksDir}\\${file.name}` });
        }
      } catch { /* silently ignore if files don't exist */ }
      return;
    }

    setBubbleStatus("downloading");
    try {
      for (const file of BUBBLE_FILES) {
        await invoke("download", { url: file.url, dest: `${paksDir}\\${file.name}` });
      }
      setBubbleStatus("done");
      setTimeout(() => setBubbleStatus("idle"), 3000);
    } catch {
      setBubbleStatus("error");
      setTimeout(() => setBubbleStatus("idle"), 3000);
    }
  };

  const colors = useTheme();
  const { accent, rgba } = useAccent();
  const profile = useProfileStore();
  const cfg = useConfigStore();
  const builds = useLibraryStore((s) => s.entries);

  // Play a synthesized sound based on the selected option
  const playSound = (type: typeof cfg.soundOption) => {
    try {
      const ctx = new AudioContext();
      const g = ctx.createGain();
      g.connect(ctx.destination);
      const o = ctx.createOscillator();
      o.connect(g);
      switch (type) {
        case "click":
          o.type = "square"; o.frequency.setValueAtTime(1200, ctx.currentTime);
          g.gain.setValueAtTime(0.15, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
          o.start(); o.stop(ctx.currentTime + 0.06); break;
        case "soft":
          o.type = "sine"; o.frequency.setValueAtTime(600, ctx.currentTime);
          g.gain.setValueAtTime(0.1, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
          o.start(); o.stop(ctx.currentTime + 0.1); break;
        case "pop":
          o.type = "sine"; o.frequency.setValueAtTime(800, ctx.currentTime);
          o.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.08);
          g.gain.setValueAtTime(0.2, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
          o.start(); o.stop(ctx.currentTime + 0.08); break;
        case "snap":
          o.type = "sawtooth"; o.frequency.setValueAtTime(2000, ctx.currentTime);
          g.gain.setValueAtTime(0.12, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
          o.start(); o.stop(ctx.currentTime + 0.04); break;
        case "typewriter":
          o.type = "square"; o.frequency.setValueAtTime(400, ctx.currentTime);
          g.gain.setValueAtTime(0.08, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
          o.start(); o.stop(ctx.currentTime + 0.05); break;
      }
    } catch { /* AudioContext not available */ }
  };

  // Use a ref so the listener always reads the latest state without re-registering
  const soundStateRef = useRef({ on: cfg.soundOnClick, option: cfg.soundOption });
  useEffect(() => {
    soundStateRef.current = { on: cfg.soundOnClick, option: cfg.soundOption };
  }, [cfg.soundOnClick, cfg.soundOption]);

  useEffect(() => {
    const handler = () => {
      if (soundStateRef.current.on) playSound(soundStateRef.current.option);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleChangeUsername = async () => {
    if (!profile.accountId) return;
    setUsernameLoading(true);
    setUsernameError(null);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const raw = await invoke<string>("http_patch", {
        url: `${Config.LAUNCHER_API_URL}/api/user/username`,
        body: JSON.stringify({ accountId: profile.accountId, newUsername }),
      });
      const data = JSON.parse(raw);
      if (data.error) {
        setUsernameError(data.error);
      } else {
        profile.setProfile({ displayName: data.displayName, lastUsernameChange: data.lastUsernameChange });
        setUsernameSuccess(true);
        setTimeout(() => { setShowChangeUsername(false); setUsernameSuccess(false); setNewUsername(""); }, 1200);
      }
    } catch (err: unknown) {
      setUsernameError(err instanceof Error ? err.message : "Could not reach the server.");
    } finally {
      setUsernameLoading(false);
    }
  };

  const sessionAge = profile.loginTime ? now - profile.loginTime : null;
  const formatDuration = (ms: number) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <div className={`h-full flex overflow-hidden ${colors.current.background}`}>

      {/* LEFT SIDEBAR */}
      <div className="flex-shrink-0 w-52 flex flex-col py-6 px-3 gap-1"
        style={{ borderRight: "1px solid rgba(255,255,255,0.04)" }}>

        <div className="flex items-center gap-3 px-3 py-3 mb-3 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
            {profile.discordAvatar
              ? <img src={profile.discordAvatar} className="w-full h-full object-cover" alt="" />
              : <User size={16} className="text-white/30" />}
          </div>
          <div className="min-w-0">
            <p className="text-white/90 text-xs font-semibold truncate leading-none">{profile.displayName ?? "Player"}</p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" style={{ boxShadow: "0 0 4px #22c55e" }} />
              <span className="text-[10px] text-green-400/70">Online</span>
              {profile.role && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                  style={{
                    background: getRoleColor(profile.role, 0.15),
                    color: getRoleColor(profile.role, 1),
                    border: `1px solid ${getRoleColor(profile.role, 0.3)}`,
                  }}>
                  {profile.role}
                </span>
              )}
            </div>
          </div>
        </div>

        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
              style={{
                background: active ? rgba(0.08) : "transparent",
                color: active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)",
                border: active ? `1px solid ${rgba(0.15)}` : "1px solid transparent",
              }}>
              {active && (
                <motion.div layoutId="nav-pill"
                  className="absolute inset-0 rounded-xl"
                  style={{ background: rgba(0.06) }}
                  transition={{ duration: 0.2 }} />
              )}
              <span className="relative z-10" style={{ color: active ? accent : "rgba(255,255,255,0.25)" }}>{t.icon}</span>
              <span className="relative z-10">{t.label}</span>
              {active && <ChevronRight size={12} className="relative z-10 ml-auto" style={{ color: rgba(0.4) }} />}
            </button>
          );
        })}

        <div className="mt-auto px-3 pt-4">
          <p className="text-[10px] text-white/15">Made by Wayzz_111</p>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div key={tab}
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.16 }}
            className="h-full overflow-y-auto px-6 py-6">


            {/* PROFILE TAB */}
            {tab === "profile" && (
              <div className="grid grid-cols-2 gap-5 items-start">
                <div className="space-y-4">
                  <div>
                    <SectionLabel>Account Details</SectionLabel>
                    <Card>
                      {([
                        { icon: <Hash size={13} />, label: "Account ID", value: profile.accountId },
                        { icon: <Mail size={13} />, label: "Email", value: profile.email },
                        { icon: <ExternalLink size={13} />, label: "Discord ID", value: profile.discordId },
                      ] as { icon: React.ReactNode; label: string; value: string | null | undefined }[]).map(({ icon, label, value }) => (
                        <div key={label} className="flex items-center justify-between px-5 py-3"
                          style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-white/25 flex-shrink-0">{icon}</span>
                            <div className="min-w-0">
                              <p className="text-[10px] text-white/25 uppercase tracking-wider">{label}</p>
                              <p className="text-xs text-white/70 font-mono truncate mt-0.5">{value ?? "—"}</p>
                            </div>
                          </div>
                          {value && (
                            <button onClick={() => copyToClipboard(value, label)}
                              className="flex-shrink-0 ml-3 p-1.5 rounded-lg transition-all"
                              style={{ background: copied === label ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.05)" }}>
                              {copied === label ? <Check size={11} className="text-green-400" /> : <Copy size={11} className="text-white/30" />}
                            </button>
                          )}
                        </div>
                      ))}
                      <div className="flex items-center justify-between px-5 py-3">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="text-white/25 flex-shrink-0"><Shield size={13} /></span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] text-white/25 uppercase tracking-wider">Password</p>
                            <p className="text-xs text-white/70 font-mono truncate mt-0.5 select-none">
                              {profile.password ? (showPassword ? profile.password : "•".repeat(Math.min(profile.password.length, 16))) : "—"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                          {profile.password && (
                            <>
                              <button onClick={() => setShowPassword((v) => !v)}
                                className="p-1.5 rounded-lg transition-all"
                                style={{ background: showPassword ? rgba(0.15) : "rgba(255,255,255,0.05)" }}>
                                {showPassword ? (
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                                    <line x1="1" y1="1" x2="23" y2="23"/>
                                  </svg>
                                ) : (
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/30">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                    <circle cx="12" cy="12" r="3"/>
                                  </svg>
                                )}
                              </button>
                              <button onClick={() => copyToClipboard(profile.password!, "Password")}
                                className="p-1.5 rounded-lg transition-all"
                                style={{ background: copied === "Password" ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.05)" }}>
                                {copied === "Password" ? <Check size={11} className="text-green-400" /> : <Copy size={11} className="text-white/30" />}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </Card>
                  </div>

                  <div>
                    <SectionLabel>Username</SectionLabel>
                    <Card>
                      <div className="flex items-center justify-between px-5 py-3.5">
                        <div>
                          <p className="text-sm text-white/80 font-medium leading-none">{profile.displayName ?? "—"}</p>
                          <p className="text-xs text-white/25 mt-1">
                            {profile.lastUsernameChange ? `Last changed ${new Date(profile.lastUsernameChange).toLocaleDateString()}` : "Never changed"}
                          </p>
                        </div>
                        <button onClick={() => { setShowChangeUsername(true); setUsernameError(null); setNewUsername(""); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                          style={{ background: rgba(0.1), border: `1px solid ${rgba(0.18)}`, color: accent }}>
                          <Pencil size={11} /> Change
                        </button>
                      </div>
                    </Card>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <SectionLabel>Session</SectionLabel>
                    <Card>
                      <div className="grid grid-cols-2 divide-x divide-white/[0.04]">
                        <div className="px-4 py-4 text-center">
                          <Clock size={14} className="text-white/20 mx-auto mb-1.5" />
                          <p className="text-white font-bold text-sm">{sessionAge ? formatDuration(sessionAge) : "—"}</p>
                          <p className="text-[10px] text-white/25 mt-0.5">Active for</p>
                        </div>
                        <div className="px-4 py-4 text-center">
                          <Package size={14} className="text-white/20 mx-auto mb-1.5" />
                          <p className="text-white font-bold text-sm">{builds.size}</p>
                          <p className="text-[10px] text-white/25 mt-0.5">Builds</p>
                        </div>
                      </div>
                    </Card>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setShowLogout(true)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all duration-150 flex-1 justify-center"
                      style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.12)", color: "rgba(239,68,68,0.7)" }}>
                      <LogOut size={14} /><span className="font-medium">Log Out</span>
                    </button>
                    <button onClick={() => openUrl("https://discord.gg/aerismp")}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all duration-150 flex-1 justify-center"
                      style={{ background: "rgba(88,101,242,0.07)", border: "1px solid rgba(88,101,242,0.15)", color: "rgba(148,155,255,0.75)" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                      </svg>
                      <span className="font-medium">Discord</span>
                    </button>
                  </div>

                  <div>
                    <SectionLabel>Danger Zone</SectionLabel>
                    <Card>
                      <div className="flex items-center justify-between px-5 py-3.5">
                        <div>
                          <p className="text-sm text-white/80 font-medium leading-none">Clear All Data</p>
                          <p className="text-xs text-white/25 mt-1">Wipes all local settings and profile</p>
                        </div>
                        <button onClick={() => setShowClearData(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 transition-all"
                          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
                          <AlertTriangle size={11} /> Clear
                        </button>
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            )}


            {/* APPEARANCE TAB */}
            {tab === "appearance" && (
              <div className="space-y-5">
                <div>
                  <SectionLabel>Theme</SectionLabel>
                  <Card className="p-4">
                    <div className="grid grid-cols-6 gap-3">
                      {Object.keys(themes).map((name) => {
                        const color = SWATCH[name] ?? "#333";
                        const active = cfg.theme === name;
                        return (
                          <button key={name} onClick={() => cfg.setTheme(name)} title={name}
                            className="flex flex-col items-center gap-1.5">
                            <div className="w-8 h-8 rounded-full relative transition-all duration-150 overflow-hidden"
                              style={{
                                backgroundColor: color,
                                backgroundImage: name === "blackhole" ? "url('/blackhole.webp')" : undefined,
                                backgroundSize: "cover", backgroundPosition: "center",
                                outline: active ? `2px solid ${accent}` : "2px solid transparent",
                                outlineOffset: "2px",
                                boxShadow: active ? `0 0 12px ${color}80` : "none",
                                transform: active ? "scale(1.1)" : "scale(1)",
                              }}>
                              {active && (
                                <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.35)" }}>
                                  <Check size={10} className="text-white" strokeWidth={3} />
                                </div>
                              )}
                            </div>
                            <span className="text-[9px] capitalize leading-tight text-center"
                              style={{ color: active ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.18)" }}>
                              {name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </Card>
                </div>

                <div>
                  <SectionLabel>Accent Color</SectionLabel>
                  <Card className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex gap-2 flex-wrap">
                        {["#7c3aed","#3b82f6","#ec4899","#10b981","#f59e0b","#ef4444","#06b6d4","#8b5cf6","#ffffff"].map((c) => {
                          const active = cfg.accentColor === c;
                          return (
                            <button key={c} onClick={() => cfg.setAccentColor(c)}
                              className="w-7 h-7 rounded-full transition-all duration-150 flex-shrink-0"
                              style={{
                                backgroundColor: c,
                                outline: active ? `2px solid ${c}` : "2px solid transparent",
                                outlineOffset: "2px",
                                transform: active ? "scale(1.15)" : "scale(1)",
                                boxShadow: active ? `0 0 10px ${c}80` : "none",
                              }} />
                          );
                        })}
                      </div>
                      <label className="relative cursor-pointer flex-shrink-0" title="Custom color">
                        <div className="w-7 h-7 rounded-full border border-white/20 flex items-center justify-center overflow-hidden"
                          style={{ background: "rgba(255,255,255,0.06)" }}>
                          <span className="text-white/40 text-xs">+</span>
                        </div>
                        <input type="color" value={cfg.accentColor} onChange={(e) => cfg.setAccentColor(e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                      </label>
                    </div>
                    <p className="text-[10px] text-white/20 mt-3">Used for toggles, active states, and highlights</p>
                  </Card>
                </div>

                <div>
                  <SectionLabel>UI Opacity</SectionLabel>
                  <Card className="px-5 py-4">
                    <div className="flex items-center justify-between mb-2.5">
                      <p className="text-sm text-white/85 font-medium">Launcher Opacity</p>
                      <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-md"
                        style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.45)" }}>
                        {Math.round(cfg.uiOpacity * 100)}%
                      </span>
                    </div>
                    <input type="range" min={0.3} max={1} step={0.01} value={cfg.uiOpacity}
                      onChange={(e) => cfg.setUiOpacity(parseFloat(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, rgba(255,255,255,0.5) ${((cfg.uiOpacity - 0.3) / 0.7) * 100}%, rgba(255,255,255,0.08) ${((cfg.uiOpacity - 0.3) / 0.7) * 100}%)`,
                        accentColor: cfg.accentColor,
                      }} />
                    <div className="flex justify-between mt-1.5">
                      <span className="text-[9px] text-white/20">30%</span>
                      <span className="text-[9px] text-white/20">100%</span>
                    </div>
                  </Card>
                </div>

                <div>
                  <SectionLabel>Navbar Blur</SectionLabel>
                  <Card className="px-5 py-4">
                    <div className="flex items-center justify-between mb-2.5">
                      <p className="text-sm text-white/85 font-medium">Backdrop Blur</p>
                      <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-md"
                        style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.45)" }}>
                        {cfg.sidebarBlur}px
                      </span>
                    </div>
                    <input type="range" min={0} max={40} step={1} value={cfg.sidebarBlur}
                      onChange={(e) => cfg.setSidebarBlur(parseInt(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, rgba(255,255,255,0.5) ${(cfg.sidebarBlur / 40) * 100}%, rgba(255,255,255,0.08) ${(cfg.sidebarBlur / 40) * 100}%)`,
                        accentColor: cfg.accentColor,
                      }} />
                    <div className="flex justify-between mt-1.5">
                      <span className="text-[9px] text-white/20">None</span>
                      <span className="text-[9px] text-white/20">40px</span>
                    </div>
                  </Card>
                </div>

                <div>
                  <SectionLabel>Animation Speed</SectionLabel>
                  <Card className="p-1.5">
                    <div className="grid grid-cols-3 gap-1">
                      {(["none", "normal", "fast"] as const).map((speed) => {
                        const active = cfg.animationSpeed === speed;
                        return (
                          <button key={speed} onClick={() => cfg.setAnimationSpeed(speed)}
                            className="py-2 rounded-xl text-xs font-medium capitalize transition-all duration-150"
                            style={{
                              background: active ? `${cfg.accentColor}20` : "transparent",
                              color: active ? "#fff" : "rgba(255,255,255,0.3)",
                              border: active ? `1px solid ${cfg.accentColor}35` : "1px solid transparent",
                            }}>
                            {speed}
                          </button>
                        );
                      })}
                    </div>
                  </Card>
                </div>

                <div>
                  <SectionLabel>Effects</SectionLabel>
                  <Card>
                    <PrefRow label="Glossy Background" desc="Animated gradient overlay" on={cfg.glossyBackground} toggle={() => cfg.setGlossyBackground(!cfg.glossyBackground)} accent={accent} />
                    <PrefRow label="Snow Effect" desc="Falling snow particles" on={cfg.snowyBackground} toggle={() => cfg.setSnowyBackground(!cfg.snowyBackground)} accent={accent} />
                    <PrefRow label="Hide Window Buttons" desc="Remove minimize & close buttons" on={cfg.hideTitlebarButtons} toggle={() => cfg.setHideTitlebarButtons(!cfg.hideTitlebarButtons)} last accent={accent} />
                  </Card>
                </div>
              </div>
            )}


            {/* PREFERENCES TAB */}
            {tab === "preferences" && (
              <div className="max-w-sm space-y-5">
                <div>
                  <SectionLabel>Launcher</SectionLabel>
                  <Card>
                    <PrefRow label="Minimize on Launch" desc="Hide launcher when starting a game" on={cfg.minimizeOnLaunch} toggle={() => cfg.setMinimizeOnLaunch(!cfg.minimizeOnLaunch)} accent={accent} />
                    <PrefRow label="Edit on Release" desc="Cleaner and quicker editing" on={cfg.editOnRelease} toggle={() => cfg.setEditOnRelease(!cfg.editOnRelease)} last accent={accent} />
                  </Card>
                </div>
                <div>
                  <SectionLabel>Mods</SectionLabel>
                  <Card>
                    <div className="flex items-center justify-between px-5 py-3.5">
                      <div>
                        <p className="text-sm text-white/85 font-medium leading-none">Bubble Builds</p>
                        <p className="text-xs text-white/25 mt-1">
                          {bubbleStatus === "downloading" ? "Downloading paks..." :
                           bubbleStatus === "done" ? "Paks installed!" :
                           bubbleStatus === "error" ? "Download failed — check your 9.10 build" :
                           "Download Bubble Builds!"}
                        </p>
                      </div>
                      <Toggle on={cfg.bubbleBuilds} toggle={handleBubbleToggle} accent={accent} />
                    </div>
                  </Card>
                </div>
                <div>
                  <SectionLabel>Audio & Performance</SectionLabel>
                  <Card>
                    {/* Sound on Click with expandable options */}
                    <div>
                      <div
                        className="flex items-center justify-between px-5 py-3.5 cursor-pointer select-none"
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                        onClick={() => setSoundExpanded(v => !v)}
                      >
                        <div>
                          <p className="text-sm text-white/85 font-medium leading-none">Sound on Click</p>
                          <p className="text-xs text-white/25 mt-1">
                            {cfg.soundOnClick ? `Active — ${cfg.soundOption}` : "UI interaction sounds"}
                          </p>
                        </div>
                        <motion.div
                          animate={{ rotate: soundExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white/40">
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </motion.div>
                      </div>
                      <AnimatePresence>
                        {soundExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            style={{ overflow: "hidden" }}
                          >
                            <div className="px-4 py-3 space-y-1" style={{ background: "rgba(0,0,0,0.15)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                              {/* Off option */}
                              {([
                                { id: "off",        label: "Off",        desc: "No sound" },
                                { id: "click",      label: "Click",      desc: "Sharp mechanical click" },
                                { id: "soft",       label: "Soft",       desc: "Gentle muted tap" },
                                { id: "pop",        label: "Pop",        desc: "Bubbly pop sound" },
                                { id: "snap",       label: "Snap",       desc: "Crisp snap" },
                                { id: "typewriter", label: "Typewriter", desc: "Classic key press" },
                              ] as { id: string; label: string; desc: string }[]).map((opt) => {
                                const active = opt.id === "off" ? !cfg.soundOnClick : (cfg.soundOnClick && cfg.soundOption === opt.id);
                                return (
                                  <button
                                    key={opt.id}
                                    onClick={() => {
                                      if (opt.id === "off") {
                                        cfg.setSoundOnClick(false);
                                      } else {
                                        cfg.setSoundOnClick(true);
                                        cfg.setSoundOption(opt.id as typeof cfg.soundOption);
                                        playSound(opt.id as typeof cfg.soundOption);
                                      }
                                    }}
                                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all"
                                    style={{
                                      background: active ? rgba(0.1) : "transparent",
                                      border: `1px solid ${active ? rgba(0.2) : "transparent"}`,
                                    }}
                                  >
                                    <div className="text-left">
                                      <p className="text-xs font-semibold" style={{ color: active ? accent : "rgba(255,255,255,0.6)" }}>{opt.label}</p>
                                      <p className="text-[10px] text-white/25 mt-0.5">{opt.desc}</p>
                                    </div>
                                    {active && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: accent }} />}
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <PrefRow label="Show FPS" desc="Overlay FPS counter" on={cfg.showFPS} toggle={() => cfg.setShowFPS(!cfg.showFPS)} accent={accent} />
                    <div className="px-5 py-4">
                      <div className="flex items-center justify-between mb-2.5">
                        <div>
                          <p className="text-sm text-white/85 font-medium leading-none">FPS Multiplier</p>
                          <p className="text-xs text-white/25 mt-1">Fake FPS boost shown in overlay</p>
                        </div>
                        <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-md"
                          style={{ background: rgba(0.15), color: accent }}>
                          {cfg.fpsMultiplier}x
                        </span>
                      </div>
                      <input type="range" min={1} max={10} step={0.5} value={cfg.fpsMultiplier}
                        onChange={(e) => cfg.setFpsMultiplier(parseFloat(e.target.value))}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, ${accent} ${((cfg.fpsMultiplier - 1) / 9) * 100}%, rgba(255,255,255,0.08) ${((cfg.fpsMultiplier - 1) / 9) * 100}%)`,
                          accentColor: accent,
                        }} />
                      <div className="flex justify-between mt-1.5">
                        <span className="text-[9px] text-white/20">1x</span>
                        <span className="text-[9px] text-white/20">10x</span>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* ABOUT TAB */}
            {tab === "about" && (
              <div className="grid grid-cols-2 gap-5 items-start">
                <Card className="p-6 text-center">
                  <img
                    src="https://s1.directupload.eu/images/260323/jdkj2sxv.png"
                    alt="Aeris Logo"
                    className="w-20 h-20 rounded-2xl mx-auto mb-4 object-cover"
                  />
                  <p className="text-white font-bold text-base mb-3">Project Aeris</p>
                  <p className="text-white/40 text-xs leading-relaxed">
                    Hi, thanks for playing Aeris. This Launcher was Made by wayzz_111 and Helix! Backend creds to Wayzz_111.
                  </p>
                </Card>

                <div className="space-y-4">
                  <Card className="p-5">
                    <div className="flex items-center gap-4">
                      <img
                        src="https://s1.directupload.eu/images/260323/jdkj2sxv.png"
                        alt="Aeris Logo"
                        className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                      />
                      <div>
                        <p className="text-white font-semibold text-sm leading-none">AerisMP Launcher</p>
                        <p className="text-white/30 text-xs mt-1.5 font-mono">Version 1.0.2</p>
                      </div>
                      <div className="ml-auto flex-shrink-0 px-2.5 py-1 rounded-full"
                        style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
                        <span className="text-[10px] font-medium text-green-400">Stable</span>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-5">
                    <SectionLabel>Credits</SectionLabel>
                    <div className="space-y-3 mt-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-white/50">Launcher</p>
                        <p className="text-xs text-white/90 font-medium">wayzz_111 & Helix</p>
                      </div>
                      <div className="flex items-center justify-between pt-3"
                        style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                        <p className="text-xs text-white/50">Backend</p>
                        <p className="text-xs text-white/90 font-medium">Wayzz_111</p>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>


      {/* CHANGE USERNAME MODAL */}
      <AnimatePresence>
        {showChangeUsername && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="rounded-2xl p-6 w-80 border border-white/[0.07] shadow-2xl"
              style={{ background: "rgba(12,12,16,0.98)" }}
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }} transition={{ duration: 0.15 }}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: rgba(0.1), border: `1px solid ${rgba(0.18)}` }}>
                  <Pencil size={14} style={{ color: accent }} />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Change Username</p>
                  <p className="text-white/30 text-xs mt-0.5">
                    {profile.usernameBypass ? "No cooldown — privileged role" : "Once per week · 3–24 chars"}
                  </p>
                </div>
              </div>
              <input type="text" value={newUsername}
                onChange={(e) => { setNewUsername(e.target.value); setUsernameError(null); }}
                onKeyDown={(e) => e.key === "Enter" && !usernameLoading && handleChangeUsername()}
                placeholder={profile.displayName ?? "New username"} maxLength={24}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-white/20 outline-none mb-3"
                style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${usernameError ? "rgba(239,68,68,0.4)" : rgba(0.15)}` }} />
              {usernameError && <p className="text-xs text-red-400 mb-3 px-1">{usernameError}</p>}
              <div className="flex gap-2">
                <button onClick={() => { setShowChangeUsername(false); setUsernameError(null); setNewUsername(""); }}
                  className="flex-1 py-2 rounded-xl text-sm text-white/60 hover:text-white transition-colors"
                  style={{ background: "rgba(255,255,255,0.06)" }}>Cancel</button>
                <button onClick={handleChangeUsername}
                  disabled={usernameLoading || usernameSuccess || !newUsername.trim()}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold text-white transition-all"
                  style={{ background: usernameSuccess ? "rgba(34,197,94,0.8)" : rgba(0.8), opacity: (!newUsername.trim() || usernameLoading) ? 0.5 : 1 }}>
                  {usernameSuccess ? "Done!" : usernameLoading ? "Saving..." : "Save"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CLEAR DATA MODAL */}
      <AnimatePresence>
        {showClearData && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="rounded-2xl p-6 w-72 border border-white/[0.07] text-center shadow-2xl"
              style={{ background: "rgba(12,12,16,0.98)" }}
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }} transition={{ duration: 0.15 }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.18)" }}>
                <AlertTriangle size={16} className="text-red-400" />
              </div>
              <p className="text-white font-bold mb-1.5">Clear all data?</p>
              <p className="text-white/30 text-sm mb-6 leading-relaxed">This wipes your profile, settings, and session. Cannot be undone.</p>
              <div className="flex gap-2">
                <button onClick={() => setShowClearData(false)}
                  className="flex-1 py-2 rounded-xl text-sm text-white/60 hover:text-white transition-colors"
                  style={{ background: "rgba(255,255,255,0.06)" }}>Cancel</button>
                <button onClick={() => { setShowClearData(false); profile.clearAllData?.(); }}
                  className="flex-1 py-2 rounded-xl text-sm bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors">Clear</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LOGOUT MODAL */}
      <AnimatePresence>
        {showLogout && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="rounded-2xl p-6 w-72 border border-white/[0.07] text-center shadow-2xl"
              style={{ background: "rgba(12,12,16,0.98)" }}
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }} transition={{ duration: 0.15 }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.18)" }}>
                <LogOut size={16} className="text-red-400" />
              </div>
              <p className="text-white font-bold mb-1.5">Log out?</p>
              <p className="text-white/30 text-sm mb-6 leading-relaxed">You will be returned to the login screen.</p>
              <div className="flex gap-2">
                <button onClick={() => setShowLogout(false)}
                  className="flex-1 py-2 rounded-xl text-sm text-white/60 hover:text-white transition-colors"
                  style={{ background: "rgba(255,255,255,0.06)" }}>Cancel</button>
                <button onClick={() => { setShowLogout(false); profile.logout(); }}
                  className="flex-1 py-2 rounded-xl text-sm bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors">Log Out</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
