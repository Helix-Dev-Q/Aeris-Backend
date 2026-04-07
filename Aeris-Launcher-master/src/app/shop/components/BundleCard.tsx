import { motion } from "framer-motion";
import type { ShopItem } from "@/app/utils/types/shop";

const RARITY_COLORS: Record<string, string> = {
  common: "from-zinc-500 to-zinc-700",
  uncommon: "from-lime-500 to-lime-700",
  rare: "from-sky-500 to-sky-700",
  epic: "from-purple-500 to-purple-800",
  legendary: "from-orange-400 to-orange-700",
  mythic: "from-yellow-300 to-yellow-600",
  marvel: "from-red-600 to-red-900",
  dc: "from-blue-600 to-blue-900",
  "icon series": "from-cyan-400 to-cyan-700",
  "star wars": "from-slate-600 to-slate-900",
};

const RARITY_BORDER: Record<string, string> = {
  common: "border-zinc-500/40",
  uncommon: "border-lime-500/40",
  rare: "border-sky-500/40",
  epic: "border-purple-500/40",
  legendary: "border-orange-400/40",
  mythic: "border-yellow-400/40",
  marvel: "border-red-500/40",
  dc: "border-blue-500/40",
  "icon series": "border-cyan-400/40",
  "star wars": "border-slate-500/40",
};

function getRarity(r: string) {
  const key = r.toLowerCase();
  return {
    grad: RARITY_COLORS[key] ?? "from-neutral-600 to-neutral-800",
    border: RARITY_BORDER[key] ?? "border-white/10",
  };
}

export function BundleCard({
  item,
  onClick,
  index,
  blackhole,
}: {
  item: ShopItem;
  onClick: () => void;
  index: number;
  blackhole: boolean;
}) {
  const { grad, border } = getRarity(item.rarity?.value ?? "uncommon");
  const discount = item.regularPrice && item.regularPrice > (item.price ?? 0)
    ? Math.round(((item.regularPrice - (item.price ?? 0)) / item.regularPrice) * 100)
    : 0;

  const mainItem = item.bundleItems?.[0];
  const otherItems = item.bundleItems?.slice(1) || [];
  const totalItems = item.bundleItems?.length || 0;
  const has6PlusItems = totalItems >= 6;

  type Position = { top?: string; left?: string; right?: string; bottom?: string; transform?: string };

  // Layout for 6+ items: Left side (3 items), Right side (2 items)
  const largeLayoutPositions: Position[] = [
    { top: "8%", left: "15%" },
    { top: "8%", right: "15%" },
    { top: "50%", left: "15%", transform: "translateY(-50%)" },
    { bottom: "8%", right: "15%" },
    { bottom: "8%", left: "15%" },
  ];

  // Original layout for less than 6 items: symmetrical
  const smallLayoutPositions: Position[] = [
    { top: "15%", left: "8%" },
    { top: "15%", right: "8%" },
    { bottom: "25%", left: "10%" },
    { bottom: "25%", right: "10%" },
    { top: "45%", left: "5%" },
  ];

  const positions = has6PlusItems ? largeLayoutPositions : smallLayoutPositions;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, delay: index * 0.012 }}
      onClick={onClick}
      className={`relative rounded-xl overflow-hidden cursor-pointer border ${border} group col-span-2`}
      style={{ aspectRatio: "16/9" }}
    >
      {blackhole ? (
        <div className={`absolute inset-0 bg-gradient-to-b ${grad} opacity-70`} />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-b ${grad}`} />
      )}

      {/* Discount badge */}
      {discount > 0 && (
        <div className="absolute top-3 left-3 z-30 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded">
          {discount}% OFF
        </div>
      )}

      {/* Main featured image (centered) */}
      {mainItem && (
        <img
          src={mainItem.images.featured || mainItem.images.icon || mainItem.images.smallIcon}
          alt={mainItem.name}
          className="absolute inset-0 w-full h-full object-contain object-center transition-transform duration-200 group-hover:scale-105 z-10"
          onError={(e) => {
            (e.target as HTMLImageElement).src = mainItem.images.icon || mainItem.images.smallIcon || "";
          }}
        />
      )}

      {/* Bundle items floating around */}
      {otherItems.length > 0 && (
        <div className="absolute inset-0 z-20 pointer-events-none">
          {otherItems.map((bundleItem, i) => {
            const pos = positions[i % positions.length];
            
            return (
              <div
                key={i}
                className="absolute w-16 h-16 rounded-lg bg-black/70 border-2 border-white/30 p-1.5 backdrop-blur-sm"
                style={{ 
                  top: pos.top,
                  left: pos.left,
                  right: pos.right,
                  bottom: pos.bottom,
                  transform: pos.transform
                }}
              >
                <img
                  src={bundleItem.images.icon || bundleItem.images.smallIcon}
                  alt={bundleItem.name}
                  className="w-full h-full object-contain"
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom info */}
      <div
        className="absolute inset-x-0 bottom-0 z-30 p-3"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)" }}
      >
        <div className="flex items-center gap-1 mb-0.5">
          <span className="text-white/60 text-[9px] uppercase tracking-wider font-semibold">
            Bundle
          </span>
        </div>
        <p className="text-white font-semibold text-xs leading-tight truncate">
          {item.name}
        </p>
        <p className="text-white/40 text-[10px] truncate">
          {item.bundleItems?.length || 0} items
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <img
            src="https://image.fnbr.co/price/icon_vbucks_50x.png"
            alt="vbucks"
            className="w-3 h-3"
          />
          <span className="text-white text-xs font-semibold">
            {(item.price ?? 0).toLocaleString()}
          </span>
          {item.regularPrice && item.regularPrice > (item.price ?? 0) && (
            <span className="text-white/30 text-[10px] line-through">
              {item.regularPrice.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
