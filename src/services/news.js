import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { dirname } from "path";
import log from "../core/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

const NEWS_FILE  = path.join(__dirname, "../../news.html");
const ASSETS_DIR = path.join(__dirname, "../../assets (News)");

export function newsStaticMiddleware() {
  if (fs.existsSync(ASSETS_DIR)) {
    return express.static(ASSETS_DIR);
  }
  return (_req, _res, next) => next();
}

function parseNewsHtml() {
  const html = fs.readFileSync(NEWS_FILE, "utf8");
  const items = [];
  const articleRegex = /<article([\s\S]*?)>/g;
  let match;
  let id = 1;

  while ((match = articleRegex.exec(html)) !== null) {
    const attrs = match[1];
    const get = (key) => {
      const m = attrs.match(new RegExp(`data-${key}="([^"]*)"`));
      return m ? m[1] : "";
    };

    let image = get("image");
    if (image && !image.startsWith("http")) {
      const filename = path.basename(image);
      // Use relative path — the frontend will prepend the backend URL
      image = `/news-assets/${encodeURIComponent(filename)}`;
    }

    const position = get("position") || "center";
    const author = get("author") || process.env.NEWS_AUTHOR || "Aeris";
    items.push({ id: id++, image, author, title: get("title"), message: get("message"), position });
  }

  return items;
}

router.get("/launcher/api/news", (_req, res) => {
  try {
    res.json(parseNewsHtml());
  } catch (err) {
    log.error(`News error: ${err.message}`);
    res.status(500).json({ error: "Failed to load news" });
  }
});

router.get("/launcher/api/news/version", (_req, res) => {
  try {
    const content = fs.readFileSync(NEWS_FILE, "utf8");
    const hash = crypto.createHash("md5").update(content).digest("hex");
    res.json({ version: hash });
  } catch (err) {
    res.status(500).json({ error: "Failed to read news file" });
  }
});

export default router;
