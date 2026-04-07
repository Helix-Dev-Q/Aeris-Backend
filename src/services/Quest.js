import express from "express";
import User from "../database/Schema/user.js";
import Profile from "../database/Schema/profiles.js";
import log from "../core/logger.js";

const router = express.Router();
const API_KEY = process.env.GAME_API_KEY || "84059365-25d6-486f-81f3-04b306828c35";

router.get("/api/v1/quest/:username/:questId/:count", async (req, res) => {
  const { username, questId, count } = req.params;
  const apiKey = req.headers["x-api-key"];
  const questCount = parseInt(count);
  try {
    if (apiKey !== API_KEY) return res.status(401).json({ error: "Invalid API key" });
    if (isNaN(questCount) || questCount <= 0) return res.status(400).json({ error: "Invalid quest progress count" });

    const user = await User.findOne({ username }).lean();
    if (!user) return res.status(404).json({ error: `User not found: ${username}` });
    const profile = await Profile.findOne({ accountId: user.accountId });
    if (!profile) return res.status(404).json({ error: `Profile not found for user: ${username}` });

    const athenaProfile = profile.profiles.athena;
    let questKey = null, questItem = null;
    for (const [key, item] of Object.entries(athenaProfile.items)) {
      if (item.templateId === `Quest:${questId}`) { questKey = key; questItem = item; break; }
    }
    if (!questItem) return res.status(404).json({ error: `Quest ${questId} not found` });

    questItem.attributes.last_state_change_time = new Date().toISOString();

    // Find the first completion_ stat on this quest and increment it
    const completionKey = Object.keys(questItem.attributes).find(k => k.startsWith("completion_"));
    if (!completionKey) return res.status(400).json({ error: `Quest ${questId} has no completion attribute` });
    questItem.attributes[completionKey] = (questItem.attributes[completionKey] || 0) + questCount;

    await Profile.updateOne({ accountId: user.accountId }, { $set: { [`profiles.athena.items.${questKey}`]: questItem } });
    log.api(`Updated quest ${questId} for ${username} with ${questCount} progress`);
    res.json({ message: `Successfully updated quest ${questId} with ${questCount} progress` });
  } catch (error) {
    log.api(`Quest error for ${username}: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
});

export default router;
