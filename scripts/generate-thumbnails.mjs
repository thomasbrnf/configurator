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

    const targetUrl = `http://localhost:${PORT}/scripts/generate-thumbnails.html?auto=true`;
    console.log(`Opening ${targetUrl} …`);

    await page.goto(targetUrl, { waitUntil: "networkidle2", timeout: 30_000 });

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
      const b64 = dataURL.replace(/^data:image\/jpeg;base64,/, "");
      const buf = Buffer.from(b64, "base64");
      const fname = `${id}.jpg`;
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
