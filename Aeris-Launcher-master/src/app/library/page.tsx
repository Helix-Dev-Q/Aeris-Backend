"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Loader2, Trash2, Play, Pause, Lock, FolderOpen, Package, AlertTriangle } from "lucide-react";
import { useAccent } from "../utils/hooks/accent";
import { useTheme } from "../utils/hooks/theme";
import { useLibraryStore } from "../packages/zustand/library";
import { handleAddBuild } from "../utils/build/import";
import { SeasonInfo } from "../utils/Season";
import { Config } from "../config/config";
import { start } from "../utils/build/launch";
import { exit } from "../utils/build/close";
import { openPath } from "@tauri-apps/plugin-opener";

export default function Library() {
  const entries = useLibraryStore((s) => s.entries);
  const builds = Array.from(entries.entries());
  const wipe = useLibraryStore((s) => s.wipe);
  const remove = useLibraryStore((s) => s.delete);
  const [importing, setImporting] = useState(false);
  const [showWipe, setShowWipe] = useState(false);
  const [selected, setSelected] = useState<string | null>(builds[0]?.[0] ?? null);
  const { accent, rgba } = useAccent();
  const { current: themeColors } = useTheme();
  const currentVersion = Config.CURRENT_VERSION;
  const selectedBuild = selected ? entries.get(selected) : null;
  const isPlayable = selectedBuild?.season === currentVersion;

  function startImport() {
    setImporting(true);
    handleAddBuild().finally(() => setImporting(false));
  }

  async function handleLaunch() {
    if (!selected || !isPlayable) return;
    if (selectedBuild?.open) await exit(selected);
    else await start(selected);
  }

  const heroInfo = selectedBuild ? SeasonInfo(selectedBuild.version.split(".")[0]) : null;

  return (
    <div className="h-full flex flex-col overflow-hidden relative">

      {/* ── HERO ── */}
      <div className="relative flex-shrink-0" style={{ height: "52%" }}>
        <AnimatePresence mode="sync">
          {heroInfo ? (
            <motion.div key={selected} className="absolute inset-0"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}>
              <img src={heroInfo.image} alt="" className="w-full h-full object-cover object-center" />
              {/* vignettes */}
              <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, transparent 35%, rgba(0,0,0,0.6) 75%, rgba(8,8,14,1) 100%)" }} />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(0,0,0,0.5) 0%, transparent 50%)" }} />
            </motion.div>
          ) : (
            <div className={`absolute inset-0 ${themeColors.background}`} />
          )}
        </AnimatePresence>

        {/* Hero content */}
        <div className="absolute inset-0 flex flex-col justify-end px-7 pb-5 z-10">
          {selectedBuild && heroInfo ? (
            <AnimatePresence mode="wait">
              <motion.div key={selected}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
                <h1 className="text-[32px] font-black text-white leading-none tracking-tight mb-1 drop-shadow-lg">
                  {heroInfo.readableSeason}
                </h1>
                <p className="text-white/30 text-xs font-mono mb-4">
                  Fortnite++Release+{selectedBuild.season}
                </p>
                <p className="text-white/40 text-[11px] leading-relaxed mb-5 max-w-sm line-clamp-2">
                  {heroInfo.description}
                </p>

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  <button onClick={handleLaunch} disabled={!isPlayable}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all"
                    style={{
                      background: !isPlayable ? "rgba(255,255,255,0.06)" : selectedBuild.open ? "rgba(239,68,68,0.9)" : "#fff",
                      color: !isPlayable ? "rgba(255,255,255,0.2)" : selectedBuild.open ? "#fff" : "#08080e",
                      cursor: !isPlayable ? "not-allowed" : "pointer",
                      boxShadow: !isPlayable ? "none" : selectedBuild.open ? "0 6px 28px rgba(239,68,68,0.4)" : "0 6px 28px rgba(255,255,255,0.22)",
                    }}>
                    {!isPlayable ? <Lock size={13} /> : selectedBuild.open ? <Pause size={13} /> : <Play size={13} fill="currentColor" />}
                    {!isPlayable ? "Locked" : selectedBuild.open ? "Stop" : "Play Now"}
                  </button>
                  <button onClick={() => openPath(selectedBuild.path)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white/50 hover:text-white transition-all"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.09)" }}>
                    <FolderOpen size={13} />
                    Folder
                  </button>
                  <button onClick={() => { remove(selected!); setSelected(builds.find(([p]) => p !== selected)?.[0] ?? null); }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.12)", color: "rgba(248,113,113,0.6)" }}
                    onMouseEnter={e => { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.background = "rgba(239,68,68,0.14)"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "rgba(248,113,113,0.6)"; e.currentTarget.style.background = "rgba(239,68,68,0.07)"; }}>
                    <Trash2 size={13} />
                    Remove
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <Package size={20} className="text-white/20" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white mb-1">Your Library</h2>
                <p className="text-white/30 text-sm">Import a build to get started.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── BUILDS GRID ── */}
      <div className={`flex-1 overflow-hidden flex flex-col ${themeColors.background}`}>
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 pt-4 pb-3 flex-shrink-0">
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white/20">
            {entries.size} {entries.size === 1 ? "Build" : "Builds"}
          </p>
          <div className="flex items-center gap-1.5">
            <button onClick={startImport} disabled={importing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ background: rgba(0.12), border: `1px solid ${rgba(0.22)}`, color: accent }}>
              {importing ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
              Import Build
            </button>
            {entries.size > 0 && (
              <button onClick={() => setShowWipe(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-400/40 hover:text-red-400 transition-colors"
                style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.08)" }}>
                <Trash2 size={11} />
              </button>
            )}
          </div>
        </div>

        {/* Cards */}
        <div className="flex-1 overflow-y-auto px-6 pb-5 pt-1">
          {builds.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <Package size={20} className="text-white/15" />
              </div>
              <p className="text-white/20 text-sm">No builds imported yet.</p>
            </div>
          ) : (
            <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}>
              {builds.map(([bPath, build]) => {
                const info = SeasonInfo(build.version.split(".")[0]);
                const active = selected === bPath;
                const playable = build.season === currentVersion;
                return (
                  <motion.button key={bPath} onClick={() => setSelected(bPath)}
                    whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="relative rounded-xl overflow-hidden text-left group"
                    style={{
                      aspectRatio: "3/4",
                      boxShadow: active ? `0 0 0 2px ${accent}` : "0 0 0 2px transparent",
                    }}>
                    {/* BG image */}
                    <img src={info.image} alt={info.readableSeason}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    {/* Overlay */}
                    <div className="absolute inset-0"
                      style={{ background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.1) 55%, transparent 100%)" }} />
                    {/* Active tint */}
                    {active && (
                      <div className="absolute inset-0" style={{ background: `${rgba(0.12)}` }} />
                    )}

                    {/* Status dot */}
                    <div className="absolute top-2 right-2 flex gap-1">
                      {build.open && (
                        <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"
                          style={{ boxShadow: "0 0 6px #f87171" }} />
                      )}
                      {!playable && (
                        <span className="w-2 h-2 rounded-full"
                          style={{ background: "rgba(255,255,255,0.2)" }} />
                      )}
                      {playable && !build.open && (
                        <span className="w-2 h-2 rounded-full bg-green-400"
                          style={{ boxShadow: "0 0 6px #4ade80" }} />
                      )}
                    </div>

                    {/* Bottom label */}
                    <div className="absolute inset-x-0 bottom-0 p-2.5">
                      <p className="text-white font-black text-[11px] leading-tight truncate">
                        {info.readableSeason}
                      </p>
                      <p className="text-white/30 text-[9px] font-mono mt-0.5 truncate">
                        v{build.version}
                      </p>
                    </div>

                    {/* Hover play overlay */}
                    {playable && !build.open && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center"
                          style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(6px)" }}>
                          <Play size={14} fill="white" className="text-white ml-0.5" />
                        </div>
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── WIPE CONFIRM ── */}
      <AnimatePresence>
        {showWipe && (
          <div className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(10px)" }}>
            <motion.div initial={{ y: 16, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 16, opacity: 0, scale: 0.95 }} transition={{ duration: 0.18 }}
              className="rounded-2xl p-6 w-72 text-center shadow-2xl"
              style={{ background: "rgba(10,10,16,0.98)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <AlertTriangle size={18} className="text-red-400" />
              </div>
              <p className="text-white font-bold mb-1">Wipe all builds?</p>
              <p className="text-white/30 text-sm mb-5">This cannot be undone.</p>
              <div className="flex gap-2">
                <button onClick={() => setShowWipe(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm text-white/50 hover:text-white transition-colors"
                  style={{ background: "rgba(255,255,255,0.06)" }}>Cancel</button>
                <button onClick={() => { wipe(); setShowWipe(false); setSelected(null); }}
                  className="flex-1 py-2.5 rounded-xl text-sm bg-red-600 hover:bg-red-500 text-white font-bold transition-colors">
                  Wipe All
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
