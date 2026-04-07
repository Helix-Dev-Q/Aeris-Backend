import express from "express";
import User from "../database/Schema/user.js";
import Profile from "../database/Schema/profiles.js";
import Utils from "../core/helpers.js";
import log from "../core/logger.js";

const router = express.Router();
const API_KEY = process.env.GAME_API_KEY || "84059365-25d6-486f-81f3-04b306828c35";
const SeasonNum = process.env.MAIN_SEASON;

router.get("/api/v1/rewards/season_umbrella/:username", async (req, res) => {
  const { username } = req.params;
  const apiKey = req.headers["x-api-key"];
  try {
    if (apiKey !== API_KEY) return res.status(401).json({ error: "Invalid API key" });
    const user = await User.findOne({ username }).lean();
    if (!user) return res.status(404).json({ error: `User not found: ${username}` });
    const profile = await Profile.findOne({ accountId: user.accountId }).lean();
    if (!profile) return res.status(404).json({ error: `Profile not found for user: ${username}` });

    const umbrellaId = `AthenaGlider:Umbrella_Season_${SeasonNum}`;
    if (profile.profiles.athena.items[umbrellaId]?.quantity > 0) {
      return res.json({ message: "User already has the umbrella reward" });
    }

    const updatedItems = {
      ...profile.profiles.athena.items,
      [umbrellaId]: { quantity: 1, templateId: umbrellaId, attributes: { max_level_bonus: 0, level: 0, item_seen: false, xp: 0 } },
    };
    await Profile.updateOne({ accountId: user.accountId }, { $set: { "profiles.athena.items": updatedItems } });
    log.umbrella(`Season ${SeasonNum} umbrella added to ${username}`);
    Utils.SendEmptyGift(username, user.accountId);
    res.json({ message: "Umbrella reward added successfully" });
  } catch (error) {
    log.error(`Season umbrella error for ${username}: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
});

export default router;
