import express from "express";
const app = express.Router();
import Profile from "../database/Schema/profiles.js";
import Friends from "../database/Schema/friends.js";
import Utils from "../core/helpers.js";
import { verifyToken } from "../database/tokens/verify.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const keychain = JSON.parse(
  fs.readFileSync("./src/data/KeyChain/keychain.json", "utf8")
);

// Deterministic offer ID so purchase lookups always match
function makeOfferId(seed) {
  return Buffer.from(seed).toString("base64url").slice(0, 32);
}

// Canonical Fortnite V-Bucks prices by rarity + type
function getPrice(rarity, type) {
  const r = (rarity || "").toLowerCase();
  const t = (type || "").toLowerCase();
  const prices = {
    outfit:        { uncommon: 800,  rare: 1200, epic: 1500, legendary: 2000 },
    backpack:      { uncommon: 200,  rare: 200,  epic: 500,  legendary: 1000 },
    pickaxe:       { uncommon: 500,  rare: 800,  epic: 800,  legendary: 1500 },
    glider:        { uncommon: 500,  rare: 800,  epic: 1200, legendary: 2000 },
    emote:         { uncommon: 200,  rare: 500,  epic: 800,  legendary: 800  },
    wrap:          { uncommon: 200,  rare: 300,  epic: 500,  legendary: 500  },
    loadingscreen: { uncommon: 200,  rare: 200,  epic: 200,  legendary: 200  },
    music:         { uncommon: 200,  rare: 200,  epic: 200,  legendary: 200  },
    spray:         { uncommon: 200,  rare: 200,  epic: 200,  legendary: 200  },
    emoji:         { uncommon: 200,  rare: 200,  epic: 200,  legendary: 200  },
  };
  return prices[t]?.[r] ?? null;
}

// Derive type string from templateId prefix
function typeFromTemplateId(templateId) {
  if (templateId.startsWith("AthenaCharacter:"))    return "outfit";
  if (templateId.startsWith("AthenaBackpack:"))     return "backpack";
  if (templateId.startsWith("AthenaPickaxe:"))      return "pickaxe";
  if (templateId.startsWith("AthenaGlider:"))       return "glider";
  if (templateId.startsWith("AthenaDance:"))        return "emote";
  if (templateId.startsWith("AthenaItemWrap:"))     return "wrap";
  if (templateId.startsWith("AthenaLoadingScreen:"))return "loadingscreen";
  if (templateId.startsWith("AthenaMusicPack:"))    return "music";
  if (templateId.startsWith("AthenaSpray:"))        return "spray";
  if (templateId.startsWith("AthenaEmoji:"))        return "emoji";
  return null;
}

// Resolve the correct price for a shop item:
// 1. If rarity + type are stored → use canonical price table
// 2. Otherwise fall back to whatever price is in the config
function resolvePrice(item) {
  const type = item.type || typeFromTemplateId(item.id);
  if (item.rarity && type) {
    const canonical = getPrice(item.rarity, type);
    if (canonical !== null) return canonical;
  }
  return item.price ?? 800;
}

function getDisplayAssetPath(templateId, section = "daily") {
  const id = templateId.split(':')[1] || templateId;
  const prefix = section === "featured" ? "DA_Featured" : "DA_Daily";
  // Sprays and emojis use DA_Daily prefix regardless of section
  if (templateId.startsWith('AthenaSpray:') || templateId.startsWith('AthenaEmoji:')) {
    return `/Game/Catalog/DisplayAssets/DA_Daily_${id}.DA_Daily_${id}`;
  }
  return `/Game/Catalog/DisplayAssets/${prefix}_${id}.${prefix}_${id}`;
}

