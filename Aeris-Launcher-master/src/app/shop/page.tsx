"use client";

import { useEffect, useState } from "react";
import type { ShopItem } from "@/app/utils/types/shop";
import { motion, AnimatePresence } from "framer-motion";
import { useShopStore } from "@/app/packages/zustand/shop";
import { useConfigStore } from "@/app/packages/zustand/configs";
import { useAccent } from "@/app/utils/hooks/accent";
import { RefreshCw, X, ShoppingBag } from "lucide-react";
import { BundleCard } from "./components/BundleCard";

const RARITY_GRAD: Record<string, string> = {
  common:        "from-zinc-500 to-zinc-800",
  uncommon:      "from-lime-500 to-lime-800",
  rare:          "from-sky-500 to-sky-800",
  epic:          "from-purple-500 to-purple-900",
  legendary:     "from-orange-400 to-orange-800",
  mythic:        "from-yellow-300 to-yellow-700",
  marvel:        "from-red-600 to-red-900",
  dc:            "from-blue-600 to-blue-900",
  "icon series": "from-cyan-400 to-cyan-800",
  "star wars":   "from-slate-600 to-slate-900",
};

const RARITY_GLOW: Record<string, string> = {
  common:        "rgba(161,161,170,0.25)",
  uncommon:      "rgba(132,204,22,0.25)",
  rare:          "rgba(14,165,233,0.3)",
  epic:          "rgba(168,85,247,0.3)",
  legendary:     "rgba(251,146,60,0.35)",
  mythic:        "rgba(253,224,71,0.35)",
  "icon series": "rgba(34,211,238,0.3)",
};

function rarity(r: string) {
  const k = r.toLowerCase();
  return {
    grad: RARITY_GRAD[k] ?? "from-neutral-600 to-neutral-900",
    glow: RARITY_GLOW[k] ?? "rgba(255,255,255,0.1)",
  };
}

function ShopCard({ item, onClick, index, blackhole }: { item: ShopItem; onClick: () => void; index: number; blackhole: boolean }) {
  const { grad, glow } = rarity(item.rarity.value);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.14, delay: index * 0.007 }}
      onClick={onClick}
      className="relative rounded-xl overflow-hidden cursor-pointer group"
      style={{ aspectRatio: "3/4" }}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
    >
      <div className={`absolute inset-0 bg-gradient-to-b ${grad} ${blackhole ? "opacity-60" : ""}`} />
      <img
        src={item.images.featured || item.images.icon || item.images.smallIcon}
        alt={item.name}
        className="absolute inset-0 w-full h-full object-contain object-center transition-transform duration-300 group-hover:scale-108 z-10"
        onError={e => { (e.target as HTMLImageElement).src = item.images.icon || item.images.smallIcon || ""; }}
      />
      {/* Hover glow */}
      <div className="absolute inset-0 z-5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none rounded-xl"
        style={{ boxShadow: `inset 0 0 0 1px ${glow}, 0 0 20px ${glow}` }} />
      <div className="absolute inset-x-0 bottom-0 z-20 p-2.5"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, transparent 100%)" }}>
        <p className="text-white/30 text-[8px] uppercase tracking-[0.15em] leading-none">{item.rarity.displayValue}</p>
        <p className="text-white font-bold text-[11px] leading-tight truncate mt-0.5">{item.name}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <img src="https://image.fnbr.co/price/icon_vbucks_50x.png" alt="" className="w-2.5 h-2.5" />
          <span className="text-white/80 text-[10px] font-semibold">{item.price.toLocaleString()}</span>
        </div>
      </div>
    </motion.div>
  );
}

