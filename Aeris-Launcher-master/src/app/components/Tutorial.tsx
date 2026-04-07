"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Package, ShoppingBag, Trophy, Settings, X, ChevronRight, ChevronLeft } from "lucide-react";

const STEPS = [
  {
    icon: <Home size={22} />,
    title: "Home",
    description: "Your main hub. See the latest news, the mini item shop preview, daily V-Bucks, and quick access to play.",
    color: "#a78bfa",
  },
  {
    icon: <Package size={22} />,
    title: "Library",
    description: "Import and manage your Fortnite builds. Add a build folder and launch the game directly from here.",
    color: "#60a5fa",
  },
  {
    icon: <ShoppingBag size={22} />,
    title: "Item Shop",
    description: "Browse the current item shop rotation. Items are pulled live from the server.",
    color: "#34d399",
  },
  {
    icon: <Trophy size={22} />,
    title: "Arena Leaderboard",
    description: "See the top Arena players ranked by Hype Points. Your rank is always shown at the bottom.",
    color: "#fbbf24",
  },
  {
    icon: <Settings size={22} />,
    title: "Settings",
    description: "Customize your launcher theme, change your username, manage your account, and more.",
    color: "#f87171",
  },
];

const STORAGE_KEY = "aeris_tutorial_done";

export function Tutorial() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else dismiss();
  };

  const prev = () => setStep(s => Math.max(0, s - 1));

  const current = STEPS[step];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9998] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-sm mx-4 rounded-2xl p-6"
            style={{ background: "#0d0d18", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {/* Close */}
            <button onClick={dismiss}
              className="absolute top-4 right-4 text-white/20 hover:text-white/50 transition-colors">
              <X size={14} />
            </button>

            {/* Step content */}
            <AnimatePresence mode="wait">
              <motion.div key={step}
                initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}
                className="flex flex-col items-center text-center gap-4"
              >
                {/* Icon */}
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: `${current.color}18`, border: `1px solid ${current.color}30`, color: current.color }}>
                  {current.icon}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] mb-1.5" style={{ color: current.color }}>
                    {step + 1} of {STEPS.length}
                  </p>
                  <h2 className="text-white font-black text-xl mb-2">{current.title}</h2>
                  <p className="text-white/40 text-sm leading-relaxed">{current.description}</p>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Dots */}
            <div className="flex items-center justify-center gap-1.5 mt-5">
              {STEPS.map((_, i) => (
                <button key={i} onClick={() => setStep(i)}
                  className="rounded-full transition-all duration-200"
                  style={{
                    width: i === step ? 16 : 5,
                    height: 5,
                    background: i === step ? current.color : "rgba(255,255,255,0.12)",
                  }} />
              ))}
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2 mt-4">
              {step > 0 && (
                <button onClick={prev}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-white/40 hover:text-white/70 transition-colors"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <ChevronLeft size={13} /> Back
                </button>
              )}
              <button onClick={next}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                style={{ background: current.color, color: "#000" }}>
                {step < STEPS.length - 1 ? (
                  <><span>Next</span><ChevronRight size={14} /></>
                ) : (
                  <span>Get Started</span>
                )}
              </button>
            </div>

            {/* Skip */}
            {step < STEPS.length - 1 && (
              <button onClick={dismiss}
                className="w-full text-center text-[10px] text-white/15 hover:text-white/35 transition-colors mt-3">
                Skip tutorial
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
