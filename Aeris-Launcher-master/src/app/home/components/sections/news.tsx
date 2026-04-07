"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, BookOpen } from "lucide-react";
import { Config } from "@/app/config/config";
import { useAccent } from "@/app/utils/hooks/accent";
import { start } from "@/app/utils/build/launch";
import { useLibraryStore } from "@/app/packages/zustand/library";
import { useNavStore } from "@/app/packages/zustand/nav";

interface NewsItem { id: number; image: string; author: string; title: string; message: string; position?: string; }

const FALLBACK: NewsItem[] = [
  { id: 1, image: "https://i.postimg.cc/jjgRqyv3/fortnite-season-8-week-1-challenges.jpg", author: "AerisMP", title: "Welcome to AerisMP", message: "The best OG Fortnite private server experience.", position: "center" },
  { id: 2, image: "https://i.postimg.cc/bwqPQmBG/OIP.webp", author: "AerisMP", title: "Season 8 is live", message: "Drop into Chapter 1 Season 8 and relive the old days.", position: "center" },
];

let _items: NewsItem[] = FALLBACK;
let _idx = 0;
let _version = "";

async function fetchNews() {
  try {
    const r = await fetch(`${Config.NEWS_API_URL}/launcher/api/news`, { signal: AbortSignal.timeout(5000) });
    if (r.ok) {
      const d = await r.json();
      if (Array.isArray(d) && d.length) {
        // Resolve relative image paths against the backend URL
        _items = d.map((item: NewsItem) => ({
          ...item,
          image: item.image?.startsWith("/") ? `${Config.NEWS_API_URL}${item.image}` : item.image,
        }));
        if (_idx >= _items.length) _idx = 0;
        return true;
      }
    }
  } catch {}
  return false;
}

export function NewsSection() {
  const [items, setItems] = useState<NewsItem[]>(_items);
  const [idx, setIdx] = useState(_idx);
  const [dir, setDir] = useState(1);
  const { accent } = useAccent();
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const entries = useLibraryStore((s) => s.entries);
  const navigateTo = useNavStore((s) => s.navigateTo);

  useEffect(() => {
    fetchNews().then(ok => { if (ok) { setItems([..._items]); setIdx(_idx); } });
  }, []);

  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const r = await fetch(`${Config.NEWS_API_URL}/launcher/api/news/version`, { signal: AbortSignal.timeout(3000) });
        if (!r.ok) return;
        const { version } = await r.json();
        if (version && version !== _version) {
          _version = version;
          const ok = await fetchNews();
          if (ok) { setItems([..._items]); setIdx(_idx); }
        }
      } catch {}
    }, 5000);
    return () => clearInterval(poll);
  }, []);

  const startTimer = () => {
    if (timer.current) clearInterval(timer.current);
  };

  useEffect(() => {
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [items.length]);

  const go = (n: number) => {
    setDir(n > idx ? 1 : -1);
    _idx = n; setIdx(n);
    startTimer();
  };

  const handlePlay = async () => {
    const builds = Array.from(entries.entries());
    if (builds.length > 0) await start(builds[0][0]);
  };

  const item = items[idx] ?? items[0];
  if (!item) return null;

  return (
    <div className="relative w-full h-full overflow-hidden rounded-2xl">

      {/* Background image */}
      <AnimatePresence mode="sync" custom={dir}>
        <motion.div key={item.id} custom={dir}
          variants={{
            enter: (d: number) => ({ x: d * 60, opacity: 0 }),
            center: { x: 0, opacity: 1 },
            exit:  (d: number) => ({ x: d * -60, opacity: 0 }),
          }}
          initial="enter" animate="center" exit="exit"
          transition={{ duration: 0.45, ease: [0.32, 0, 0.67, 0] }}
          className="absolute inset-0">
          {item.image ? <img src={item.image} alt={item.title}
            className={`absolute inset-0 w-full h-full object-cover ${item.position === "bottom" ? "object-bottom" : "object-center"}`} /> : null}
        </motion.div>
      </AnimatePresence>

      {/* Left dark vignette */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(to right, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.35) 45%, transparent 70%)" }} />
      {/* Bottom vignette */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 55%)" }} />
      {/* Right vignette for panel readability */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(to left, rgba(0,0,0,0.55) 0%, transparent 40%)" }} />

      {/* ── BOTTOM LEFT: label + title + desc + buttons ── */}
      <div className="absolute bottom-0 left-0 p-6 z-10" style={{ maxWidth: "52%" }}>
        <AnimatePresence mode="wait">
          <motion.div key={item.id}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25, delay: 0.08 }}>
            {/* Author label */}
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/45 mb-2 flex items-center gap-2">
              <span className="inline-block w-4 h-px bg-white/35" />
              {item.author}
            </p>
            {/* Title */}
            <h2 className="text-[26px] font-black text-white leading-none mb-2 drop-shadow-lg">{item.title}</h2>
            {/* Description */}
            <p className="text-[11px] text-white/55 leading-relaxed line-clamp-3 mb-4">{item.message}</p>
            {/* Buttons */}
            <div className="flex items-center gap-2">
              <button onClick={handlePlay}
                className="flex items-center gap-2 px-4 py-2 rounded text-xs font-semibold text-white transition-all"
                style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.25)" }}>
                <Play size={11} fill="white" />
                Play Now
              </button>
              <button
                onClick={() => navigateTo("library")}
                className="flex items-center gap-2 px-4 py-2 rounded text-xs font-semibold text-white/80 transition-all"
                style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.15)" }}>
                <BookOpen size={11} />
                Library
              </button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Progress bar */}
        <div className="mt-4" style={{ width: "100%", maxWidth: "260px" }}>
          <div className="relative w-full h-[2px] rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.15)" }}>
            <motion.div
              key={idx}
              className="absolute left-0 top-0 h-full rounded-full"
              style={{ background: "rgba(255,255,255,0.85)" }}
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 3, ease: "linear" }}
              onAnimationComplete={() => {
                setDir(1);
                setIdx(p => { const n = (p + 1) % _items.length; _idx = n; return n; });
              }}
            />
          </div>
        </div>
      </div>

      {/* ── RIGHT: news list ── */}
      <div className="absolute top-0 right-0 bottom-0 z-10 flex flex-col justify-end py-3 pr-2 gap-px"
        style={{ width: "210px" }}>
        {items.map((it, n) => {
          const active = n === idx;
          return (
            <button key={`${it.id}-${n}`} onClick={() => go(n)}
              className="flex items-center gap-2.5 px-2.5 py-2 text-left w-full transition-all duration-150"
              style={{
                background: active ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.0)",
                borderLeft: active ? `2px solid rgba(255,255,255,0.6)` : "2px solid transparent",
              }}>
              {/* Thumbnail */}
              <div className="w-[46px] h-[34px] rounded overflow-hidden flex-shrink-0">
                {it.image ? <img src={it.image} alt={it.title}
                  className={`w-full h-full object-cover ${it.position === "bottom" ? "object-bottom" : "object-center"}`} /> : null}
              </div>
              {/* Text */}
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold leading-tight truncate"
                  style={{ color: active ? "#fff" : "rgba(255,255,255,0.55)" }}>
                  {it.title}
                </p>
                <p className="text-[9px] uppercase tracking-[0.15em] truncate mt-0.5"
                  style={{ color: active ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.22)" }}>
                  {it.author}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
