"use client";

import { useState } from "react";
import { open } from "@tauri-apps/plugin-shell";
import { Config } from "@/app/config/config";
import { Heart } from "lucide-react";

export function DonationSection() {
  const [loading, setLoading] = useState(false);

  const handleDonate = async () => {
    setLoading(true);
    try { await open(Config.DONATION_LINK); }
    catch { window.open(Config.DONATION_LINK, "_blank"); }
    finally { setLoading(false); }
  };

  return (
    <div className="relative w-full rounded-xl overflow-hidden px-3.5 py-2.5 flex items-center justify-between"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 90% 50%, rgba(239,68,68,0.07) 0%, transparent 65%)" }} />
      <div className="flex items-center gap-2.5 relative z-10">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.18)" }}>
          <Heart size={12} className="text-red-400" />
        </div>
        <div>
          <p className="text-white text-xs font-bold leading-none">Support {Config.NAME}</p>
          <p className="text-white/30 text-[10px] mt-0.5">Keep the server running</p>
        </div>
      </div>
      <button onClick={handleDonate} disabled={loading}
        className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white/60 hover:text-white transition-all disabled:opacity-40 relative z-10"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}>
        {loading ? "..." : "Donate"}
      </button>
    </div>
  );
}
