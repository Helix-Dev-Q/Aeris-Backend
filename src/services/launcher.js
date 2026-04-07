import express from "express";
import bcrypt from "bcrypt";
import log from "../core/logger.js";
import mongoose from "mongoose";

const router = express.Router();

const UserSchema = new mongoose.Schema({}, { strict: false, collection: "users" });
const User = mongoose.models.LauncherUser || mongoose.model("LauncherUser", UserSchema, "users");

const ProfileSchema = new mongoose.Schema({}, { strict: false, collection: "profiles" });
const Profile = mongoose.models.LauncherProfile || mongoose.model("LauncherProfile", ProfileSchema, "profiles");

async function getDiscordAvatar(discordId) {
  if (!discordId || !process.env.BOT_TOKEN) return null;
  try {
    const res = await fetch(`https://discord.com/api/v10/users/${discordId}`, {
      headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.avatar) {
      const ext = data.avatar.startsWith("a_") ? "gif" : "png";
      return `https://cdn.discordapp.com/avatars/${discordId}/${data.avatar}.${ext}?size=256`;
    }
    return `https://cdn.discordapp.com/embed/avatars/${parseInt(discordId.slice(-1), 10) % 5}.png`;
  } catch { return null; }
}

async function getHighestDiscordRole(discordId) {
  if (!discordId || !process.env.BOT_TOKEN || !process.env.GUILD_ID) return null;
  try {
    // Fetch member roles and guild roles in parallel
    const [memberRes, guildRes] = await Promise.all([
      fetch(`https://discord.com/api/v10/guilds/${process.env.GUILD_ID}/members/${discordId}`, {
        headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` },
      }),
      fetch(`https://discord.com/api/v10/guilds/${process.env.GUILD_ID}/roles`, {
        headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` },
      }),
    ]);
    if (!memberRes.ok || !guildRes.ok) return null;
    const member = await memberRes.json();
    const allRoles = await guildRes.json();
    if (!member.roles?.length) return null;

    // Build a map of roleId -> role, filter to roles the member has, sort by position descending
    const roleMap = Object.fromEntries(allRoles.map(r => [r.id, r]));
    const memberRoles = member.roles
      .map(id => roleMap[id])
      .filter(Boolean)
      .sort((a, b) => b.position - a.position);

    // Return the highest role name (skip @everyone which has position 0)
    const highest = memberRoles.find(r => r.position > 0);
    return highest ? highest.name : null;
  } catch { return null; }
}

async function isPrivilegedUser(discordId) {
  const bypassRoles = (process.env.USERNAME_BYPASS_ROLES || "").split(",").map(r => r.trim()).filter(Boolean);
  if (!bypassRoles.length || !discordId || !process.env.BOT_TOKEN || !process.env.GUILD_ID) return false;
  try {
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${process.env.GUILD_ID}/members/${discordId}`,
      { headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` } }
    );
    if (!res.ok) return false;
    const member = await res.json();
    return (member.roles || []).some(r => bypassRoles.includes(r));
  } catch { return false; }
}

function buildProfile(user, discordAvatar, privileged = false, highestRole = null) {
  return {
    accountId: user.accountId,
    displayName: user.username,
    email: user.email,
    discordId: user.discordId || null,
    discordAvatar,
    banned: user.banned,
    lastUsernameChange: user.lastUsernameChange || null,
    role: highestRole || user.role || null,
    usernameBypass: privileged,
  };
}

router.post("/api/user/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password are required." });
  try {
    const user = await User.findOne({ email: email.toLowerCase() }).lean();
    if (!user) return res.status(401).json({ error: "Invalid email or password." });
    if (user.banned) return res.status(403).json({ error: "Your account has been banned." });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid email or password." });
    log.api(`Launcher login: ${user.username} (${user.accountId})`);
    const [discordAvatar, privileged, highestRole] = await Promise.all([
      getDiscordAvatar(user.discordId),
      isPrivilegedUser(user.discordId),
      getHighestDiscordRole(user.discordId),
    ]);
    res.json(buildProfile(user, discordAvatar, privileged, highestRole));
  } catch (err) {
    log.error(`Launcher login error: ${err.message}`);
    res.status(500).json({ error: "Internal server error." });
  }
});

router.get("/api/user/profile/:accountId", async (req, res) => {
  try {
    const user = await User.findOne({ accountId: req.params.accountId }).lean();
    if (!user) return res.status(404).json({ error: "User not found." });
    const [discordAvatar, privileged, highestRole] = await Promise.all([
      getDiscordAvatar(user.discordId),
      isPrivilegedUser(user.discordId),
      getHighestDiscordRole(user.discordId),
    ]);
    res.json(buildProfile(user, discordAvatar, privileged, highestRole));
  } catch (err) {
    log.error(`Launcher profile error: ${err.message}`);
    res.status(500).json({ error: "Internal server error." });
  }
});

router.patch("/api/user/username", async (req, res) => {
  const { accountId, newUsername } = req.body;
  if (!accountId || !newUsername) return res.status(400).json({ error: "accountId and newUsername are required." });
  const trimmed = newUsername.trim();
  if (trimmed.length < 3 || trimmed.length > 24) return res.status(400).json({ error: "Username must be between 3 and 24 characters." });
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) return res.status(400).json({ error: "Username can only contain letters, numbers, and underscores." });

  const BLOCKED = ["nigger","nigga","nig","negro","chink","spic","kike","faggot","fag","retard","cunt","whore","slut","tranny","wetback","gook","cracker","beaner","jeffreyepstein","jeffepstein","epstein","hitlerr","hitler","nazi","kkk","pedophile","pedo","rapist","terrorist","isis","jihad","fuck","shit","ass","bitch","cock","dick","pussy","bastard","motherfucker"];
  const lower = trimmed.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (BLOCKED.some(w => lower.includes(w))) return res.status(400).json({ error: "That username contains inappropriate content." });

  try {
    const user = await User.findOne({ accountId }).lean();
    if (!user) return res.status(404).json({ error: "User not found." });

    const bypassRoles = (process.env.USERNAME_BYPASS_ROLES || "").split(",").map(r => r.trim()).filter(Boolean);
    let isPrivileged = false;
    if (bypassRoles.length > 0 && user.discordId && process.env.BOT_TOKEN && process.env.GUILD_ID) {
      try {
        const memberRes = await fetch(
          `https://discord.com/api/v10/guilds/${process.env.GUILD_ID}/members/${user.discordId}`,
          { headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` } }
        );
        if (memberRes.ok) {
          const member = await memberRes.json();
          isPrivileged = (member.roles || []).some(r => bypassRoles.includes(r));
        }
      } catch { /* treat as non-privileged */ }
    }

    const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
    if (!isPrivileged && user.lastUsernameChange) {
      const elapsed = Date.now() - new Date(user.lastUsernameChange).getTime();
      if (elapsed < ONE_WEEK) {
        const daysLeft = Math.ceil((ONE_WEEK - elapsed) / (24 * 60 * 60 * 1000));
        return res.status(429).json({ error: `You can only change your username once per week. Try again in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}.` });
      }
    }

    const conflict = await User.findOne({ username_lower: trimmed.toLowerCase(), accountId: { $ne: accountId } }).lean();
    if (conflict) return res.status(409).json({ error: "That username is already taken." });

    await User.updateOne({ accountId }, { $set: { username: trimmed, username_lower: trimmed.toLowerCase(), lastUsernameChange: new Date() } });
    log.api(`Username changed: ${user.username} -> ${trimmed} (${accountId})`);
    const now = new Date();

    if (process.env.USERNAME_CHANGE_WEBHOOK) {
      const timestamp = now.toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
      fetch(process.env.USERNAME_CHANGE_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embeds: [{ title: "Username Changed", color: 0x9370db, fields: [{ name: "Old Username", value: user.username, inline: true }, { name: "New Username", value: trimmed, inline: true }, { name: "Discord ID", value: user.discordId ? `<@${user.discordId}> (${user.discordId})` : "N/A", inline: false }, { name: "Date & Time", value: timestamp, inline: false }], footer: { text: "Aeris Launcher" }, timestamp: now.toISOString() }] }),
      }).catch(err => log.error(`Username webhook failed: ${err.message}`));
    }

    res.json({ success: true, displayName: trimmed, lastUsernameChange: now.toISOString() });
  } catch (err) {
    log.error(`Username change error: ${err.message}`);
    res.status(500).json({ error: "Internal server error." });
  }
});

router.get("/api/daily/status/:accountId", async (req, res) => {
  try {
    const user = await User.findOne({ accountId: req.params.accountId }).lean();
    if (!user) return res.status(404).json({ error: "User not found." });
    const ONE_DAY = 24 * 60 * 60 * 1000;
    const DAILY_AMOUNT = 100;
    if (!user.lastDailyClaim) return res.json({ canClaim: true, amount: DAILY_AMOUNT, nextClaimAt: null });
    const elapsed = Date.now() - new Date(user.lastDailyClaim).getTime();
    const canClaim = elapsed >= ONE_DAY;
    const nextClaimAt = new Date(new Date(user.lastDailyClaim).getTime() + ONE_DAY).toISOString();
    res.json({ canClaim, amount: DAILY_AMOUNT, nextClaimAt });
  } catch (err) {
    log.error(`Daily status error: ${err.message}`);
    res.status(500).json({ error: "Internal server error." });
  }
});

router.post("/api/daily/claim/:accountId", async (req, res) => {
  try {
    const { accountId } = req.params;
    const DAILY_AMOUNT = 100;
    const ONE_DAY = 24 * 60 * 60 * 1000;
    const user = await User.findOne({ accountId }).lean();
    if (!user) return res.status(404).json({ error: "User not found." });
    if (user.lastDailyClaim) {
      const elapsed = Date.now() - new Date(user.lastDailyClaim).getTime();
      if (elapsed < ONE_DAY) {
        const hoursLeft = Math.ceil((ONE_DAY - elapsed) / (60 * 60 * 1000));
        return res.status(429).json({ error: `Already claimed today. Come back in ${hoursLeft}h.`, nextClaimAt: new Date(new Date(user.lastDailyClaim).getTime() + ONE_DAY).toISOString() });
      }
    }
    const profile = await Profile.findOne({ accountId }).lean();
    if (!profile) return res.status(404).json({ error: "Profile not found." });
    const currency = { ...(profile.profiles?.common_core?.items?.["Currency:MtxPurchased"] || { quantity: 0 }) };
    currency.quantity = (currency.quantity || 0) + DAILY_AMOUNT;
    const now = new Date();
    await Profile.updateOne({ accountId }, { $set: { "profiles.common_core.items.Currency:MtxPurchased": currency } });
    await User.updateOne({ accountId }, { $set: { lastDailyClaim: now } });
    log.api(`Daily claim: +${DAILY_AMOUNT} V-Bucks for ${user.username}`);
    res.json({ success: true, amount: DAILY_AMOUNT, nextClaimAt: new Date(now.getTime() + ONE_DAY).toISOString() });
  } catch (err) {
    log.error(`Daily claim error: ${err.message}`);
    res.status(500).json({ error: "Internal server error." });
  }
});

router.get("/api/rpc/config", (req, res) => {
  const clientId = process.env.CLIENT_ID;
  if (!clientId) return res.status(503).json({ error: "Discord RPC is not configured." });
  res.json({ clientId });
});

export default router;