export default function Shop() {
  const { items, loading, fetchShop, reset } = useShopStore();
  const [selected, setSelected] = useState<ShopItem | null>(null);
  const [spinning, setSpinning] = useState(false);
  const blackhole = useConfigStore((s) => s.theme === "blackhole");
  const { accent, rgba } = useAccent();

  useEffect(() => { reset(); fetchShop(); }, []);

  const handleRefresh = () => {
    if (loading || spinning) return;
    setSpinning(true);
    reset();
    fetchShop().finally(() => setTimeout(() => setSpinning(false), 600));
  };

  const featured = items.filter(i => i.section === "featured" || (!i.section && items.indexOf(i) < Math.ceil(items.length / 2)));
  const daily = items.filter(i => i.section === "daily" || (!i.section && items.indexOf(i) >= Math.ceil(items.length / 2)));

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-8 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: rgba(0.12), border: `1px solid ${rgba(0.2)}` }}>
            <ShoppingBag size={15} style={{ color: accent }} />
          </div>
          <div>
            <h1 className="text-base font-black text-white tracking-tight leading-none">Item Shop</h1>
            <p className="text-white/25 text-[10px] mt-0.5">{items.length} items available</p>
          </div>
        </div>
        <button onClick={handleRefresh} disabled={loading || spinning}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            color: loading || spinning ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.45)",
            cursor: loading || spinning ? "not-allowed" : "pointer",
          }}>
          <RefreshCw size={11} style={{ transition: "transform 0.6s", transform: spinning ? "rotate(360deg)" : "none" }} />
          Refresh
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-5">
        {loading ? (
          <div className="h-full flex items-center justify-center flex-col gap-3">
            <div className="w-6 h-6 border-2 border-white/10 border-t-white/50 rounded-full animate-spin" />
            <p className="text-white/20 text-sm">Loading shop...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-white/15 text-sm">No items in shop</p>
          </div>
        ) : (
          <>
            {featured.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/25">Featured</p>
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.04)" }} />
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {featured.map((item, i) =>
                    item.isBundle
                      ? <BundleCard key={item.id} item={item} index={i} blackhole={blackhole} onClick={() => setSelected(item)} />
                      : <ShopCard key={item.id} item={item} index={i} blackhole={blackhole} onClick={() => setSelected(item)} />
                  )}
                </div>
              </section>
            )}
            {daily.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/25">Daily</p>
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.04)" }} />
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {daily.map((item, i) =>
                    item.isBundle
                      ? <BundleCard key={item.id} item={item} index={i} blackhole={blackhole} onClick={() => setSelected(item)} />
                      : <ShopCard key={item.id} item={item} index={i} blackhole={blackhole} onClick={() => setSelected(item)} />
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* Detail modal */}
      <AnimatePresence>
        {selected && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 16 }} transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              onClick={e => e.stopPropagation()}
              className="relative w-56 rounded-2xl overflow-hidden shadow-2xl"
              style={{ border: `1px solid ${rarity(selected.rarity.value).glow}`, boxShadow: `0 0 60px ${rarity(selected.rarity.value).glow}` }}>
              <button onClick={() => setSelected(null)}
                className="absolute top-2 right-2 z-30 w-7 h-7 rounded-full flex items-center justify-center transition-all"
                style={{ background: "rgba(0,0,0,0.6)", color: "rgba(255,255,255,0.5)" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,0,0,0.85)"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,0,0,0.6)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}>
                <X size={12} />
              </button>
              <div className={`absolute inset-0 z-0 bg-gradient-to-b ${rarity(selected.rarity.value).grad}`} />
              {selected.isBundle && selected.bundleItems && selected.bundleItems.length > 0 ? (() => {
                const sorted = [...selected.bundleItems].sort((a, b) =>
                  a.type?.value === "outfit" ? -1 : b.type?.value === "outfit" ? 1 : 0
                );
                const mainItem = sorted[0];
                const rest = sorted.slice(1);
                const floatPositions = [
                  { top: "8%", left: "4%" },
                  { top: "8%", right: "4%" },
                  { bottom: "8%", left: "4%" },
                  { bottom: "8%", right: "4%" },
                  { top: "45%", left: "2%" },
                ];
                return (
                  <div className="relative w-full z-10" style={{ height: "220px" }}>
                    <img
                      src={mainItem.images.featured || mainItem.images.icon || mainItem.images.smallIcon || ""}
                      alt={mainItem.name}
                      className="absolute inset-0 w-full h-full object-contain object-center"
                    />
                    {rest.map((bi, i) => (
                      <div key={i} className="absolute w-11 h-11 rounded-lg bg-black/70 border border-white/25 p-1 backdrop-blur-sm"
                        style={floatPositions[i % floatPositions.length]}>
                        <img src={bi.images.icon || bi.images.smallIcon || ""} alt={bi.name} className="w-full h-full object-contain" />
                      </div>
                    ))}
                  </div>
                );
              })() : (
                <img src={selected.images.featured || selected.images.icon} alt={selected.name}
                  className="relative z-10 w-full object-contain" style={{ maxHeight: "220px" }} />
              )}
              <div className="relative z-10 p-4" style={{ background: "rgba(0,0,0,0.88)" }}>
                <p className="text-white/30 text-[8px] uppercase tracking-[0.18em] mb-0.5">{selected.rarity.displayValue}</p>
                <h3 className="text-white font-black text-sm leading-tight mb-1">{selected.name}</h3>
                <p className="text-white/30 text-[10px] leading-relaxed mb-3 line-clamp-2">{selected.description}</p>
                <div className="flex items-center gap-1.5">
                  <img src="https://image.fnbr.co/price/icon_vbucks_50x.png" alt="" className="w-4 h-4" />
                  <span className="text-white font-black text-sm">{selected.price.toLocaleString()}</span>
                  {selected.regularPrice && selected.regularPrice > selected.price && (
                    <span className="text-white/25 text-xs line-through">{selected.regularPrice.toLocaleString()}</span>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
