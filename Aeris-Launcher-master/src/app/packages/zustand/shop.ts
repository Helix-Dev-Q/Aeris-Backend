import { create } from "zustand";
import { ShopItem } from "@/app/utils/types/shop";
import { Config } from "@/app/config/config";

interface ShopStore {
  items: ShopItem[];
  loading: boolean;
  fetched: boolean;
  fetchShop: () => Promise<void>;
  reset: () => void;
}

export const useShopStore = create<ShopStore>((set, get) => ({
  items: [],
  loading: false,
  fetched: false,

  reset: () => set({ items: [], loading: false, fetched: false }),

  fetchShop: async () => {
    if (get().fetched || get().loading) return;
    set({ loading: true });

    // Primary: backend launcher shop API (pre-enriched with cosmetic data)
    try {
      const res = await fetch(`${Config.SHOP_API_URL}/launcher/api/shop`, { signal: AbortSignal.timeout(15000) });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json) && json.length > 0) {
          set({ items: json, loading: false, fetched: true });
          return;
        }
      }
    } catch { /* fall through */ }

    // Fallback: parse catalog from main backend
    try {
      const res = await fetch(`${Config.BACKEND_URL}/fortnite/api/storefront/v2/catalog`, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const catalog = await res.json();
        const entries = catalog.storefronts
          ?.filter((s: any) => ["BRDailyStorefront", "BRWeeklyStorefront", "BRSeasonStorefront"].includes(s.name))
          .flatMap((s: any) => s.catalogEntries || []) ?? [];

        const loaded: ShopItem[] = [];
        for (const entry of entries) {
          if (entry.catalogGroup || (entry.itemGrants?.length ?? 0) > 1) continue;
          const cosmeticId = entry.itemGrants?.[0]?.templateId?.split(":")?.[1];
          if (!cosmeticId) continue;
          const price = Number(entry.prices?.[0]?.finalPrice ?? 0);
          const rarityFromPrice = (p: number) => {
            if (p >= 2000) return { value: "legendary", displayValue: "Legendary" };
            if (p >= 1500) return { value: "epic", displayValue: "Epic" };
            if (p >= 1200) return { value: "rare", displayValue: "Rare" };
            return { value: "uncommon", displayValue: "Uncommon" };
          };
          try {
            const r = await fetch(`https://fortnite-api.com/v2/cosmetics/br/${cosmeticId}`);
            if (!r.ok) continue;
            const d = await r.json();
            if (d.status !== 200 || !d.data) continue;
            loaded.push({
              id: d.data.id,
              offerId: entry.offerId,
              name: d.data.name,
              description: d.data.description,
              price,
              images: { featured: d.data.images.featured ?? null, icon: d.data.images.icon },
              rarity: rarityFromPrice(price),
              introduction: d.data.introduction ?? undefined,
            });
          } catch { continue; }
        }

        set({ items: loaded, loading: false, fetched: true });
        return;
      }
    } catch { /* silent */ }

    set({ loading: false, fetched: true });
  },
}));
