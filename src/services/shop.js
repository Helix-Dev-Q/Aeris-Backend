import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import log from "../core/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

let cachedItems = null;
let cacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

import { watch } from "fs";
watch(path.join(__dirname, "../catalog/PreShop/ShopConfig.json"), () => {
  cachedItems = null;
  cacheTime = 0;
  log.api("ShopConfig changed, cache cleared");
});

async function buildShopItems() {
  const shopConfigPath = path.join(__dirname, "../catalog/PreShop/ShopConfig.json");
  const shopConfig = JSON.parse(fs.readFileSync(shopConfigPath, "utf8"));

  function normalizeRarity(rarity) {
    if (!rarity) return { value: "uncommon", displayValue: "Uncommon" };
    const val = (rarity.value || "").toLowerCase().replace(/.*::/g, "");
    const display = rarity.displayValue || val.charAt(0).toUpperCase() + val.slice(1);
    return { value: val, displayValue: display };
  }

  function rarityFromPrice(price, type) {
    const t = (type || "").toLowerCase();
    if (t === "outfit") {
      if (price >= 2000) return { value: "legendary", displayValue: "Legendary" };
      if (price >= 1500) return { value: "epic",      displayValue: "Epic" };
      if (price >= 1200) return { value: "rare",      displayValue: "Rare" };
      return                     { value: "uncommon", displayValue: "Uncommon" };
    }
    if (t === "pickaxe") {
      if (price >= 1500) return { value: "legendary", displayValue: "Legendary" };
      if (price >= 800)  return { value: "epic",      displayValue: "Epic" };
      if (price >= 500)  return { value: "rare",      displayValue: "Rare" };
      return                    { value: "uncommon",  displayValue: "Uncommon" };
    }
    if (t === "backpack") {
      if (price >= 1000) return { value: "legendary", displayValue: "Legendary" };
      if (price >= 500)  return { value: "epic",      displayValue: "Epic" };
      return                    { value: "uncommon",  displayValue: "Uncommon" };
    }
    if (t === "glider") {
      if (price >= 2000) return { value: "legendary", displayValue: "Legendary" };
      if (price >= 1200) return { value: "epic",      displayValue: "Epic" };
      if (price >= 800)  return { value: "rare",      displayValue: "Rare" };
      return                    { value: "uncommon",  displayValue: "Uncommon" };
    }
    if (t === "emote") {
      if (price >= 800)  return { value: "epic",      displayValue: "Epic" };
      if (price >= 500)  return { value: "rare",      displayValue: "Rare" };
      return                    { value: "uncommon",  displayValue: "Uncommon" };
    }
    if (t === "wrap") {
      if (price >= 500)  return { value: "epic",      displayValue: "Epic" };
      if (price >= 300)  return { value: "rare",      displayValue: "Rare" };
      return                    { value: "uncommon",  displayValue: "Uncommon" };
    }
    if (price >= 1500) return { value: "epic",      displayValue: "Epic" };
    if (price >= 800)  return { value: "rare",      displayValue: "Rare" };
    return                    { value: "uncommon",  displayValue: "Uncommon" };
  }

  const bundledItemIds = new Set();
  if (shopConfig.featured) {
    for (const set of shopConfig.featured) {
      if (set.items && Array.isArray(set.items)) {
        for (const item of set.items) {
          bundledItemIds.add(typeof item === "string" ? item : item.id);
        }
      }
    }
  }

  const items = [];

  function resolvePrice(rarity, type) {
    const r = (rarity || "").toLowerCase();
    const t = (type || "").toLowerCase();
    const prices = {
      outfit:       { uncommon: 800,  rare: 1200, epic: 1500, legendary: 2000 },
      pickaxe:      { uncommon: 500,  rare: 800,  epic: 800,  legendary: 1500 },
      backpack:     { uncommon: 200,  rare: 200,  epic: 500,  legendary: 1000 },
      glider:       { uncommon: 500,  rare: 800,  epic: 1200, legendary: 2000 },
      emote:        { uncommon: 200,  rare: 500,  epic: 800,  legendary: 800  },
      wrap:         { uncommon: 200,  rare: 300,  epic: 500,  legendary: 500  },
    };
    return prices[t]?.[r] ?? 800;
  }

  if (shopConfig.daily && Array.isArray(shopConfig.daily)) {
    for (const item of shopConfig.daily) {
      const itemId    = typeof item === "string" ? item : item.id;
      const itemPrice = typeof item === "string" ? 800  : (item.price ?? resolvePrice(item.rarity, item.type));
      const cosmeticId = itemId.split(":")[1];
      if (!cosmeticId) continue;
      try {
        const res = await fetch(`https://fortnite-api.com/v2/cosmetics/br/${cosmeticId}`);
        if (!res.ok) continue;
        const data = await res.json();
        if (data.status !== 200 || !data.data) continue;
        const d = data.data;
        items.push({
          id: d.id,
          offerId: itemId,
          name: d.name,
          description: d.description,
          price: itemPrice,
          regularPrice: itemPrice,
          isBundle: false,
          images: {
            featured: d.images.featured || d.images.icon || d.images.smallIcon || null,
            icon: d.images.icon || d.images.smallIcon || null,
            smallIcon: d.images.smallIcon || null,
          },
          rarity: d.rarity ? normalizeRarity(d.rarity) : rarityFromPrice(itemPrice, d.type?.value),
          type: d.type,
          section: "daily",
        });
      } catch { continue; }
    }
  }

  if (shopConfig.featured && Array.isArray(shopConfig.featured)) {
    for (const set of shopConfig.featured) {
      if (!set.items || !Array.isArray(set.items)) continue;
      const bundleItems = [];
      for (const item of set.items) {
        const itemId     = typeof item === "string" ? item : item.id;
        const itemPrice  = typeof item === "string" ? 800  : (item.price ?? resolvePrice(item.rarity, item.type));
        const cosmeticId = itemId.split(":")[1];
        if (!cosmeticId) continue;
        try {
          const res = await fetch(`https://fortnite-api.com/v2/cosmetics/br/${cosmeticId}`);
          if (!res.ok) continue;
          const data = await res.json();
          if (data.status !== 200 || !data.data) continue;
          bundleItems.push({
            id: data.data.id,
            name: data.data.name,
            type: data.data.type,
            rarity: data.data.rarity ? normalizeRarity(data.data.rarity) : rarityFromPrice(itemPrice, data.data.type?.value),
            images: {
              icon: data.data.images.icon || data.data.images.smallIcon || null,
              featured: data.data.images.featured || data.data.images.icon || data.data.images.smallIcon || null,
              smallIcon: data.data.images.smallIcon || null,
            },
          });
        } catch { continue; }
      }
      if (bundleItems.length > 0) {
        const regularPrice = set.items.reduce((sum, item) => sum + (item.price ?? resolvePrice(item.rarity, item.type)), 0);
        const skinItem = bundleItems.find(b => b.type?.value === "outfit") || bundleItems[0];
        items.push({
          id: set.name,
          offerId: set.name,
          name: set.name,
          description: `Bundle with ${bundleItems.length} items`,
          price: set.bundlePrice ?? Math.round(regularPrice * 0.85 / 50) * 50,
          regularPrice,
          isBundle: true,
          bundleItems,
          images: {
            featured: skinItem?.images.featured || skinItem?.images.icon || null,
            icon: skinItem?.images.icon || null,
          },
          rarity: skinItem?.rarity || { value: "epic", displayValue: "Epic" },
          type: { value: "bundle", displayValue: "Bundle" },
          section: "featured",
        });
      }
    }
  }

  return items;
}

router.get("/launcher/api/shop", async (req, res) => {
  try {
    const now = Date.now();
    if (cachedItems && now - cacheTime < CACHE_TTL_MS) {
      return res.json(cachedItems);
    }
    log.api("Building item shop...");
    const items = await buildShopItems();
    cachedItems = items;
    cacheTime = now;
    log.api(`Item shop built: ${items.length} items`);
    res.json(items);
  } catch (err) {
    log.error(`Shop error: ${err.message}`);
    res.status(500).json({ error: "Failed to build shop" });
  }
});

export default router;