function buildCatalogFromShopConfig() {
  try {
    const shopConfigPath = path.join(__dirname, "../catalog/PreShop/ShopConfig.json");
    const shop = JSON.parse(fs.readFileSync(shopConfigPath, "utf-8"));

    const dailyEntries = shop.daily.map((item, i) => {
      const price = resolvePrice(item);
      return {
        offerId: makeOfferId(`daily:${item.id}`),
        devName: item.id,
        offerType: "StaticPrice",
        prices: [{
          currencyType: "MtxCurrency",
          regularPrice: price,
          finalPrice: price,
          basePrice: price,
          saleExpiration: "9999-12-31T23:59:59.999Z"
        }],
        itemGrants: [{ templateId: item.id, quantity: 1 }],
        requirements: [{
          requirementType: "DenyOnItemOwnership",
          requiredId: item.id,
          minQuantity: 1
        }],
        giftInfo: { bIsEnabled: true, forcedGiftBoxTemplateId: "", purchaseRequirements: [], giftRecordIds: [] },
        refundable: true,
        dailyLimit: -1,
        weeklyLimit: -1,
        monthlyLimit: -1,
        sortPriority: i + 1,
        catalogGroupPriority: 0,
        categories: [`Panel ${i + 1}`],
        displayAssetPath: getDisplayAssetPath(item.id, "daily")
      };
    });

    const featuredEntries = [];
    shop.featured.forEach((set, si) => {
      const panel = si + 7;
      
      // Bundle entry
      if (set.items && set.items.length > 0) {
        const validBundleTypes = ['AthenaCharacter:', 'AthenaBackpack:', 'AthenaPickaxe:', 'AthenaGlider:', 'AthenaItemWrap:', 'AthenaDance:', 'AthenaEmoji:', 'AthenaSpray:'];
        const bundleTypePriority = (id) => {
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
        
        const bundleItems = set.items
          .filter(i => validBundleTypes.some(t => i.id.startsWith(t)))
          .sort((a, b) => bundleTypePriority(b.id) - bundleTypePriority(a.id));
        
        if (bundleItems.length > 0) {
          const skinId = bundleItems.find(i => i.id.startsWith('AthenaCharacter:'))?.id || bundleItems[0].id;
          const skinDisplayId = skinId.split(':')[1] || skinId;
          // Bundle price = sum of individual resolved prices * 0.85, rounded to nearest 50
          const sumPrice = bundleItems.reduce((s, i) => s + resolvePrice(i), 0);
          const bundlePrice = set.bundlePrice ?? Math.round(sumPrice * 0.85 / 50) * 50;
          
          featuredEntries.push({
            offerId: makeOfferId(`bundle:${set.name}`),
            devName: `Bundle: ${set.name}`,
            title: set.name,
            shortDescription: "Bundle",
            offerType: "StaticPrice",
            prices: [{
              currencyType: "MtxCurrency",
              regularPrice: bundlePrice,
              finalPrice: bundlePrice,
              basePrice: bundlePrice,
              saleExpiration: "9999-12-31T23:59:59.999Z"
            }],
            itemGrants: bundleItems.map(i => ({ templateId: i.id, quantity: 1 })),
            additionalGrants: bundleItems.slice(1).map(i => ({ templateId: i.id, quantity: 1 })),
            requirements: bundleItems.map(i => ({
              requirementType: "DenyOnItemOwnership",
              requiredId: i.id,
              minQuantity: 1
            })),
            catalogGroup: set.name,
            metaInfo: [
              { key: "BundleItems", value: bundleItems.map(i => i.id).join(",") },
              { key: "BundleItemCount", value: String(bundleItems.length) },
            ],
            giftInfo: { bIsEnabled: true, forcedGiftBoxTemplateId: "", purchaseRequirements: [], giftRecordIds: [] },
            refundable: true,
            dailyLimit: -1,
            weeklyLimit: -1,
            monthlyLimit: -1,
            sortPriority: 999,
            catalogGroupPriority: 0,
            categories: [`Panel ${panel}`],
            displayAssetPath: `/Game/Catalog/DisplayAssets/DA_Featured_${skinDisplayId}.DA_Featured_${skinDisplayId}`
          });
        }
      }

      // Individual items - sorted: skin > backbling > pickaxe > glider > wrap > emote > spray > emoji
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

      // Sort items before adding
      const sortedItems = [...set.items].sort((a, b) => typePriority(b.id) - typePriority(a.id));

      sortedItems.forEach((item) => {
        const displayId = item.id.split(':')[1] || item.id;
        const price = resolvePrice(item);
        featuredEntries.push({
          offerId: makeOfferId(`featured:${item.id}`),
          devName: item.id,
          offerType: "StaticPrice",
          prices: [{
            currencyType: "MtxCurrency",
            regularPrice: price,
            finalPrice: price,
            basePrice: price,
            saleExpiration: "9999-12-31T23:59:59.999Z"
          }],
          itemGrants: [{ templateId: item.id, quantity: 1 }],
          requirements: [{
            requirementType: "DenyOnItemOwnership",
            requiredId: item.id,
            minQuantity: 1
          }],
          giftInfo: { bIsEnabled: true, forcedGiftBoxTemplateId: "", purchaseRequirements: [], giftRecordIds: [] },
          refundable: true,
          dailyLimit: -1,
          weeklyLimit: -1,
          monthlyLimit: -1,
          sortPriority: typePriority(item.id),
          catalogGroupPriority: 0,
          categories: [`Panel ${panel}`],
          displayAssetPath: getDisplayAssetPath(item.id, "featured")
        });
      });
    });

    return {
      refreshIntervalHrs: 24,
      dailyPurchaseHrs: 24,
      expiration: "9999-12-31T00:00:00.000Z",
      storefronts: [
        { name: "BRDailyStorefront", catalogEntries: dailyEntries },
        { name: "BRWeeklyStorefront", catalogEntries: featuredEntries }
      ]
    };
  } catch (err) {
    console.log("Failed to build catalog from ShopConfig.json:", err);
    return null;
  }
}

app.get("/fortnite/api/storefront/v2/catalog", (req, res) => {
  if (!req.headers["user-agent"]) {
    return res.status(400).end();
  }
  if (req.headers["user-agent"].includes("2870186")) {
    return res.status(404).end();
  }

  // Build catalog directly from ShopConfig.json
  const catalog = buildCatalogFromShopConfig();
  if (catalog) {
    res.json(catalog);
  } else {
    console.log("Failed to build catalog from ShopConfig.json");
    res.status(500).json({ error: "Internal server error" });
  }
});
app.get(
  "/fortnite/api/storefront/v2/gift/check_eligibility/recipient/:recipientId/offer/:offerId",
  verifyToken,
  async (req, res) => {
    const findOfferId = Utils.getOfferID(req.params.offerId);
    if (!findOfferId) {
      return Utils.createError(
        "errors.com.epicgames.fortnite.id_invalid",
        `Offer ID (id: "${req.params.offerId}") not found`,
        [req.params.offerId],
        16027,
        undefined,
        400,
        res
      );
    }
    const sender = await Friends.findOne({
      accountId: req.user.accountId,
    }).lean();
    const acceptedFriend = sender.list.accepted.find(
      (i) => i.accountId == req.params.recipientId
    );
    if (!acceptedFriend && req.params.recipientId != req.user.accountId) {
      return Utils.createError(
        "errors.com.epicgames.friends.no_relationship",
        `User ${req.user.accountId} is not friends with ${req.params.recipientId}`,
        [req.user.accountId, req.params.recipientId],
        28004,
        undefined,
        403,
        res
      );
    }
    const profiles = await Profile.findOne({
      accountId: req.params.recipientId,
    });
    const athena = profiles.profiles["athena"];
    for (const itemGrant of findOfferId.offerId.itemGrants) {
      if (!athena.items || typeof athena.items !== "object") {
        return Utils.createError(
          "errors.com.epicgames.modules.gamesubcatalog.purchase_not_allowed",
          `Could not purchase catalog offer ${findOfferId.offerId.devName}, item ${itemGrant.templateId} as 'items' is not an object`,
          [findOfferId.offerId.devName, itemGrant.templateId],
          28004,
          undefined,
          403,
          res
        );
      }
      const templateIdLowerCase = itemGrant.templateId.toLowerCase();
      const itemKeys = Object.keys(athena.items);
      if (
        itemKeys.some(
          (itemKey) => itemKey.toLowerCase() === templateIdLowerCase
        )
      ) {
        return Utils.createError(
          "errors.com.epicgames.modules.gamesubcatalog.purchase_not_allowed",
          `Could not purchase catalog offer ${findOfferId.offerId.devName}, item ${itemGrant.templateId}`,
          [findOfferId.offerId.devName, itemGrant.templateId],
          28004,
          undefined,
          403,
          res
        );
      }
    }
    res.json({
      price: findOfferId.offerId.prices[0],
      items: findOfferId.offerId.itemGrants,
    });
  }
);
app.get("/fortnite/api/storefront/v2/keychain", (req, res) => {
  res.json(keychain);
});
app.get("/catalog/api/shared/bulk/offers", (req, res) => {
  res.json({});
});
export default app;
//# sourceMappingURL=storefront.js.map


