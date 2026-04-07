import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import { dirname } from "dirname-filename-esm";
import destr from "destr";
import dotenv from "dotenv";
import { client } from "./bot/index.js";
import kv from "./core/store.js";
import Utils from "./core/helpers.js";
import log from "./core/logger.js";
import { DateAddHours } from "./handlers/auth.js";
import User from "./database/Schema/user.js";
import "./queue/src/server.js";
import "./banner.js";
import { v4 } from "uuid";
import { handleDiscordCallback } from "./bot/auth/auth.js";

// Service routers
import launcherRouter from "./services/launcher.js";
import shopRouter from "./services/shop.js";
import newsRouter, { newsStaticMiddleware } from "./services/news.js";
import hypeRouter from "./services/Hype.js";
import lawinRouter from "./services/Lawin.js";
import umbrellaRouter from "./services/seasonUmbrella.js";
import vbucksRouter from "./services/vbucks.js";
import xpRouter from "./services/XP.js";
import questRouter from "./services/Quest.js";

dotenv.config();

const __dirname = dirname(import.meta);

global.kv = kv;
global.JWT_SECRET = v4();
global.accessTokens = [];
global.refreshTokens = [];
global.clientTokens = [];
global.smartXMPP = false;
global.exchangeCodes = [];

const app = express();
const PORT = process.env.PORT;

await client.login(process.env.BOT_TOKEN);

let tokens = destr(fs.readFileSync(path.join(__dirname, "../tokens.json")).toString());
for (let tokenType in tokens) {
  for (let tokenIndex in tokens[tokenType]) {
    let decodedToken = jwt.decode(tokens[tokenType][tokenIndex].token.replace("eg1~", ""));
    if (DateAddHours(new Date(decodedToken.creation_date), decodedToken.hours_expire).getTime() <= new Date().getTime()) {
      tokens[tokenType].splice(Number(tokenIndex), 1);
    }
  }
}
fs.writeFileSync(path.join(__dirname, "../tokens.json"), JSON.stringify(tokens, null, 2) || "");
if (!tokens || !tokens.accessTokens) {
  await kv.set("tokens", fs.readFileSync(path.join(__dirname, "../tokens.json")).toString());
  tokens = destr(fs.readFileSync(path.join(__dirname, "../tokens.json")).toString());
}
global.accessTokens = tokens.accessTokens;
global.refreshTokens = tokens.refreshTokens;
global.clientTokens = tokens.clientTokens;

mongoose.set("strictQuery", true);
mongoose.connect(process.env.MONGO_URI)
  .then(() => log.database("Aeris Mongo Services Running"))
  .catch((error) => console.error("Error connecting to MongoDB: ", error));
mongoose.connection.on("error", (err) => {
  log.error("MongoDB failed to connect, please make sure you have MongoDB installed and running.");
  throw err;
});

// Middleware — must be before routes
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/news-assets", newsStaticMiddleware());
app.use("/assets", express.static(path.join(__dirname, "../assets")));

// Core routes
app.get("/", (req, res) => res.status(200).json({ status: "ok", uptime: process.uptime() }));

app.get("/auth/discord/callback", handleDiscordCallback);

app.get("/discord-profile/:discordId", async (req, res) => {
  try {
    const user = await User.findOne({ discordId: req.params.discordId });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.status(200).json({
      username: user.username,
      discriminator: "0000",
      email: user.email,
      mfa: user.mfa,
      canCreateCodes: user.canCreateCodes,
    });
  } catch (err) {
    log.error("Error fetching Discord profile: ", err);
    res.status(500).json({ error: "Failed to fetch Discord profile" });
  }
});

// Service routers
app.use(launcherRouter);
app.use(shopRouter);
app.use(newsRouter);
app.use(hypeRouter);
app.use(lawinRouter);
app.use(umbrellaRouter);
app.use(vbucksRouter);
app.use(xpRouter);
app.use(questRouter);

// Handler routes (fortnite game endpoints)
const importRoutes = async (dir) => {
  for (const fileName of fs.readdirSync(path.join(__dirname, dir))) {
    if (fileName.includes(".map")) continue;
    try {
      app.use((await import(`file://${__dirname}/${dir}/${fileName}`)).default);
    } catch (error) {
      console.log(fileName, error);
    }
  }
};
await importRoutes("handlers");

app.listen(PORT, () => {
  import("./socket/gateway.js");
}).on("error", async (err) => {
  if (err.message == "EADDRINUSE") {
    log.error(`Port ${PORT} is already in use!\nClosing in 3 seconds...`);
    process.exit(0);
  } else throw err;
});

// Known junk endpoints sent by the game client — suppress logging for these
const SILENT_ENDPOINTS = new Set(["/unknown", "/favicon.ico"]);

// The game client hits /unknown as part of its startup flow — return empty 200
app.get("/unknown", (req, res) => res.status(200).json({}));

const loggedUrls = new Set();
app.use((req, res, next) => {
  const url = req.originalUrl;
  if (!SILENT_ENDPOINTS.has(url)) {
    if (!loggedUrls.has(url)) {
      log.debug(`Missing endpoint: ${req.method} ${url} request port ${req.socket.localPort}`);
      loggedUrls.add(url);
    }
  }
  Utils.createError(
    "errors.com.epicgames.common.not_found",
    "Sorry the resource you were trying to find could not be found",
    undefined, 1004, undefined, 404, res
  );
});
