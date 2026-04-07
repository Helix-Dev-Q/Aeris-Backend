"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useShopStore } from "@/app/packages/zustand/shop";
import { useConfigStore } from "@/app/packages/zustand/configs";

const RARITY_GRAD: Record<string, string> = {
  common:       "from-zinc-600 to-zinc-900",
  uncommon:     "from-lime-500 to-lime-900",
  rare:         "from-sky-500 to-sky-900",
  epic:         "from-purple-500 to-purple-950",
  legendary:    "from-orange-400 to-orange-900",
  mythic:       "from-yellow-300 to-yellow-800",
  "icon series":"from-cyan-400 to-cyan-900",
};

export function SmallShop() {
  const { items, loading, fetchShop } = useShopStore();
  const [index, setIndex] = useState(0);
  const blackhole = useConfigStore((s) => s.theme === "blackhole");

  useEffect(() => { fetchShop(); }, [fetchShop]);
  useEffect(() => {
    if (!items.length) return;
    const t = setInterval(() => setIndex(p => (p + 1) % items.length), 4000);
    return () => clearInterval(t);
  }, [items.length]);

  if (loading || !items.length) {
    return (
      <div className="w-full aspect-square rounded-xl flex items-center justify-center"
        style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
        {loading
          ? <div className="w-4 h-4 border-2 border-white/15 border-t-white/50 rounded-full animate-spin" />
          : <span className="text-white/15 text-xs">No items</span>}
      </div>
    );
  }

  const item = items[index];
  const grad = RARITY_GRAD[item.rarity?.value?.toLowerCase() ?? ""] ?? "from-neutral-600 to-neutral-950";

  return (
    <div className="relative w-full aspect-square rounded-xl overflow-hidden group cursor-pointer"
      style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className={`absolute inset-0 bg-gradient-to-b ${grad} ${blackhole ? "opacity-55" : ""}`} />
      <AnimatePresence mode="wait">
        <motion.img
          key={index}
          src={item.images.featured || item.images.icon}
          alt={item.name}
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={{ duration: 0.35 }}
          className="absolute inset-0 w-full h-full object-contain z-10 transition-transform duration-300 group-hover:scale-105"
          onError={e => { (e.target as HTMLImageElement).src = item.images.icon; }}
        />
      </AnimatePresence>
      <div className="absolute inset-x-0 bottom-0 z-20 p-2.5"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, transparent 100%)" }}>
        <AnimatePresence mode="wait">
          <motion.div key={index} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <p className="text-white/35 text-[8px] uppercase tracking-[0.18em] leading-none">{item.rarity?.displayValue}</p>
            <p className="text-white font-bold text-[11px] leading-tight truncate mt-0.5">{item.name}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <img src="https://image.fnbr.co/price/icon_vbucks_50x.png" alt="" className="w-2.5 h-2.5" />
              <span className="text-white/80 text-[10px] font-semibold">{(item.price ?? 0).toLocaleString()}</span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      {/* Dot indicators */}
      <div className="absolute top-2 right-2 z-20 flex gap-1">
        {items.slice(0, Math.min(items.length, 5)).map((_, n) => (
          <div key={n} className="rounded-full transition-all duration-300"
            style={{ width: n === index % 5 ? "12px" : "4px", height: "4px", background: n === index % 5 ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.2)" }} />
        ))}
      </div>
    </div>
  );
}
