"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useProfileStore } from "@/app/packages/zustand/profile";
import { useAccent } from "@/app/utils/hooks/accent";
import { Config } from "@/app/config/config";

function fmt(ms: number) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${h}h ${m}m ${s}s`;
}

export function DailyVBucks() {
  const accountId = useProfileStore((s) => s.accountId);
  const { accent, rgba } = useAccent();
  const [canClaim, setCanClaim] = useState(true);
  const [nextClaimAt, setNextClaimAt] = useState<string | null>(null);
  const [countdown, setCountdown] = useState("");
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [justClaimed, setJustClaimed] = useState(false);
  const amount = 100;

  const fetchStatus = useCallback(async () => {
    if (!accountId) { setLoading(false); return; }
    try {
      const res = await fetch(`${Config.LAUNCHER_API_URL}/api/daily/status/${accountId}`);
      if (!res.ok) { setCanClaim(true); setLoading(false); return; }
      const d = await res.json();
      setCanClaim(d.canClaim ?? true);
      setNextClaimAt(d.nextClaimAt ?? null);
    } catch { setCanClaim(true); }
    finally { setLoading(false); }
  }, [accountId]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  useEffect(() => {
    if (!nextClaimAt || canClaim) return;
    const tick = () => {
      const ms = new Date(nextClaimAt).getTime() - Date.now();
      if (ms <= 0) { setCanClaim(true); setCountdown(""); return; }
      setCountdown(fmt(ms));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [nextClaimAt, canClaim]);

  const handleClaim = async () => {
    if (!accountId || !canClaim || claiming) return;
    setClaiming(true);
    try {
      const res = await fetch(`${Config.LAUNCHER_API_URL}/api/daily/claim/${accountId}`, { method: "POST" });
      const d = await res.json();
      if (res.ok) {
        setCanClaim(false);
        setNextClaimAt(d.nextClaimAt);
        setJustClaimed(true);
        setTimeout(() => setJustClaimed(false), 3000);
      } else {
        if (d.nextClaimAt) setNextClaimAt(d.nextClaimAt);
        setCanClaim(false);
      }
    } catch {}
    finally { setClaiming(false); }
  };

  return (
    <div className="relative w-full rounded-xl overflow-hidden px-3.5 py-2.5 flex items-center justify-between"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 90% 50%, ${rgba(0.08)} 0%, transparent 65%)` }} />
      <div className="flex items-center gap-2.5 relative z-10">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: rgba(0.12), border: `1px solid ${rgba(0.2)}` }}>
          <img src="https://image.fnbr.co/price/icon_vbucks_50x.png" alt="" className="w-4 h-4" />
        </div>
        <div>
          <p className="text-white text-xs font-bold leading-none">Daily V-Bucks</p>
          <p className="text-white/30 text-[10px] mt-0.5">
            {!canClaim && countdown
              ? <span className="font-mono font-bold" style={{ color: accent }}>{countdown}</span>
              : `${amount} free every 24h`}
          </p>
        </div>
      </div>
      <div className="relative z-10">
        {loading ? (
          <div className="w-3.5 h-3.5 border-2 border-white/15 border-t-white/40 rounded-full animate-spin" />
        ) : canClaim ? (
          <motion.button onClick={handleClaim} disabled={claiming} whileTap={{ scale: 0.94 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white disabled:opacity-50 transition-all"
            style={{ background: justClaimed ? "rgba(34,197,94,0.75)" : rgba(0.85), border: `1px solid ${rgba(0.35)}`, boxShadow: justClaimed ? "0 0 12px rgba(34,197,94,0.3)" : `0 0 12px ${rgba(0.25)}` }}>
            <img src="https://image.fnbr.co/price/icon_vbucks_50x.png" alt="" className="w-3 h-3" />
            {justClaimed ? `+${amount} Claimed!` : claiming ? "..." : `Claim ${amount}`}
          </motion.button>
        ) : (
          <p className="text-xs font-mono font-bold" style={{ color: accent }}>{countdown || "—"}</p>
        )}
      </div>
    </div>
  );
}
