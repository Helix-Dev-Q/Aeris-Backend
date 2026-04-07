import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Utils from "../core/helpers.js";

const app = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.get("/content/api/pages/*", async (req, res) => {
  const filePath = path.join(__dirname, "../data/ContentPages/Pages.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  const Contentpages = JSON.parse(JSON.stringify(JSON.parse(raw)));

  const memory = Utils.GetVersion(req);
  const season = memory.season;
  const build = memory.build || "";

  if (!Contentpages.dynamicbackgrounds) {
    Contentpages.dynamicbackgrounds = {
      _title: "dynamicbackgrounds",
      _type: "DynamicBackgroundList",
      backgrounds: { backgrounds: [] }
    };
  }
  if (!Array.isArray(Contentpages.dynamicbackgrounds.backgrounds.backgrounds)) {
    Contentpages.dynamicbackgrounds.backgrounds.backgrounds = [];
  }

  const bgs = Contentpages.dynamicbackgrounds.backgrounds.backgrounds;
  while (bgs.length < 2) {
    bgs.push({ _type: "DynamicBackground", key: "lobby", stage: "season11" });
  }

  const mainStages = {10:"seasonx",11:"season11",12:"season12",13:"season13",14:"season14",15:"season15",16:"season16",17:"season17",18:"season18",19:"season19",20:"season20",21:"season21",22:"season22",23:"season23",24:"season24",25:"season25",26:"season26",27:"season27",28:"season28",29:"season29",30:"season30",31:"season31",32:"season32",33:"chapter6",34:"chapter6s2",35:"chapter6ms1",36:"chapter6s3",37:"chapter6s4"};
  const eventStages = {"11.10":"fortnitemares","11.30":"Galileo","11.31":"Galileo","11.40":"Winter19","11.50":"LoveAndWar","14.40":"halloween2020","15.10":"XmasStore2020","19.01":"winter2021","23.10":"winterfest2022","28.01":"winterfest2023","31.40":"fortnitemares2024","31.41":"fortnitemares2024","37.50":"fortnitemares2025","37.51":"fortnitemares2025"};

  bgs[0]._type = bgs[1]._type = "DynamicBackground";
  bgs[0].key = bgs[1].key = "lobby";
  bgs[0].stage = mainStages[season] || "";
  bgs[1].stage = eventStages[build] || bgs[0].stage;

  // Resolve ALL local image paths anywhere in the response to hosted URLs
  const backendOrigin = `${req.protocol}://${req.get("host")}`;
  const imageKeys = ["image", "tileImage", "poster_front_image", "poster_back_image", "loading_screen_image", "playlist_tile_image"];

  function resolveImages(obj) {
    if (!obj || typeof obj !== "object") return;
    if (Array.isArray(obj)) { obj.forEach(resolveImages); return; }
    for (const key of Object.keys(obj)) {
      if (imageKeys.includes(key) && typeof obj[key] === "string" && obj[key] && !obj[key].startsWith("http")) {
        obj[key] = `${backendOrigin}/news-assets/${path.basename(obj[key])}`;
      } else {
        resolveImages(obj[key]);
      }
    }
  }
  resolveImages(Contentpages);

  res.json(Contentpages);
});

export default app;
