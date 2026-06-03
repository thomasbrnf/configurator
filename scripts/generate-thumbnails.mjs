import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const THUMBNAILS_DIR = path.resolve(__dirname, "../public/models/thumbnails");
const URL = "http://localhost:5173/?thumbnails";

fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();

await page.setViewport({ width: 1280, height: 900 });

// Intercept downloads via CDP
const client = await page.createCDPSession();
await client.send("Browser.setDownloadBehavior", {
  behavior: "allow",
  downloadPath: THUMBNAILS_DIR,
  eventsEnabled: true,
});

const pendingDownloads = new Map();

client.on("Browser.downloadWillBegin", ({ guid, suggestedFilename }) => {
  pendingDownloads.set(guid, suggestedFilename);
  console.log(`Downloading: ${suggestedFilename}`);
});

client.on("Browser.downloadProgress", ({ guid, state }) => {
  if (state === "completed") {
    console.log(`Saved: ${pendingDownloads.get(guid)}`);
    pendingDownloads.delete(guid);
  } else if (state === "canceled") {
    console.error(`Failed: ${pendingDownloads.get(guid)}`);
    pendingDownloads.delete(guid);
  }
});

console.log(`Opening ${URL}…`);
await page.goto(URL, { waitUntil: "networkidle0" });

// Wait until the status text says "Done"
console.log("Rendering thumbnails…");
await page.waitForFunction(
  () => {
    const el = document.querySelector("p");
    return el && el.textContent.includes("Done");
  },
  { timeout: 120_000, polling: 500 }
);

// Wait for all in-flight downloads to complete
const deadline = Date.now() + 15_000;
while (pendingDownloads.size > 0 && Date.now() < deadline) {
  await new Promise((r) => setTimeout(r, 200));
}

await browser.close();
console.log(`\nAll thumbnails saved to ${THUMBNAILS_DIR}`);
