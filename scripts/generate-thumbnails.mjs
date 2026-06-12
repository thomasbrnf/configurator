#!/usr/bin/env node
/**
 * Thumbnail generator — fully automatic.
 *
 * Usage:
 *   npm run generate-thumbnails
 *
 * What it does:
 *   1. Starts a minimal static HTTP server for public/ + scripts/
 *   2. Opens a headless Chrome via puppeteer
 *   3. Renders every module and complete-set GLB with the same
 *      Sofa_Fabric-only material logic used in DynamicModel
 *   4. Saves {id}.jpg files directly to public/models/thumbnails/
 */

import puppeteer from "puppeteer";

import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PUBLIC = join(ROOT, "public");
const OUT_DIR = join(PUBLIC, "models", "thumbnails");
const PORT = 5174;

// ── Minimal static server ─────────────────────────────────────────────────────

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".glb": "model/gltf-binary",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function startServer() {
  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      const url = decodeURIComponent(req.url.split("?")[0]);

      let filePath;
      if (url.startsWith("/scripts/")) {
        filePath = join(__dirname, url.slice("/scripts/".length));
      } else {
        filePath = join(PUBLIC, url === "/" ? "index.html" : url);
      }

      try {
        const data = await readFile(filePath);
        
        const ext = extname(filePath).toLowerCase();
        res.writeHead(200, {
          "Content-Type": MIME[ext] || "application/octet-stream",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end("404 – " + filePath);
      }
    });

    server.listen(PORT, () => resolve(server));
    server.on("error", reject);
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  console.log(`Starting static server on http://localhost:${PORT} …`);
  const server = await startServer();

  // macOS does not expose WebGL to Chrome in headless mode (driver-level block).
  // Run as a real window — WebGL always works, and the window closes automatically.
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--window-size=960,680",
      "--disable-infobars",
    ],
  });

  console.log(
    "ℹ  A Chrome window will open briefly — it closes automatically when done.\n",
  );

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 800, height: 600 });

    // Forward browser console to Node stdout
    page.on("console", (msg) => {
      const t = msg.type();
      if (t === "error") process.stderr.write(`[browser] ${msg.text()}\n`);
      else process.stdout.write(`[browser] ${msg.text()}\n`);
    });
    page.on("pageerror", (err) =>
      process.stderr.write(`[page error] ${err}\n`),
    );

    // Pre-read textures on disk and inject as data URLs BEFORE any page script
    // runs, so they're available when generate() auto-starts on load.
    // This avoids all URL-encoding issues with double-space folder names.
    const CREMONA_DIR = join(PUBLIC, "materials", "CREMONA 02  24  96  81  77  34");
    const baseData   = (await readFile(join(CREMONA_DIR, "02_BaseColor_1k.webp"))).toString("base64");
    const normalData = (await readFile(join(CREMONA_DIR, "02_Normal_1k.webp"))).toString("base64");
    const baseDataURL   = `data:image/webp;base64,${baseData}`;
    const normalDataURL = `data:image/webp;base64,${normalData}`;

    // Load page WITHOUT ?auto=true so generate() doesn't fire before we inject.
    const targetUrl = `http://localhost:${PORT}/scripts/generate-thumbnails.html`;
    console.log(`Opening ${targetUrl} …`);
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });

    // Inject texture data URLs then manually click Generate.
    await page.evaluate((base, normal) => {
      window.__fabricBaseDataURL   = base;
      window.__fabricNormalDataURL = normal;
      document.getElementById("btnGenerate").click();
    }, baseDataURL, normalDataURL);

    console.log("Rendering models (this may take a minute) …\n");

    // Wait up to 10 minutes for all thumbnails to finish
    await page.waitForFunction("window.__thumbnailsComplete === true", {
      timeout: 600_000,
      polling: 500,
    });

    const results = await page.evaluate(() => window.__capturedThumbnails);
    const entries = Object.entries(results);

    console.log(
      `\nSaving ${entries.length} thumbnails → public/models/thumbnails/\n`,
    );

    for (const [id, dataURL] of entries) {
      const b64 = dataURL.replace(/^data:image\/webp;base64,/, "");
      const buf = Buffer.from(b64, "base64");
      const fname = `${id}.webp`;
      await writeFile(join(OUT_DIR, fname), buf);
      console.log(`  ✓  ${fname}`);
    }

    console.log("\n✅  All thumbnails saved.\n");
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error("\n❌ ", err.message);
  process.exit(1);
});
