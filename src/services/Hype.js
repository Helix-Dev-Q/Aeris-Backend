import express from "express";
import User from "../database/Schema/user.js";
import Profile from "../database/Schema/profiles.js";
import log from "../core/logger.js";

const router = express.Router();
const API_KEY = process.env.GAME_API_KEY || "84059365-25d6-486f-81f3-04b306828c35";

// Public leaderboard endpoint — top 100 by arena_hype
router.get("/api/v1/leaderboard/arena", async (req, res) => {
  try {
    const profiles = await Profile.find(
      { "profiles.athena.stats.attributes.arena_hype": { $gt: 0 } },
      { accountId: 1, "profiles.athena.stats.attributes.arena_hype": 1 }
    ).lean();

    const accountIds = profiles.map(p => p.accountId);
    const users = await User.find(
      { accountId: { $in: accountIds } },
      { accountId: 1, username: 1, discordId: 1 }
    ).lean();

    const userMap = Object.fromEntries(users.map(u => [u.accountId, u]));

    // Fetch fresh Discord avatars for all users with a discordId
    const avatarCache = {};
    if (process.env.BOT_TOKEN) {
      await Promise.all(
        users
          .filter(u => u.discordId)
          .map(async u => {
            try {
              const r = await fetch(`https://discord.com/api/v10/users/${u.discordId}`, {
                headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` },
              });
              const d = await r.json();
              if (d.avatar) {
                const ext = d.avatar.startsWith("a_") ? "gif" : "png";
                avatarCache[u.accountId] = `https://cdn.discordapp.com/avatars/${u.discordId}/${d.avatar}.${ext}?size=128`;
              } else {
                // Default Discord avatar based on discriminator
                const index = Number(BigInt(u.discordId) % 5n);
                avatarCache[u.accountId] = `https://cdn.discordapp.com/embed/avatars/${index}.png`;
              }
            } catch (e) {
              log.error(`Avatar fetch failed for ${u.discordId}: ${e.message}`);
            }
          })
      );
    }

    const entries = profiles
      .map(p => ({
        accountId: p.accountId,
        username: userMap[p.accountId]?.username ?? "Unknown",
        discordId: userMap[p.accountId]?.discordId ?? null,
        avatar: avatarCache[p.accountId] ?? null,
        hype: p.profiles?.athena?.stats?.attributes?.arena_hype ?? 0,
      }))
      .sort((a, b) => b.hype - a.hype)
      .slice(0, 100)
      .map((e, i) => ({ ...e, rank: i + 1 }));

    res.json(entries);
  } catch (err) {
    log.error(`Leaderboard error: ${err.message}`);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

router.get("/api/v1/rewards/managehype/:username/:reason", async (req, res) => {
  const { username, reason } = req.params;
  const apiKey = req.headers["x-api-key"];
  try {
    if (apiKey !== API_KEY) return res.status(401).json({ error: "Invalid API key" });
    if (!["Elimination","Win","Top 3","Top 7","Top 12","Bus Fare"].includes(reason)) {
      return res.status(400).json({ error: "Invalid reason" });
    }
    const user = await User.findOne({ username }).lean();
    if (!user) return res.status(404).json({ error: `User not found: ${username}` });
    const profile = await Profile.findOne({ accountId: user.accountId }).lean();
    if (!profile) return res.status(404).json({ error: `Profile not found for user: ${username}` });

    const attributes = { ...profile.profiles.athena.stats.attributes };
    const currentHype = attributes.arena_hype || 0;
    let amount = 0, removeAmount = 0;

    switch (reason) {
      case "Elimination": amount = 20; break;
      case "Win":         amount = 60; break;
      case "Top 3":       amount = 2;  break;
      case "Top 7":       amount = 4;  break;
      case "Top 12":      amount = 6;  break;
      case "Bus Fare":
        if (currentHype >= 14000)     removeAmount = 10;
        else if (currentHype >= 500)  removeAmount = 8;
        else if (currentHype >= 445)  removeAmount = 8;
        else if (currentHype >= 300)  removeAmount = 8;
        else if (currentHype >= 225)  removeAmount = 5;
        else if (currentHype >= 175)  removeAmount = 3;
        else if (currentHype >= 125)  removeAmount = 1;
        break;
    }

    const newHype = Math.max(0, currentHype + amount - removeAmount);
    attributes.arena_hype = newHype;
    await Profile.updateOne({ accountId: user.accountId }, { $set: { "profiles.athena.stats.attributes": attributes } });

    const message = removeAmount === 0 ? `Successfully added ${amount} Hype` : `Successfully ${amount > 0 ? "added" : "removed"} Hype`;
    log.hype(`${message} for ${username}, new Hype: ${newHype}`);
    res.json({ message, hype: newHype });
  } catch (error) {
    log.error(`ManageHype error for ${username}: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
});

export default router;
