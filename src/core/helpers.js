import axios from "axios";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import XMLBuilder from "xmlbuilder";
import User from "../database/Schema/user.js";
import Profile from "../database/Schema/profiles.js";
import Friends from "../database/Schema/friends.js";
import profileManager from "../database/manager.js";
import log from "./logger.js";
import { v4 } from "uuid";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

export default class Utils {
  static createError(errorCode, errorMessage, messageVars, numericErrorCode, error, statusCode, res) {
    log.error(`API Error ${numericErrorCode} - ${errorCode}: ${errorMessage}`);
    res.set({ "X-Epic-Error-Name": errorCode, "X-Epic-Error-Code": numericErrorCode });
    res.status(statusCode).json({ errorCode, errorMessage, messageVars, numericErrorCode, originatingService: "any", intent: "prod", error_description: errorMessage, error });
  }

  static async SendEmptyGift(username, accountId, res) {
    log.info(`Sending empty gift to ${username} (${accountId})`);
    try {
      await axios.post(`http://127.0.0.1:${process.env.PORT}/fortnite/api/game/v3/profile/*/client/emptygift`, {
        offerId: "e406693aa12adbc8b04ba7e6409c8ab3d598e8c3",
        currency: "MtxCurrency", currencySubType: "", expectedTotalPrice: "0", gameContext: "",
        receiverAccountIds: [accountId], giftWrapTemplateId: "GiftBox:gb_makegood",
        personalMessage: "Your personal message here", accountId, playerName: username,
      });
    } catch (err) {
      log.error(`Failed to send empty gift to ${username} (${accountId}): ${err.message}`);
      if (res) Utils.createError("errors.com.epicgames.gift.failed", "Failed to send empty gift", [username], 16022, err.message, 500, res);
    }
  }

