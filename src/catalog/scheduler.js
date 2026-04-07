import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import cron from 'node-cron';
import Log from "../core/logger.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 75;

const MAIN_SEASON = parseInt(process.env.MAIN_SEASON, 10);
const MIN_SHOP_SEASON = parseInt(process.env.MIN_SHOP_SEASON || '1', 10);

const ROTATE_SHOP = process.env.ROTATE_SHOP;
const SEND_WEBHOOK = process.env.SEND_WEBHOOK;
const WEBHOOK_URL = process.env.SHOP_WEBHOOK || "";
const PING_ROLE_ID = process.env.SHOP_PING_ROLE || "";
const ROTATION_TIME = process.env.SHOP_ROTATION_TIME || '19:00';
const ROTATION_TIMEZONE = process.env.SHOP_ROTATION_TIMEZONE || 'Asia/Riyadh';

function timeToCron(time) {
  const [hour, minute] = time.split(':').map(Number);
  return `${minute} ${hour} * * *`;
}

function getPrice(rarity, type) {
  const r = rarity.toLowerCase();
  const t = type.toLowerCase();

  const prices = {
    outfit:       { uncommon: 800,  rare: 1200, epic: 1500, legendary: 2000 },
    pickaxe:      { uncommon: 500,  rare: 800,  epic: 800,  legendary: 1500 },
    backpack:     { uncommon: 200,  rare: 200,  epic: 500,  legendary: 1000 },
    glider:       { uncommon: 500,  rare: 800,  epic: 1200, legendary: 2000 },
    emote:        { uncommon: 200,  rare: 500,  epic: 800,  legendary: 800  },
    wrap:         { uncommon: 200,  rare: 300,  epic: 500,  legendary: 500  },
    loadingscreen:{ uncommon: 200,  rare: 200,  epic: 200,  legendary: 200  },
    music:        { uncommon: 200,  rare: 200,  epic: 200,  legendary: 200  },
    spray:        { uncommon: 200,  rare: 200,  epic: 200,  legendary: 200  },
    emoji:        { uncommon: 200,  rare: 200,  epic: 200,  legendary: 200  },
  };

  return prices[t]?.[r] || 800;
}

async function sendShopWebhook(dailyItems, featuredBundles) {
  if (!SEND_WEBHOOK || !WEBHOOK_URL) return;

  const now = new Date();
  const nextRotation = new Date(now);
  nextRotation.setHours(19, 0, 0, 0);
  if (nextRotation <= now) nextRotation.setDate(nextRotation.getDate() + 1);

  const embed = {
    title: `Item Shop — ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`,
    description: `Next rotation: <t:${Math.floor(nextRotation / 1000)}:F>`,
    color: 0x00ff00,
    fields: [
      {
        name: "Daily Section",
        value: dailyItems.length
          ? dailyItems.map(i => `**${i.name}** — ${i.price || 800} V-Bucks`).join('\n')
          : "No items today",
        inline: false
      },
      {
        name: "Featured Bundles",
        value: featuredBundles.length
          ? featuredBundles.map(b => `**${b.name}** — ${b.bundlePrice} V-Bucks (${b.items.length} items)`).join('\n')
          : "No bundles",
        inline: false
      }
    ],
    timestamp: new Date().toISOString(),
    footer: { text: "Rotated Item Shop" }
  };

  try {
    if (PING_ROLE_ID) {
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: `<@&${PING_ROLE_ID}>` })
      });
    }
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    });
  } catch (err) {
    Log.error(`Webhook failed: ${err.message}`);
  }
}

async function generateRotatedShop() {
  if (!ROTATE_SHOP) return;

  try {
    Log.backend('Starting automatic shop rotation...');

    const response = await fetch('https://fortnite-api.com/v2/cosmetics/br');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const { data } = await response.json();
    const cosmetics = Array.isArray(data) ? data : data || [];

    const allowedItems = cosmetics.filter(item => {
      const intro = item.introduction?.backendValue;
      if (!intro || intro < MIN_SHOP_SEASON || intro > MAIN_SEASON) return false;
      if (!item.rarity || item.rarity.value === 'common') return false;
      const validTypes = ['outfit', 'backpack', 'pickaxe', 'glider', 'wrap', 'emote', 'music'];
      if (!item.type || !validTypes.includes(item.type.value.toLowerCase())) return false;
      if (!item.id || !item.type.backendValue) return false;
      return true;
    });

    if (allowedItems.length < 30) {
      Log.error(`Not enough cosmetics for rotation (found ${allowedItems.length})`);
      return;
    }

    const sets = new Map();
    const noSetItems = [];

    allowedItems.forEach(item => {
      if (item.set?.backendValue) {
        const setKey = item.set.backendValue;
        if (!sets.has(setKey)) sets.set(setKey, { name: item.set.value, items: [] });
        sets.get(setKey).items.push(item);
      } else {
        noSetItems.push(item);
      }
    });

    const validSets = Array.from(sets.values())
      .filter(set => set.items.length >= 2 && set.items.length <= 6)
      .sort(() => Math.random() - 0.5);

    const dailyPool = [...noSetItems];
    validSets.forEach(set => {
      if (set.items.length > 4) dailyPool.push(...set.items.slice(4));
    });

    const shuffledDaily = dailyPool.sort(() => Math.random() - 0.5).slice(0, 6);
    const daily = shuffledDaily.map(item => ({
      id: `${item.type.backendValue}:${item.id}`,
      price: getPrice(item.rarity.value, item.type.value),
      rarity: item.rarity.value,
      type: item.type.value.toLowerCase()
    }));

    const bundleCount = Math.min(4, Math.max(3, validSets.length));
    const featured = [];

    for (let i = 0; i < bundleCount && i < validSets.length; i++) {
      const set = validSets[i];
      const typePriority = { outfit: 1, backpack: 2, pickaxe: 3, glider: 4, wrap: 5, emote: 6, music: 7 };
      const sortedItems = set.items
        .sort((a, b) => (typePriority[a.type.value.toLowerCase()] || 99) - (typePriority[b.type.value.toLowerCase()] || 99))
        .slice(0, 6);

      const items = sortedItems.map(item => ({
        id: `${item.type.backendValue}:${item.id}`,
        price: getPrice(item.rarity.value, item.type.value),
        rarity: item.rarity.value,
        type: item.type.value.toLowerCase()
      }));

      const totalPrice = items.reduce((sum, item) => sum + item.price, 0);
      featured.push({ name: set.name, bundlePrice: Math.round(totalPrice * 0.85 / 50) * 50, items });
    }

    const shopConfigPath = path.join(__dirname, 'PreShop/ShopConfig.json');
    fs.writeFileSync(shopConfigPath, JSON.stringify({ daily, featured }, null, 2));

    Log.backend(`Shop auto-rotated: ${daily.length} daily items, ${featured.length} bundles`);
    await sendShopWebhook(shuffledDaily, featured);
  } catch (err) {
    Log.error(`Auto-rotation failed: ${err.message}`);
  }
}

app.get('/force-rotate', async (req, res) => {
  await generateRotatedShop();
  res.json({ success: true, message: "Shop manually rotated!" });
});

if (ROTATE_SHOP) {
  const cronTime = timeToCron(ROTATION_TIME);
  cron.schedule(cronTime, generateRotatedShop, { scheduled: true, timezone: ROTATION_TIMEZONE });
  Log.backend(`Shop auto-rotation scheduled: ${ROTATION_TIME} (${ROTATION_TIMEZONE})`);
}

app.listen(PORT, () => {
  Log.backend(`AerisMP Shop is Running`);
});
