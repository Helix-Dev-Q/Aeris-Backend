"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProfileStore } from "@/app/packages/zustand/profile";
import { Copy, Check, Eye, EyeOff, Terminal, X } from "lucide-react";
interface CommandResult {
  type: "info";
  data: Record<string, { value: string; sensitive?: boolean }>;
}

function parseCommand(input: string, profile: ReturnType<typeof useProfileStore.getState>): CommandResult | { type: "error"; message: string } | null {
  const cmd = input.trim().toLowerCase();
  if (cmd === "/info") {
    const created = profile.loginTime
      ? new Date(profile.loginTime).toLocaleString()
      : "Unknown";
    return {
      type: "info",
      data: {
        Username:   { value: profile.displayName ?? "—" },
        Email:      { value: profile.email ?? "—" },
        Password:   { value: profile.password ?? "—", sensitive: true },
        "Account ID": { value: profile.accountId ?? "—" },
        "Session Started": { value: created },
      },
    };
  }
  return { type: "error", message: `Unknown command: ${input}` };
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("/");
  const [result, setResult] = useState<ReturnType<typeof parseCommand>>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const profile = useProfileStore();

  // Open on "/" keypress when not in an input
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "/" && !open) {
        e.preventDefault();
        setOpen(true);
        setInput("/");
        setResult(null);
        setRevealed({});
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = parseCommand(input, useProfileStore.getState());
    setResult(r);
    setRevealed({});
  };

  const copy = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9998] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: "rgba(12,12,16,0.98)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {/* Input bar */}
            <form onSubmit={submit} className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
              <Terminal size={14} className="text-white/30 flex-shrink-0" />
              <input
                ref={inputRef}
                value={input}
                onChange={e => {
                  setInput(e.target.value);
                  setResult(null);
                }}
                onKeyDown={e => e.key === "Escape" && setOpen(false)}
                className="flex-1 bg-transparent text-white text-sm font-mono outline-none placeholder-white/20"
                placeholder="/command"
                spellCheck={false}
              />
              <button type="button" onClick={() => setOpen(false)}>
                <X size={14} className="text-white/20 hover:text-white/50 transition-colors" />
              </button>
            </form>

            {/* Suggestions when no result yet */}
            {!result && (
              <div className="px-4 py-2">
                <button
                  type="button"
                  onClick={() => { setInput("/info"); setResult(parseCommand("/info", useProfileStore.getState())); }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors hover:bg-white/5"
                >
                  <span className="text-xs font-mono text-white/50">/info</span>
                  <span className="text-xs text-white/25">View your account details</span>
                </button>
              </div>
            )}

            {/* Result */}
            <AnimatePresence mode="wait">
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="px-4 pb-4 pt-2"
                >
                  {result.type === "error" ? (
                    <p className="text-red-400 text-xs font-mono px-3 py-2">{result.message}</p>
                  ) : result.type === "info" ? (
                    <div className="rounded-xl overflow-hidden border border-white/[0.06]" style={{ background: "rgba(255,255,255,0.02)" }}>
                      {Object.entries(result.data).map(([key, { value, sensitive }], i, arr) => {
                        const isRevealed = revealed[key];
                        const display = sensitive && !isRevealed
                          ? "•".repeat(Math.min(value.length, 18))
                          : value;
                        return (
                          <div
                            key={key}
                            className="flex items-center justify-between px-4 py-2.5"
                            style={{ borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
                          >
                            <div className="min-w-0">
                              <p className="text-[10px] text-white/25 uppercase tracking-wider">{key}</p>
                              <p className="text-xs text-white/80 font-mono mt-0.5 truncate select-none">{display}</p>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                              {sensitive && (
                                <button
                                  onClick={() => setRevealed(r => ({ ...r, [key]: !r[key] }))}
                                  className="p-1.5 rounded-lg transition-all hover:bg-white/8"
                                  title={isRevealed ? "Hide" : "Reveal"}
                                >
                                  {isRevealed
                                    ? <EyeOff size={11} className="text-white/40" />
                                    : <Eye size={11} className="text-white/25" />
                                  }
                                </button>
                              )}
                              <button
                                onClick={() => copy(key, value)}
                                className="p-1.5 rounded-lg transition-all hover:bg-white/8"
                              >
                                {copied === key
                                  ? <Check size={11} className="text-green-400" />
                                  : <Copy size={11} className="text-white/25" />
                                }
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="px-4 pb-3 flex items-center gap-1.5">
              <kbd className="text-[9px] text-white/15 px-1.5 py-0.5 rounded border border-white/10 font-mono">Enter</kbd>
              <span className="text-[9px] text-white/15">run</span>
              <span className="text-white/10 mx-1">·</span>
              <kbd className="text-[9px] text-white/15 px-1.5 py-0.5 rounded border border-white/10 font-mono">Esc</kbd>
              <span className="text-[9px] text-white/15">close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