  static async FetchApplication() {
    const req = await fetch("https://discord.com/api/v10/applications/@me", {
      method: "GET", headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` },
    });
    return await req.json();
  }

  static DecodeBase64(str) {
    return Buffer.from(str, "base64").toString();
  }

  static async CreateUser(discordId, username, email, plainPassword, isServer) {
    email = email.toLowerCase();
    if (!discordId || !username || !email || !plainPassword) return { message: "Username/email/password is required.", status: 400 };
    if (await User.findOne({ discordId })) return { message: "You already created an account!", status: 400 };
    const accountId = v4().replace(/-/gi, "");
    const emailFilter = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
    if (!emailFilter.test(email)) return { message: "You did not provide a valid email address!", status: 400 };
    if (username.length >= 25) return { message: "Your username must be less than 25 characters long.", status: 400 };
    if (username.length < 3) return { message: "Your username must be atleast 3 characters long.", status: 400 };
    if (plainPassword.length >= 128) return { message: "Your password must be less than 128 characters long.", status: 400 };
    const allowedCharacters = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~".split("");
    for (let character of username) {
      if (!allowedCharacters.includes(character)) return { message: "Your username has special characters, please remove them and try again.", status: 400 };
    }
    const BLOCKED = ["nigger","nigga","nigg","negro","chink","spic","kike","faggot","fag","retard","cunt","whore","slut","tranny","wetback","gook","cracker","beaner","hitler","nazi","kkk","pedophile","pedo","rapist","terrorist","isis","jihad","fuck","shit","bitch","cock","dick","pussy","bastard","motherfucker","nword","n1gg","n1g","f4g","sh1t","b1tch","fuk","fck","cnt","dik","puss"];
    const normalized = username.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/0/g,"o").replace(/1/g,"i").replace(/3/g,"e").replace(/4/g,"a").replace(/5/g,"s").replace(/8/g,"b").replace(/\$/g,"s").replace(/@/g,"a");
    if (BLOCKED.some(w => normalized.includes(w))) return { message: "That username contains inappropriate content.", status: 400 };
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    const lowercaseEmail = email.toLowerCase();
    try {
      await User.create({ created: new Date().toISOString(), banne: false, discordId, accountId, username, username_lower: username.toLowerCase(), email: lowercaseEmail, password: hashedPassword, plainPassword: plainPassword, isServer, matchmakingId: v4() }).then(async (user) => {
        await Profile.create({ created: user.created, accountId: user.accountId, profiles: await profileManager.createProfiles(user.accountId) });
        await Friends.create({ created: user.created, accountId: user.accountId });
      });
    } catch (err) {
      if (err.code === 11000) return { message: "Username or email is already in use.", status: 400 };
      return { message: "An unknown error has occured, please try again later.", status: 400 };
    }
    return { message: `Successfully created an account with the username ${username}`, status: 200 };
  }

  static GetXMPPStatus(fromId, toId, offline) {
    if (!global.Clients) return;
    const SenderData = global.Clients.find((i) => i.accountId === fromId);
    const ClientData = global.Clients.find((i) => i.accountId === toId);
    if (!SenderData || !ClientData) return;
    let xml = XMLBuilder.create("presence").attribute("to", ClientData.jid).attribute("xmlns", "jabber:client").attribute("from", SenderData.jid).attribute("type", offline ? "unavailable" : "available");
    if (SenderData.lastPresenceUpdate.away) xml = xml.element("show", "away").up().element("status", SenderData.lastPresenceUpdate.status).up();
    else xml = xml.element("status", SenderData.lastPresenceUpdate.status).up();
    ClientData.client.send(xml.toString());
  }

  static SendXMPPMessage(body, toAccountId) {
    if (!global.Clients) return;
    if (typeof body === "object") body = JSON.stringify(body);
    const receiver = global.Clients.find((i) => i.accountId === toAccountId);
    if (!receiver) return;
    receiver.client.send(XMLBuilder.create("message").attribute("from", "xmpp-admin@prod.ol.epicgames.com").attribute("to", receiver.jid).attribute("xmlns", "jabber:client").element("body", `${body}`).up().toString());
  }

  static GetVersion(req) {
    const memory = { season: 0, build: 0.0, CL: "0", lobby: "LobbySeason0" };
    const ua = (req.headers["user-agent"] || "").trim();
    if (!ua || !ua.includes("Fortnite")) return memory;
    const modernMatch = ua.match(/Release-([0-9]+)\.([0-9]+)(?:-CL-([0-9]+))?/);
    if (modernMatch) {
      const major = parseInt(modernMatch[1], 10);
      const minor = parseInt(modernMatch[2], 10);
      const cl = modernMatch[3] || "0";
      memory.season = major; memory.build = Number(`${major}.${minor}`); memory.CL = cl; memory.lobby = `LobbySeason${major}`;
      return memory;
    }
    let cl = "0";
    try { const clMatch = ua.match(/-CL-?([0-9]+)/i) || ua.match(/([0-9]{7,})/); if (clMatch) cl = clMatch[1]; } catch {}
    try {
      const legacyBuild = ua.split("Release-")[1]?.split("-")[0];
      if (legacyBuild && /^\d+\.\d+$/.test(legacyBuild)) {
        const [a, b] = legacyBuild.split(".");
        const season = parseInt(a, 10);
        memory.season = season; memory.build = Number(`${a}.${b.padEnd(2, "0")}`); memory.CL = cl;
        memory.lobby = season <= 1 ? `LobbySeason${season}` : "LobbyWinterDecor";
        return memory;
      }
    } catch {}
    const nCL = parseInt(cl, 10);
    if (!isNaN(nCL) && nCL > 0) {
      if (nCL <= 3790078) { const season = nCL < 3724489 ? 0 : 1; Object.assign(memory, { season, build: season === 0 ? 0.0 : 1.0, CL: cl, lobby: season === 0 ? "LobbySeason0" : "LobbySeason1" }); }
      else Object.assign(memory, { season: 2, build: 2.0, CL: cl, lobby: "LobbyWinterDecor" });
      return memory;
    }
    return memory;
  }

  static getOfferID(offerId) {
    // Build catalog dynamically from ShopConfig.json using deterministic offer IDs
    const makeOfferId = (seed) => Buffer.from(seed).toString("base64url").slice(0, 32);
    
    try {
      const shopConfigPath = path.join(__dirname, "../catalog/PreShop/ShopConfig.json");
      const shop = JSON.parse(fs.readFileSync(shopConfigPath, "utf-8"));
      
      const typePriority = (id) => {
        if (id.startsWith('AthenaCharacter:'))  return 100;
        if (id.startsWith('AthenaBackpack:'))    return 80;
        if (id.startsWith('AthenaPickaxe:'))     return 60;
        if (id.startsWith('AthenaGlider:'))      return 40;
        if (id.startsWith('AthenaItemWrap:'))    return 30;
        if (id.startsWith('AthenaDance:'))       return 20;
        if (id.startsWith('AthenaSpray:'))       return 15;
        if (id.startsWith('AthenaEmoji:'))       return 10;
        return 5;
      };

      // Check daily items
      for (const item of (shop.daily || [])) {
        const oid = makeOfferId(`daily:${item.id}`);
        if (oid === offerId) {
          return {
            name: "BRDailyStorefront",
            offerId: {
              offerId: oid,
              devName: item.id,
              offerType: "StaticPrice",
              prices: [{ currencyType: "MtxCurrency", regularPrice: item.price, finalPrice: item.price, basePrice: item.price }],
              itemGrants: [{ templateId: item.id, quantity: 1 }],
              requirements: [{ requirementType: "DenyOnItemOwnership", requiredId: item.id, minQuantity: 1 }],
            }
          };
        }
      }

      // Check featured bundles and individual items
      const validBundleTypes = ['AthenaCharacter:', 'AthenaBackpack:', 'AthenaPickaxe:', 'AthenaGlider:', 'AthenaItemWrap:', 'AthenaDance:', 'AthenaEmoji:', 'AthenaSpray:'];
      for (const set of (shop.featured || [])) {
        if (!set.items) continue;
        
        // Check bundle offer
        if (set.bundlePrice) {
          const bundleOid = makeOfferId(`bundle:${set.name}`);
          if (bundleOid === offerId) {
            const bundleItems = set.items
              .filter(i => validBundleTypes.some(t => i.id.startsWith(t)))
              .sort((a, b) => typePriority(b.id) - typePriority(a.id));
            return {
              name: "BRWeeklyStorefront",
              offerId: {
                offerId: bundleOid,
                devName: `Bundle: ${set.name}`,
                offerType: "StaticPrice",
                prices: [{ currencyType: "MtxCurrency", regularPrice: set.bundlePrice, finalPrice: set.bundlePrice, basePrice: set.bundlePrice }],
                itemGrants: bundleItems.map(i => ({ templateId: i.id, quantity: 1 })),
                requirements: bundleItems.map(i => ({ requirementType: "DenyOnItemOwnership", requiredId: i.id, minQuantity: 1 })),
              }
            };
          }
        }

        // Check individual items in set
        for (const item of set.items) {
          const oid = makeOfferId(`featured:${item.id}`);
          if (oid === offerId) {
            return {
              name: "BRWeeklyStorefront",
              offerId: {
                offerId: oid,
                devName: item.id,
                offerType: "StaticPrice",
                prices: [{ currencyType: "MtxCurrency", regularPrice: item.price, finalPrice: item.price, basePrice: item.price }],
                itemGrants: [{ templateId: item.id, quantity: 1 }],
                requirements: [{ requirementType: "DenyOnItemOwnership", requiredId: item.id, minQuantity: 1 }],
              }
            };
          }
        }
      }
    } catch (err) {
      log.error(`getOfferID error: ${err.message}`);
    }
    return null;
  }

  static async UpdateTokens() {
    try {
      await global.kv.set("tokens", JSON.stringify({ accessTokens: global.accessTokens, refreshTokens: global.refreshTokens, clientTokens: global.clientTokens }, null, 2));
    } catch (err) {
      log.error(`Failed to update tokens in KV: ${err.message}`);
    }
  }
}
