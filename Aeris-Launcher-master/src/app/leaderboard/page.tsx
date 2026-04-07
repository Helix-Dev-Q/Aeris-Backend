"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Flame, Crown } from "lucide-react";
import { useProfileStore } from "@/app/packages/zustand/profile";
import { useAccent } from "@/app/utils/hooks/accent";
import { Config } from "@/app/config/config";

interface LeaderboardEntry {
  rank: number;
  accountId: string;
  username: string;
  discordId: string | null;
  avatar: string | null;
  hype: number;
}

function Avatar({ src, name, size = 32 }: { src: string | null; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  if (src && !err) {
    return (
      <img src={src} alt={name} onError={() => setErr(true)} referrerPolicy="no-referrer"
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }} />
    );
  }
  return (
    <div className="rounded-full flex items-center justify-center flex-shrink-0 font-bold"
      style={{ width: size, height: size, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)", fontSize: size * 0.38 }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const myAccountId = useProfileStore(s => s.accountId);
  const myUsername = useProfileStore(s => s.displayName);
  const { accent, rgba } = useAccent();

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${Config.LAUNCHER_API_URL}/api/v1/leaderboard/arena`);
      if (res.ok) setEntries(await res.json());
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => { fetchLeaderboard(); }, []);

  const handleRefresh = () => {
    if (loading || spinning) return;
    setSpinning(true);
    fetchLeaderboard().finally(() => setTimeout(() => setSpinning(false), 600));
  };

  const myEntry = entries.find(e => e.accountId === myAccountId);

  const rankColor = (rank: number) =>
    rank === 1 ? "#fbbf24" : rank === 2 ? "#94a3b8" : rank === 3 ? "#cd7c2f" : "rgba(255,255,255,0.18)";

  return (
    <div className="h-full flex flex-col overflow-hidden">

      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-2" style={{ scrollbarWidth: "none" }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Crown size={16} style={{ color: "#fbbf24" }} />
              <h1 className="text-xl font-black text-white tracking-tight">Arena Leaderboard</h1>
            </div>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
              Top {entries.length} players on {Config.NAME}
            </p>
          </div>
          <button onClick={handleRefresh} disabled={loading || spinning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: loading || spinning ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.4)",
              cursor: loading || spinning ? "not-allowed" : "pointer",
            }}>
            <RefreshCw size={11} className={spinning ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Table header */}
        <div className="grid px-3 py-2 text-[9px] font-bold uppercase tracking-[0.2em] mb-1"
          style={{ gridTemplateColumns: "48px 1fr auto", color: "rgba(255,255,255,0.2)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <span>Place</span>
          <span>Player</span>
          <span>Points</span>
        </div>

        {/* Rows */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 rounded-full animate-spin"
              style={{ borderColor: "rgba(255,255,255,0.06)", borderTopColor: accent }} />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.12)" }}>No arena data yet</p>
          </div>
        ) : (
          entries.map((entry, i) => {
            const isMe = entry.accountId === myAccountId;
            const isTop3 = entry.rank <= 3;
            return (
              <motion.div key={entry.accountId}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.018, duration: 0.2 }}
                className="grid items-center px-3 py-2.5 rounded-lg"
                style={{
                  gridTemplateColumns: "48px 1fr auto",
                  background: isMe ? rgba(0.07) : "transparent",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                }}>
                <span className="text-xs font-black font-mono" style={{ color: rankColor(entry.rank) }}>
                  #{entry.rank}
                </span>
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar src={entry.avatar} name={entry.username} size={28} />
                  <p className="text-sm font-semibold truncate"
                    style={{ color: isMe ? "#fff" : "rgba(255,255,255,0.65)" }}>
                    {entry.username}
                    {isMe && <span className="ml-1.5 text-[8px] uppercase tracking-wider" style={{ color: rgba(0.4) }}>you</span>}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Flame size={11} style={{ color: isTop3 ? "#f97316" : "rgba(255,255,255,0.15)" }} />
                  <span className="text-xs font-bold font-mono"
                    style={{ color: isTop3 ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.35)" }}>
                    {entry.hype.toLocaleString()}
                  </span>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Bottom bar */}
      <div className="flex-shrink-0 px-4 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.05)" }}>
            <span className="text-xs font-black" style={{ color: "rgba(255,255,255,0.25)" }}>#</span>
          </div>
          <Avatar src={myEntry?.avatar ?? null} name={myUsername || "You"} size={28} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate leading-none">{myUsername || "You"}</p>
            <p className="text-[9px] mt-0.5" style={{ color: "rgba(255,255,255,0.2)" }}>Your current rank</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Flame size={12} style={{ color: "#f97316" }} />
            <span className="text-sm font-bold text-white">{myEntry?.hype.toLocaleString() ?? 0}</span>
          </div>
        </div>
      </div>

    </div>
  );
}
