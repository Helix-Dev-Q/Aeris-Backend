import express from "express";
import User from "../database/Schema/user.js";
import Profile from "../database/Schema/profiles.js";
import Utils from "../core/helpers.js";
import log from "../core/logger.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { v4 as uuidv4 } from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();
const API_KEY = process.env.GAME_API_KEY || "84059365-25d6-486f-81f3-04b306828c35";
const MAIN_SEASON = parseInt(process.env.MAIN_SEASON) || 0;
const MAX_LEVEL = MAIN_SEASON < 11 ? 100 : 1000;

const seasonFolder = path.join(__dirname, "../data/Battlepass/Data", `Season${MAIN_SEASON}`);

function ReadJson(filePath, fallback = []) {
  if (!fs.existsSync(filePath)) { log.warn(`File not found: ${filePath}`); return fallback; }
  try { return JSON.parse(fs.readFileSync(filePath, "utf8")); }
  catch (err) { log.error(`Failed to read/parse ${filePath}: ${err.message}`); return fallback; }
}

const levelData      = ReadJson(path.join(seasonFolder, "SeasonXP.json"), []);
const battleStarsData = MAIN_SEASON <= 10 ? ReadJson(path.join(seasonFolder, "SeasonBP.json"), []) : [];
const freeBPData     = ReadJson(path.join(seasonFolder, "SeasonFreeBattlepass.json"), []);
const paidBPData     = ReadJson(path.join(seasonFolder, "SeasonPaidBattlepass.json"), []);

async function giveBattlePassRewards(profile, currentTier) {
  const commonCoreProfile = profile.profiles.common_core;
  const athenaProfile = profile.profiles.athena;
  const freeRewards = freeBPData.find(r => r.Level === currentTier)?.Rewards || [];
  const paidRewards = paidBPData.find(r => r.Level === currentTier)?.Rewards || [];
  const allRewards = [...freeRewards, ...paidRewards];
  if (!allRewards.length) return;

  const athenaUpdates = {};
  const lootList = [];

  for (const reward of allRewards) {
    const itemType = reward.templateId;
    const itemGuid = `${itemType}_${uuidv4()}`;
    const quantity = reward.quantity || 1;
    if (itemType === "Currency:MtxPurchased") {
      commonCoreProfile.items["Currency:MtxPurchased"] = commonCoreProfile.items["Currency:MtxPurchased"] || { quantity: 0 };
      commonCoreProfile.items["Currency:MtxPurchased"].quantity += quantity;
      lootList.push({ itemType, itemGuid, quantity });
    } else {
      if (athenaProfile.items[itemType]) continue;
      athenaUpdates[`profiles.athena.items.${itemType}`] = { templateId: itemType, attributes: { item_seen: false }, quantity };
      lootList.push({ itemType, itemGuid, quantity });
    }
  }

  if (Object.keys(athenaUpdates).length > 0) {
    await Profile.findOneAndUpdate(
      { accountId: profile.accountId, "profiles.athena.rvn": athenaProfile.rvn },
      { $set: athenaUpdates, $inc: { "profiles.athena.rvn": 1 } },
      { new: true }
    );
  }

  if (lootList.length > 0) {
    const giftBoxId = uuidv4();
    commonCoreProfile.items[giftBoxId] = { templateId: "GiftBox:GB_BattlePass", attributes: { fromAccountId: "[Epic Games]", params: { DefaultHeaderText: "BATTLE PASS TIER UP!", userMessage: `You've reached Battle Pass tier ${currentTier}!` }, lootList, giftedOn: new Date().toISOString() }, quantity: 1 };
    commonCoreProfile.rvn = (commonCoreProfile.rvn || 0) + 1;
    commonCoreProfile.commandRevision = (commonCoreProfile.commandRevision || 0) + 1;
    await Profile.updateOne({ accountId: profile.accountId }, { $set: { "profiles.common_core": commonCoreProfile } });
  }
}

router.get("/api/v1/xp/:username/:amount", async (req, res) => {
  const { username, amount } = req.params;
  const apiKey = req.headers["x-api-key"];
  const xpAmount = parseInt(amount);
  try {
    if (apiKey !== API_KEY) return res.status(401).json({ error: "Invalid API key" });
    if (isNaN(xpAmount) || xpAmount <= 0) return res.status(400).json({ error: "Invalid XP amount" });

    const user = await User.findOne({ username }).lean();
    if (!user) return res.status(404).json({ error: `User not found: ${username}` });
    const profile = await Profile.findOne({ accountId: user.accountId });
    if (!profile) return res.status(404).json({ error: `Profile not found for user: ${username}` });

    const attributes = { ...profile.profiles.athena.stats.attributes };
    let currentXp = attributes.xp || 0;
    let currentLevel = attributes.level || 1;
    let battleStars = attributes.book_xp || 0;
    let tier = attributes.book_level || 0;

    currentXp += xpAmount;

    while (currentLevel < MAX_LEVEL) {
      const nextLevelData = levelData.find(l => l.Level === currentLevel + 1);
      if (!nextLevelData || currentXp < nextLevelData.XpToNextLevel) break;
      currentLevel += 1;
      currentXp -= nextLevelData.XpToNextLevel;

      if (MAIN_SEASON <= 10) {
        const levelStars = battleStarsData.find(d => d.Level === currentLevel)?.BattleStars || 0;
        battleStars += levelStars;
        attributes.book_xp = battleStars;
        while (battleStars >= 10) {
          battleStars -= 10; tier += 1;
          attributes.book_xp = battleStars; attributes.book_level = tier;
          await giveBattlePassRewards(profile, tier);
        }
      } else {
        const previousTier = tier; tier = currentLevel;
        attributes.book_level = tier; attributes.book_xp = 0;
        if (tier > previousTier) {
          for (let t = previousTier + 1; t <= tier; t++) await giveBattlePassRewards(profile, t);
        }
      }
    }

    attributes.xp = currentXp; attributes.level = currentLevel;
    await Profile.findOneAndUpdate(
      { accountId: user.accountId, "profiles.athena.rvn": profile.profiles.athena.rvn },
      { $set: { "profiles.athena.stats.attributes": attributes }, $inc: { "profiles.athena.rvn": 1 } },
      { new: true }
    );

    log.xp(`Added ${xpAmount} XP to ${username}, level: ${currentLevel}, tier: ${tier}`);
    await Utils.SendEmptyGift(username, user.accountId);
    const nextLevelXp = levelData.find(l => l.Level === currentLevel + 1)?.XpToNextLevel || 0;
    res.json({ message: `Successfully added ${xpAmount} XP, new level: ${currentLevel}, XP: ${currentXp}/${nextLevelXp || "Max"}, tier: ${tier}` });
  } catch (error) {
    log.api(`XP error for ${username}: ${error.message}`);
    res.status(error.message.includes("not found") ? 404 : 500).json({ error: error.message });
  }
});

export default router;
