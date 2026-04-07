"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, RefreshCw, Heart, Clock, Zap, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useProfileStore } from "@/app/packages/zustand/profile";
import { useAccent } from "@/app/utils/hooks/accent";
import { useTheme } from "@/app/utils/hooks/theme";
import { useLibraryStore } from "@/app/packages/zustand/library";
import { useNavStore } from "@/app/packages/zustand/nav";
import { useShopStore } from "@/app/packages/zustand/shop";
import { Config } from "@/app/config/config";
import { start } from "@/app/utils/build/launch";
import { open } from "@tauri-apps/plugin-shell";

interface NewsItem { id: number; image: string; author: string; title: string; message: string; }
const FALLBACK: NewsItem[] = [
  { id: 1, image: "https://media.licdn.com/dms/image/v2/C4E12AQEHncNrCIkqNA/article-cover_image-shrink_720_1280/article-cover_image-shrink_720_1280/0/1520095517517?e=2147483647&v=beta&t=uV_huUri0E0Yib_a6NBG_-j4koK7Q2x9uJmB5gseakc", author: Config.NAME, title: "Offline Or Bug", message: "If your seeing this message servrs may be offline or this could just be a bug." },
  { id: 2, image: "https://media.licdn.com/dms/image/v2/C4E12AQEHncNrCIkqNA/article-cover_image-shrink_720_1280/article-cover_image-shrink_720_1280/0/1520095517517?e=2147483647&v=beta&t=uV_huUri0E0Yib_a6NBG_-j4koK7Q2x9uJmB5gseakc", author: Config.NAME, title: "Offline Or Bug", message: "If your seeing this message servrs may be offline or this could just be a bug." },
];
function useNews() {
  const [items, setItems] = useState<NewsItem[]>(FALLBACK);
  const [idx, setIdx] = useState(0);
  const versionRef = useRef("");

  const fetchItems = useCallback(async () => {
    try {
      const r = await fetch(`${Config.NEWS_API_URL}/launcher/api/news`, { signal: AbortSignal.timeout(5000) });
      if (!r.ok) return;
      const d = await r.json();
      if (Array.isArray(d) && d.length) setItems(d);
    } catch {}
  }, []);

  // Initial fetch
  useEffect(() => { fetchItems(); }, [fetchItems]);

  // Poll version every 5s — refetch if changed
  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const r = await fetch(`${Config.NEWS_API_URL}/launcher/api/news/version`, { signal: AbortSignal.timeout(3000) });
        if (!r.ok) return;
        const { version } = await r.json();
        if (version && version !== versionRef.current) {
          versionRef.current = version;
          fetchItems();
        }
      } catch {}
    }, 5000);
    return () => clearInterval(poll);
  }, [fetchItems]);

  // Auto-advance slides
  useEffect(() => {
    const t = setInterval(() => setIdx(p => (p + 1) % items.length), 6000);
    return () => clearInterval(t);
  }, [items.length]);

  return { items, idx, setIdx };
}

function fmt(ms: number) {
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}
function useDailyVbucks(accountId: string | null) {
  const [canClaim, setCanClaim] = useState(true);
  const [nextClaimAt, setNextClaimAt] = useState<string | null>(null);
  const [countdown, setCountdown] = useState("");
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [justClaimed, setJustClaimed] = useState(false);
  const fetch_ = useCallback(async () => {
    if (!accountId) { setLoading(false); return; }
    try {
      const r = await fetch(`${Config.LAUNCHER_API_URL}/api/daily/status/${accountId}`);
      if (!r.ok) { setCanClaim(true); setLoading(false); return; }
      const d = await r.json(); setCanClaim(d.canClaim ?? true); setNextClaimAt(d.nextClaimAt ?? null);
    } catch { setCanClaim(true); } finally { setLoading(false); }
  }, [accountId]);
  useEffect(() => { fetch_(); }, [fetch_]);
  useEffect(() => {
    if (!nextClaimAt || canClaim) return;
    const tick = () => { const ms = new Date(nextClaimAt).getTime() - Date.now(); if (ms <= 0) { setCanClaim(true); setCountdown(""); return; } setCountdown(fmt(ms)); };
    tick(); const t = setInterval(tick, 1000); return () => clearInterval(t);
  }, [nextClaimAt, canClaim]);
  const claim = async () => {
    if (!accountId || !canClaim || claiming) return;
    setClaiming(true);
    try {
      const r = await fetch(`${Config.LAUNCHER_API_URL}/api/daily/claim/${accountId}`, { method: "POST" });
      const d = await r.json();
      if (r.ok) { setCanClaim(false); setNextClaimAt(d.nextClaimAt); setJustClaimed(true); setTimeout(() => setJustClaimed(false), 3000); }
      else { if (d.nextClaimAt) setNextClaimAt(d.nextClaimAt); setCanClaim(false); }
    } catch {} finally { setClaiming(false); }
  };
  return { canClaim, countdown, loading, claiming, justClaimed, claim };
}

