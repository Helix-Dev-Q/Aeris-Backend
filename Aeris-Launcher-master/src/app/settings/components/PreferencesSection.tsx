"use client";

import { motion } from "framer-motion";
import { useTheme } from "@/app/utils/hooks/theme";
import { useConfigStore } from "@/app/packages/zustand/configs";

function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className="relative w-11 h-6 rounded-full transition-colors duration-200"
      style={{ background: value ? "rgba(124,58,237,0.6)" : "rgba(255,255,255,0.1)" }}
    >
      <motion.div
        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
        animate={{ x: value ? 23 : 4 }}
        transition={{ duration: 0.15 }}
      />
    </button>
  );
}

export function PreferencesSection() {
  const colors = useTheme();
  const { editOnRelease, setEditOnRelease, snowyBackground, setSnowyBackground, soundOnClick, setSoundOnClick } = useConfigStore();

  const prefs = [
    { label: "Edit on Release",  desc: "Enable editing when the game releases",   value: editOnRelease,   onChange: () => setEditOnRelease(!editOnRelease) },
    { label: "Snowy Background", desc: "Show snow particles across the launcher",  value: snowyBackground, onChange: () => setSnowyBackground(!snowyBackground) },
    { label: "Sound on Click",   desc: "Play a click sound on interactions",        value: soundOnClick,    onChange: () => setSoundOnClick(!soundOnClick) },
  ];

  return (
    <div className={`rounded-2xl border ${colors.current.borderColor} overflow-hidden`} style={{ background: "rgba(255,255,255,0.04)" }}>
      <p className="text-xs font-bold uppercase tracking-widest text-white/30 px-5 pt-5 pb-3">Preferences</p>
      {prefs.map(({ label, desc, value, onChange }, i) => (
        <div
          key={label}
          className="flex items-center justify-between px-5 py-4"
          style={{ borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.05)" }}
        >
          <div>
            <p className={`text-sm font-medium ${colors.current.foreground}`}>{label}</p>
            <p className={`text-xs mt-0.5 ${colors.current.foreground2}`}>{desc}</p>
          </div>
          <Toggle value={value} onChange={onChange} />
        </div>
      ))}
    </div>
  );
}
