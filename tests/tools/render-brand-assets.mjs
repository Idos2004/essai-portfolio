// Rend l'image Open Graph (1200x630) et les icônes PNG depuis favicon.svg.
// Usage : node render-brand-assets.mjs   (depuis tests/tools ; écrit dans ../../assets/img)
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// Navigateur : variable CHROME_PATH si définie, sinon le Chromium installé par Playwright.
const EXE = process.env.CHROME_PATH;
const portrait = 'data:image/webp;base64,' + fs.readFileSync(path.join(ROOT, 'assets/img/portrait/portrait-480.webp')).toString('base64');
const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;background:#0b0d12;position:relative;overflow:hidden;font-family:'Manrope',sans-serif;color:#f2f4f8}
.glow{position:absolute;right:-120px;top:-160px;width:760px;height:760px;border-radius:50%;background:radial-gradient(circle,rgba(169,155,255,.28),transparent 65%)}
.glow2{position:absolute;left:-200px;bottom:-260px;width:640px;height:640px;border-radius:50%;background:radial-gradient(circle,rgba(197,243,107,.12),transparent 65%)}
.mono{position:absolute;left:80px;top:70px;font:700 40px 'Space Grotesk';letter-spacing:-.02em}
.mono i{font-style:normal;color:#c5f36b}
.txt{position:absolute;left:80px;top:200px;width:620px}
h1{font:700 76px/1.02 'Space Grotesk';letter-spacing:-.03em}
h1 span{color:#c5f36b}
.role{margin-top:28px;font:500 28px/1.35 'Manrope';color:#d4d8e2}
.role b{color:#a99bff;font-weight:600}
.loc{position:absolute;left:80px;bottom:64px;font:600 24px 'Manrope';color:#9aa1b2;display:flex;align-items:center;gap:12px}
.loc:before{content:'';width:12px;height:12px;border-radius:50%;background:#c5f36b}
.ph{position:absolute;right:80px;top:65px;width:408px;height:500px;border-radius:28px;overflow:hidden;border:2px solid rgba(169,155,255,.45);box-shadow:0 30px 80px rgba(0,0,0,.55)}
.ph img{width:100%;height:100%;object-fit:cover;display:block}
.bar{position:absolute;left:80px;top:150px;width:64px;height:5px;border-radius:3px;background:linear-gradient(90deg,#c5f36b,#a99bff)}
</style></head><body><div class="glow"></div><div class="glow2"></div>
<div class="mono">BE<i>.</i></div><div class="bar"></div>
<div class="txt"><h1>BALOGOU <span>Eustache</span></h1>
<p class="role">Développeur web junior · <b>Concepteur de solutions numériques</b></p></div>
<div class="loc">Cotonou, Bénin</div>
<div class="ph"><img src="${portrait}" alt=""></div></body></html>`;

const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.setContent(html, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(500);
const fontsOk = await page.evaluate(() => document.fonts.check("700 20px 'Space Grotesk'") && document.fonts.check("500 20px 'Manrope'"));
console.log('polices chargées :', fontsOk);
fs.mkdirSync(path.join(ROOT, 'assets/img/og'), { recursive: true });
await page.screenshot({ path: path.join(ROOT, 'assets/img/og/og-cover.jpg'), type: 'jpeg', quality: 85 });
await ctx.close();

const svg = fs.readFileSync(path.join(ROOT, 'favicon.svg'), 'utf8');
fs.mkdirSync(path.join(ROOT, 'assets/img/icons'), { recursive: true });
for (const [size, name] of [[180, 'apple-touch-icon.png'], [512, 'icon-512.png']]) {
  const c = await browser.newContext({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  const p = await c.newPage();
  await p.setContent(`<body style="margin:0;background:transparent"><div style="width:${size}px;height:${size}px">${svg.replace(/<svg/, `<svg width="${size}" height="${size}"`)}</div></body>`);
  await p.screenshot({ path: path.join(ROOT, 'assets/img/icons', name), omitBackground: true });
  await c.close();
}
await browser.close();
