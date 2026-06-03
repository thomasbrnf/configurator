import puppeteer from 'puppeteer';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUTPUT_DIR = join(ROOT, 'public/models/thumbnails');
const PORT = 5174;
// Derived from BASE_URL in .env  →  vite config strips it to the pathname
const BASE = '/configurator/demo-dev';
const PAGE_URL = `http://localhost:${PORT}${BASE}/scripts/generate-thumbnails.html`;

function startVite() {
  return new Promise((resolve, reject) => {
    const proc = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const timeout = setTimeout(
      () => reject(new Error('Vite server did not start within 30 s')),
      30_000,
    );

    proc.stdout.on('data', (data) => {
      const text = data.toString();
      process.stdout.write(text);
      if (text.includes(`localhost:${PORT}`)) {
        clearTimeout(timeout);
        resolve(proc);
      }
    });

    proc.stderr.on('data', (d) => process.stderr.write(d));
    proc.on('error', reject);
  });
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('Starting Vite on port', PORT, '…');
  const viteProc = await startVite();
  console.log('Vite ready.\n');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    page.on('console', (msg) => console.log(`  [browser] ${msg.text()}`));
    page.on('pageerror', (err) => console.error('  [page error]', err.message));

    console.log('Loading', PAGE_URL);
    await page.goto(PAGE_URL, { waitUntil: 'networkidle2', timeout: 30_000 });

    console.log('Clicking "Generate All Thumbnails" …');
    await page.click('button'); // first button = Generate All

    console.log('Waiting for all 3 models to render (up to 2 min) …');
    await page.waitForFunction(
      () => document.getElementById('status')?.textContent?.includes('Generated'),
      { timeout: 120_000 },
    );

    const results = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.thumbnail-item')).map((item) => ({
        id: item.querySelector('small')?.textContent?.trim() ?? '',
        dataURL: item.querySelector('img')?.src ?? '',
      })).filter((r) => r.id && r.dataURL.startsWith('data:'));
    });

    if (results.length === 0) throw new Error('No thumbnails captured — check browser console output above.');

    for (const { id, dataURL } of results) {
      const buffer = Buffer.from(dataURL.split(',')[1], 'base64');
      const filepath = join(OUTPUT_DIR, `${id}.png`);
      writeFileSync(filepath, buffer);
      console.log('Saved:', filepath);
    }

    console.log(`\n✅  ${results.length} thumbnail(s) saved to public/models/thumbnails/`);
  } finally {
    await browser?.close();
    viteProc.kill();
  }
}

main().catch((err) => {
  console.error('\n❌ ', err.message);
  process.exit(1);
});