const RARITY: Record<string, string> = {
  common: "#6b7280", uncommon: "#65a30d", rare: "#0ea5e9",
  epic: "#a855f7", legendary: "#f97316", mythic: "#eab308", "icon series": "#06b6d4",
};

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: "easeOut" as const },
});

export default function Home() {
  const displayName = useProfileStore((s: { displayName: string | null }) => s.displayName);
  const accountId   = useProfileStore((s: { accountId:   string | null }) => s.accountId);
  const { accent, rgba } = useAccent();
  const { current: colors } = useTheme();
  const entries    = useLibraryStore((s) => s.entries);
  const navigateTo = useNavStore((s) => s.navigateTo);
  const { items: shopItems, loading: shopLoading, fetchShop } = useShopStore();

  const { items: newsItems, idx: newsIdx, setIdx: setNewsIdx } = useNews();
  const daily = useDailyVbucks(accountId);

  const [launching, setLaunching] = useState(false);
  const [launchErr, setLaunchErr] = useState<string | null>(null);
  const [donating, setDonating] = useState(false);
  const [shopIdx, setShopIdx] = useState(0);

  const hasBuild = entries.size > 0;
  const hour = new Date().getHours();
  const timeLabel = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";

  useEffect(() => { fetchShop(); }, [fetchShop]);
  useEffect(() => {
    if (!shopItems.length) return;
    const t = setInterval(() => setShopIdx(p => (p + 1) % shopItems.length), 4000);
    return () => clearInterval(t);
  }, [shopItems.length]);

  const handlePlay = async () => {
    if (!hasBuild) { navigateTo("library"); return; }
    setLaunching(true); setLaunchErr(null);
    try { const ok = await start(Array.from(entries.keys())[0]); if (!ok) setLaunchErr("Launch failed."); }
    catch (e: unknown) { setLaunchErr(e instanceof Error ? e.message : "Error"); }
    finally { setLaunching(false); }
  };

  const handleDonate = async () => {
    setDonating(true);
    try { await open(Config.DONATION_LINK); } catch { window.open(Config.DONATION_LINK, "_blank"); }
    finally { setDonating(false); }
  };

  const news = newsItems[newsIdx] ?? newsItems[0];
  const shopItem = shopItems[shopIdx];
  const rarityColor = shopItem ? (RARITY[shopItem.rarity?.value?.toLowerCase() ?? ""] ?? "#6b7280") : "#6b7280";

  return (
    <div className={`h-full w-full flex flex-col overflow-hidden ${colors.background}`}
      style={{ padding: "18px 20px 14px" }}>

      {/* ── TOP BAR ─────────────────────────────────────────────────────────── */}
      <motion.div {...fadeUp(0)} className="flex items-center mb-5 flex-shrink-0">
        <div>
          <p className="text-[22px] font-black text-white mt-0.5" style={{ letterSpacing: "-0.03em" }}>
            Good Morning {displayName ? `, ${displayName}` : ""}
          </p>
        </div>
      </motion.div>

      {/* ── MAIN GRID ───────────────────────────────────────────────────────── */}
      {/* Row 1: news card (tall, left) + shop card (tall, right) */}
      <div className="flex gap-3 flex-1 min-h-0">

        {/* ── NEWS CARD — takes 60% of width, full height */}
        <motion.div {...fadeUp(0.07)} className="relative rounded-2xl overflow-hidden flex-[6] min-w-0">
          {/* image */}
          <AnimatePresence mode="sync">
            <motion.img key={news.id} src={news.image} alt=""
              className="absolute inset-0 w-full h-full object-cover object-center"
              initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.7 }} />
          </AnimatePresence>

          {/* gradient */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.2) 45%, rgba(0,0,0,0.1) 100%)" }} />
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(to right, rgba(0,0,0,0.25) 0%, transparent 50%)" }} />

          {/* content — pinned to bottom */}
          <div className="absolute inset-x-0 bottom-0 p-5 z-10">
            <AnimatePresence mode="wait">
              <motion.div key={news.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <p className="text-[9px] mb-2" style={{ color: "rgba(255,255,255,0.38)", letterSpacing: "0.06em" }}>
                  {news.author}
                </p>
                <h2 className="font-semibold text-white leading-tight mb-1.5"
                  style={{ fontSize: "clamp(16px, 2.2vw, 24px)", letterSpacing: "-0.02em" }}>
                  {news.title}
                </h2>
                <p className="text-[10px] leading-relaxed line-clamp-2 mb-4"
                  style={{ color: "rgba(255,255,255,0.38)", maxWidth: "340px" }}>
                  {news.message}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* nav arrows + dots */}
            <div className="flex items-center gap-2">
              <button onClick={() => setNewsIdx(p => (p - 1 + newsItems.length) % newsItems.length)}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:opacity-80"
                style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" }}>
                <ChevronLeft size={13} className="text-white" />
              </button>
              <div className="flex gap-1.5">
                {newsItems.map((_, n) => (
                  <button key={n} onClick={() => setNewsIdx(n)}
                    className="rounded-full transition-all duration-300"
                    style={{
                      width: n === newsIdx ? "14px" : "4px",
                      height: "4px",
                      background: n === newsIdx ? accent : "rgba(255,255,255,0.25)",
                    }} />
                ))}
              </div>
              <button onClick={() => setNewsIdx(p => (p + 1) % newsItems.length)}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:opacity-80"
                style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" }}>
                <ChevronRight size={13} className="text-white" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── RIGHT COLUMN — 40% width, stacked cards */}
        <div className="flex flex-col gap-3 flex-[4] min-w-0">

          {/* ── SHOP CARD — top half of right column */}
          <motion.div {...fadeUp(0.12)} className="relative rounded-2xl overflow-hidden flex-[5] min-h-0">
            {shopLoading || !shopItem ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {shopLoading
                  ? <div className="w-4 h-4 border-2 border-white/10 border-t-white/35 rounded-full animate-spin" />
                  : <span className="text-white/15 text-[10px]">Shop empty</span>}
              </div>
            ) : (
              <>
                {/* bg */}
                <div className="absolute inset-0" style={{
                  background: `linear-gradient(145deg, ${rarityColor}45 0%, rgba(0,0,0,0.9) 70%)`
                }} />
                <div className="absolute inset-0" style={{
                  background: `radial-gradient(ellipse at 70% 30%, ${rarityColor}22 0%, transparent 55%)`
                }} />

                {/* item image — offset right so info has space */}
                <AnimatePresence mode="wait">
                  <motion.img key={shopIdx}
                    src={shopItem.images.featured || shopItem.images.icon} alt={shopItem.name}
                    initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
                    className="absolute right-0 top-0 h-full object-contain z-10"
                    style={{ width: "65%" }}
                    onError={e => { (e.target as HTMLImageElement).src = shopItem.images.icon; }} />
                </AnimatePresence>

                {/* info — left side */}
                <div className="absolute left-0 top-0 bottom-0 z-20 flex flex-col justify-between p-3.5"
                  style={{ width: "55%" }}>
                  <div>
                    <p className="text-[8px] font-medium mb-0.5" style={{ color: "rgba(255,255,255,0.3)", letterSpacing: "0.05em" }}>
                      Item Shop
                    </p>
                    <p className="text-[9px] font-semibold" style={{ color: rarityColor }}>
                      {shopItem.rarity?.displayValue}
                    </p>
                  </div>
                  <div>
                    <p className="text-white font-semibold text-[12px] leading-tight mb-1" style={{ letterSpacing: "-0.01em" }}>
                      {shopItem.name}
                    </p>
                    <div className="flex items-center gap-1 mb-2.5">
                      <img src="https://image.fnbr.co/price/icon_vbucks_50x.png" alt="" className="w-3.5 h-3.5" />
                      <span className="text-white/70 text-[11px] font-medium">{(shopItem.price ?? 0).toLocaleString()}</span>
                    </div>
                    <button onClick={() => navigateTo("shop")}
                      className="flex items-center gap-1 text-[9px] font-medium transition-opacity hover:opacity-70"
                      style={{ color: "rgba(255,255,255,0.35)" }}>
                      View all <ArrowRight size={9} />
                    </button>
                  </div>
                </div>

                {/* carousel dots — bottom right */}
                <div className="absolute bottom-2.5 right-2.5 z-30 flex gap-1">
                  {shopItems.slice(0, 5).map((_, n) => (
                    <div key={n} className="rounded-full transition-all duration-300"
                      style={{
                        width: n === shopIdx % 5 ? "10px" : "3px",
                        height: "3px",
                        background: n === shopIdx % 5 ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.2)",
                      }} />
                  ))}
                </div>
              </>
            )}
          </motion.div>

          {/* ── BOTTOM ROW — vbucks + donate side by side */}
          <div className="flex gap-3 flex-[3] min-h-0">

            {/* Daily V-Bucks */}
            <motion.div {...fadeUp(0.17)}
              className="flex-1 rounded-2xl p-3.5 flex flex-col justify-between min-w-0 relative overflow-hidden"
              style={{ border: `1px solid ${rgba(0.15)}` }}>
              <img src="https://i.pinimg.com/736x/22/af/cd/22afcd81bac5a9087554750e5787a094.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.25)" }} />
              <div className="relative z-10 flex items-center justify-between">
                <img src="https://image.fnbr.co/price/icon_vbucks_50x.png" alt="" className="w-5 h-5" />
              </div>
              <div className="relative z-10">
                <p className="text-white font-medium text-[11px]">Daily V-Bucks</p>
                <p className="text-[9px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {daily.loading ? "Checking…" : daily.canClaim ? "Free to claim" : (
                    <span className="flex items-center gap-1">
                      <Clock size={8} style={{ color: accent }} />
                      <span className="font-mono" style={{ color: accent }}>{daily.countdown || "—"}</span>
                    </span>
                  )}
                </p>
                {!daily.loading && daily.canClaim && (
                  <motion.button onClick={daily.claim} disabled={daily.claiming} whileTap={{ scale: 0.88 }}
                    className="mt-2 flex items-center gap-1 px-3 py-1.5 rounded-lg text-[9px] font-semibold text-black disabled:opacity-50"
                    style={{
                      background: daily.justClaimed ? "#22c55e" : accent,
                      boxShadow: `0 2px 10px ${daily.justClaimed ? "rgba(34,197,94,0.35)" : rgba(0.3)}`,
                    }}>
                    {daily.justClaimed ? "✓ Claimed" : daily.claiming ? "…" : "Claim"}
                  </motion.button>
                )}
              </div>
            </motion.div>

            {/* Donate */}
            <motion.div {...fadeUp(0.2)}
              className="flex-1 rounded-2xl p-3.5 flex flex-col justify-between min-w-0 relative overflow-hidden"
              style={{ border: "1px solid rgba(239,68,68,0.14)" }}>
              <img src="https://www.slashgear.com/img/gallery/fortnite-cardboard-box-glitch-makes-players-totally-invisible/intro-import.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.25)" }} />
              <Heart size={16} className="relative z-10 text-red-400" style={{ opacity: 0.7 }} />
              <div className="relative z-10">
                <p className="text-white font-medium text-[11px]">Support us</p>
                <p className="text-[9px] mt-0.5 mb-2.5" style={{ color: "rgba(255,255,255,0.28)" }}>
                  Keep the server running
                </p>
                <button onClick={handleDonate} disabled={donating}
                  className="text-[9px] font-medium transition-opacity hover:opacity-70 disabled:opacity-40"
                  style={{ color: "#f87171" }}>
                  {donating ? "Opening…" : "Donate →"}
                </button>
              </div>
            </motion.div>

            {/* No build — shown instead of one of the bottom cards */}
            {!hasBuild && (
              <motion.div {...fadeUp(0.22)}
                className="flex-1 rounded-2xl p-3.5 flex flex-col justify-between min-w-0"
                style={{ background: rgba(0.06), border: `1px solid ${rgba(0.13)}` }}>
                <Zap size={16} style={{ color: accent, opacity: 0.7 }} />
                <div>
                  <p className="text-white font-medium text-[11px]">No build</p>
                  <p className="text-[9px] mt-0.5 mb-2.5" style={{ color: "rgba(255,255,255,0.28)" }}>
                    Import one to play
                  </p>
                  <button onClick={() => navigateTo("library")}
                    className="text-[9px] font-medium transition-opacity hover:opacity-70"
                    style={{ color: accent }}>
                    Import →
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mt-3 flex-shrink-0">
        <p className="text-[9px]" style={{ color: rgba(0.22), letterSpacing: "0.03em" }}>{Config.NAME}</p>
        <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.1)" }}>v{Config.VERSION}</p>
      </div>
    </div>
  );
}
