#!/usr/bin/env node
// Harnais QA du portfolio : node qa.mjs [--out <dossier>] [--lighthouse]
// Rapport seulement : code de sortie 0 meme en presence de problemes.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHROME = process.env.CHROME_PATH || undefined; // repli : Chromium par defaut de Playwright
const argv = process.argv.slice(2);
const argVal = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const ROOT = path.resolve(argVal('--root') || path.join(HERE, '..'));
const WITH_HEADERS = argv.includes('--headers');
const OUT = path.resolve(argVal('--out') || path.join(path.resolve(process.env.TEMP || HERE), 'qa-out'));
const WITH_LH = argv.includes('--lighthouse');
const SHOTS = path.join(OUT, 'screens');
fs.mkdirSync(SHOTS, { recursive: true });

const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '1024', width: 1024, height: 768 },
  { name: '768', width: 768, height: 1024 },
  { name: '390', width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: '360', width: 360, height: 740, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
];
const AXE_VPS = ['1440', '390'];
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.avif': 'image/avif', '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.ttf': 'font/ttf', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.pdf': 'application/pdf',
  '.mp4': 'video/mp4', '.webm': 'video/webm',
};

function loadVercelHeaders() {
  if (!WITH_HEADERS) return [];
  const f = path.join(ROOT, 'vercel.json');
  if (!fs.existsSync(f)) { console.log('! --headers : pas de vercel.json'); return []; }
  try {
    const cfg = JSON.parse(fs.readFileSync(f, 'utf8'));
    return (cfg.headers || []).map((h) => {
      const parts = h.source.split(/(\(\.\*\)|:\w+\*|:\w+|\*)/).map((t) => {
        if (t === '(.*)' || /^:\w+\*$/.test(t) || t === '*') return '.*';
        if (/^:\w+$/.test(t)) return '[^/]+';
        return [...t].map((ch) => (".+?^${}|()[]".includes(ch) || ch.charCodeAt(0) === 92 ? String.fromCharCode(92) + ch : ch)).join('');
      });
      return { re: new RegExp('^' + parts.join('') + '$'), headers: h.headers || [] };
    });
  } catch (e) { console.log('! vercel.json illisible', e.message); return []; }
}

function startServer() {
  const vh = loadVercelHeaders();
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent((req.url || '/').split('?')[0].split('#')[0]);
    if (p.endsWith('/')) p += 'index.html';
    let file = path.normalize(path.join(ROOT, p));
    const send = (f, status) => {
      const hd = { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' };
      const reqPath = (req.url || '/').split('?')[0];
      for (const rule of vh) if (rule.re.test(reqPath) || rule.re.test(p)) for (const { key, value } of rule.headers) hd[key] = value;
      res.writeHead(status, hd);
      fs.createReadStream(f).pipe(res);
    };
    const ok = file.startsWith(ROOT) && !file.includes(`${path.sep}node_modules${path.sep}`) && !file.includes(`${path.sep}.git${path.sep}`);
    if (ok && fs.existsSync(file) && fs.statSync(file).isFile()) return send(file, 200);
    const nf = path.join(ROOT, '404.html');
    if (fs.existsSync(nf)) return send(nf, 404);
    res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found');
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port })));
}

// ---------- fonctions evaluees dans la page ----------
const PAGE_HELPERS = `
  window.__sel = (el) => {
    if (!el || !el.tagName) return '';
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    const c = (typeof el.className === 'string' ? el.className : '').trim().split(/\\s+/).filter(Boolean).slice(0, 2);
    if (c.length) s += '.' + c.join('.');
    return s;
  };
`;

async function scrollThrough(page) {
  await page.evaluate(async () => {
    const h = () => document.documentElement.scrollHeight;
    for (let y = 0; y < h(); y += Math.max(300, innerHeight * 0.6)) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 90)); }
    scrollTo(0, h()); await new Promise((r) => setTimeout(r, 250));
  });
}

async function newPage(browser, vp, extra = {}) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch,
    deviceScaleFactor: vp.deviceScaleFactor || 1, ...extra,
  });
  const page = await ctx.newPage();
  await page.addInitScript(PAGE_HELPERS);
  return { ctx, page };
}

async function load(page, url) {
  try { await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 }); }
  catch { try { await page.goto(url, { waitUntil: 'load', timeout: 20000 }); } catch (e) { return String(e.message).split('\n')[0]; } }
  return null;
}

// ---------- analyses ----------
const overflowFn = () => {
  const iw = innerWidth, sw = document.documentElement.scrollWidth;
  const culprits = [];
  if (sw > iw) {
    const clipped = (el) => {
      for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
        const o = getComputedStyle(p).overflowX;
        if (o !== 'visible') { const r = p.getBoundingClientRect(); if (r.right <= iw + 1 && r.left >= -1) return true; }
      }
      return false;
    };
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if ((r.right > iw + 1 || r.left < -1) && !clipped(el)) culprits.push({ sel: window.__sel(el), right: Math.round(r.right), left: Math.round(r.left) });
    }
  }
  return { scrollWidth: sw, innerWidth: iw, overflow: sw > iw, culprits: culprits.slice(0, 10), culpritCount: culprits.length };
};

const brokenImgFn = () => [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && (i.currentSrc || i.src)).map((i) => i.currentSrc || i.src);

const seoFn = () => {
  const q = (s) => document.querySelector(s);
  const meta = (sel) => q(sel)?.getAttribute('content') ?? null;
  const title = document.title || '';
  const desc = meta('meta[name="description"]');
  const jsonld = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => { try { JSON.parse(s.textContent); return 'ok'; } catch { return 'invalide'; } });
  const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => +h.tagName[1]);
  const skips = []; let prev = 0;
  hs.forEach((l, i) => { if (prev && l > prev + 1) skips.push(`h${prev}->h${l} (#${i + 1})`); prev = l; });
  if (hs.length && hs[0] !== 1) skips.unshift(`premier titre = h${hs[0]}`);
  const imgs = [...document.images];
  const blank = (rel) => rel.length === 0;
  return {
    title, titleLen: title.length,
    description: desc, descriptionLen: desc ? desc.length : 0,
    canonical: q('link[rel="canonical"]')?.href ?? null,
    og: { title: meta('meta[property="og:title"]'), description: meta('meta[property="og:description"]'), image: meta('meta[property="og:image"]'), url: meta('meta[property="og:url"]'), type: meta('meta[property="og:type"]') },
    twitterCard: meta('meta[name="twitter:card"]'),
    jsonLd: jsonld, lang: document.documentElement.lang || null,
    h1Count: hs.filter((l) => l === 1).length, headingSkips: skips,
    imgsNoAlt: imgs.filter((i) => !i.hasAttribute('alt')).map((i) => i.getAttribute('src')),
    imgsNoSize: imgs.filter((i) => !i.getAttribute('width') || !i.getAttribute('height')).map((i) => i.getAttribute('src')),
    imgCount: imgs.length,
    blankBadLinks: [...document.querySelectorAll('a[target="_blank"]')].filter((a) => !/\b(noopener|noreferrer)\b/.test(a.rel)).map((a) => a.href),
    deadAnchors: [...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute('href')).filter((h) => h.length > 1 && !document.getElementById(h.slice(1)) && !document.getElementsByName(h.slice(1)).length),
    viewportMeta: meta('meta[name="viewport"]'), themeColor: meta('meta[name="theme-color"]'),
    favicon: q('link[rel~="icon"]')?.getAttribute('href') ?? null,
    externalLinks: [...new Set([...document.querySelectorAll('a[href]')].map((a) => a.href).filter((h) => /^https?:/i.test(h) && new URL(h).origin !== location.origin))],
  };
};

const hiddenContentFn = () => {
  const out = [];
  const eff = (el) => { let o = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) o *= parseFloat(getComputedStyle(e).opacity); return o; };
  for (const el of document.querySelectorAll('body *')) {
    if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || el.hidden || el.closest('[hidden],[aria-hidden="true"]')) continue;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1) || el.tagName === 'IMG';
    if (!own) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const o = eff(el);
    if (o < 0.05) out.push({ sel: window.__sel(el), opacity: +o.toFixed(3), text: (el.textContent || '').trim().slice(0, 40) });
  }
  return { count: out.length, items: out.slice(0, 12) };
};

const focusInfoFn = () => {
  const el = document.activeElement;
  if (!el || el === document.body) return { sel: 'body', none: true };
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const outlineOk = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0;
  const shadowOk = cs.boxShadow && cs.boxShadow !== 'none';
  return {
    sel: window.__sel(el), text: (el.innerText || el.getAttribute('aria-label') || el.getAttribute('href') || '').trim().slice(0, 40).replace(/\s+/g, ' '),
    href: el.getAttribute('href'), outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`, boxShadow: shadowOk ? cs.boxShadow.slice(0, 60) : 'none',
    indicator: outlineOk || !!shadowOk, zeroSize: r.width === 0 || r.height === 0,
    offscreen: r.right < 0 || r.left > innerWidth || r.bottom < 0 || r.top > innerHeight,
  };
};

// ---------- pages ----------
async function auditPage(browser, base, file, results) {
  const res = { file, viewports: {}, seo: null, axe: {}, interactions: null, reducedMotion: null, noJs: null, print: null };
  results.pages.push(res);
  const url = `${base}/${file === 'index.html' ? '' : file}`;

  for (const vp of VIEWPORTS) {
    const v = { console: [], pageErrors: [], failedRequests: [], badStatus: [], brokenImages: [], overflow: null, loadError: null, screenshots: {} };
    res.viewports[vp.name] = v;
    const { ctx, page } = await newPage(browser, vp);
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) v.console.push(`${m.type()}: ${m.text().slice(0, 200)}`); });
    page.on('pageerror', (e) => v.pageErrors.push(String(e.message).slice(0, 200)));
    page.on('requestfailed', (r) => { const f = r.failure()?.errorText || ''; if (!/ERR_ABORTED/.test(f)) v.failedRequests.push(`${r.url().slice(0, 120)} (${f})`); });
    page.on('response', (r) => { if (r.status() >= 400) v.badStatus.push(`${r.status()} ${r.url().slice(0, 120)}`); });
    v.loadError = await load(page, url);
    await page.waitForTimeout(700);
    const base_ = `${file.replace(/\.html$/, '')}-${vp.name}`;
    try { await page.screenshot({ path: path.join(SHOTS, `${base_}-fold.png`) }); v.screenshots.fold = `screens/${base_}-fold.png`; } catch (e) { v.screenshots.fold = 'ERR ' + e.message.split('\n')[0]; }
    await scrollThrough(page);
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(400);
    try { await page.screenshot({ path: path.join(SHOTS, `${base_}-full.png`), fullPage: true }); v.screenshots.full = `screens/${base_}-full.png`; } catch (e) { v.screenshots.full = 'ERR ' + e.message.split('\n')[0]; }
    v.overflow = await page.evaluate(overflowFn);
    v.brokenImages = await page.evaluate(brokenImgFn);
    if (vp.name === '1440') res.seo = await page.evaluate(seoFn);
    if (AXE_VPS.includes(vp.name)) {
      try {
        const r = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
        res.axe[vp.name] = r.violations.map((x) => ({ id: x.id, impact: x.impact, nodes: x.nodes.length, help: x.help, examples: x.nodes.slice(0, 3).map((n) => n.target.join(' ')) }));
      } catch (e) { res.axe[vp.name] = { error: e.message.split('\n')[0] }; }
    }
    if (vp.name === '390') res.interactions = await interactions(page, url);
    await ctx.close();
  }

  // mouvement reduit et sans JS (390 et 1440)
  res.reducedMotion = {}; res.noJs = {};
  for (const vp of [VIEWPORTS[0], VIEWPORTS[3]]) {
    let { ctx, page } = await newPage(browser, vp, { reducedMotion: 'reduce' });
    await load(page, url); await scrollThrough(page); await page.waitForTimeout(500);
    res.reducedMotion[vp.name] = await page.evaluate(hiddenContentFn);
    await ctx.close();
    ({ ctx, page } = await newPage(browser, vp, { javaScriptEnabled: false }));
    await load(page, url); await page.waitForTimeout(500);
    res.noJs[vp.name] = await page.evaluate(hiddenContentFn);
    await ctx.close();
  }

  if (file === 'cv.html') {
    try {
      const { ctx, page } = await newPage(browser, VIEWPORTS[0]);
      await load(page, url); await page.emulateMedia({ media: 'print' });
      const pdf = await page.pdf({ format: 'A4', printBackground: true });
      fs.writeFileSync(path.join(OUT, 'cv.pdf'), pdf);
      const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
      res.print = { pages, file: 'cv.pdf' };
      await ctx.close();
    } catch (e) { res.print = { error: e.message.split('\n')[0] }; }
  }
}

async function interactions(page, url) {
  const out = { menu: null, filters: null, keyboard: null, skipLink: null };
  await load(page, url); await page.waitForTimeout(400);
  // menu mobile
  try {
    const btn = await page.$('button[aria-controls][aria-expanded], header button[aria-expanded], button.menu, button.menu-toggle, .nav-toggle');
    if (!btn) out.menu = { present: false };
    else {
      const m = { present: true, button: await btn.evaluate((b) => window.__sel(b)) };
      const navVisible = () => page.evaluate(() => {
        const b = document.querySelector('button[aria-controls][aria-expanded], header button[aria-expanded], button.menu, button.menu-toggle, .nav-toggle');
        const id = b?.getAttribute('aria-controls');
        const nav = (id && document.getElementById(id)) || document.querySelector('header nav, nav');
        if (!nav) return { found: false };
        const cs = getComputedStyle(nav), r = nav.getBoundingClientRect();
        const links = [...nav.querySelectorAll('a')].filter((a) => { const rr = a.getBoundingClientRect(); return rr.width > 0 && rr.height > 0 && getComputedStyle(a).visibility !== 'hidden'; }).length;
        return { found: true, visible: cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0 && parseFloat(cs.opacity) > 0.05 && r.right > 0 && r.left < innerWidth && r.bottom > 0, visibleLinks: links, expanded: b.getAttribute('aria-expanded'), label: b.getAttribute('aria-label') };
      });
      m.before = await navVisible();
      m.buttonSize = await btn.evaluate((b) => { const r = b.getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)}`; });
      await btn.click(); await page.waitForTimeout(500);
      m.afterClick = await navVisible(); m.focusAfterOpen = (await page.evaluate(focusInfoFn)).sel;
      await page.keyboard.press('Escape'); await page.waitForTimeout(400);
      m.afterEscape = await navVisible(); m.focusAfterEscape = (await page.evaluate(focusInfoFn)).sel;
      if (m.afterEscape.expanded === 'true') { await btn.click(); await page.waitForTimeout(400); m.afterSecondClick = await navVisible(); }
      else { await btn.click(); await page.waitForTimeout(400); await btn.click(); await page.waitForTimeout(400); m.afterSecondClick = await navVisible(); }
      m.focusAfterSecondClick = (await page.evaluate(focusInfoFn)).sel;
      out.menu = m;
    }
  } catch (e) { out.menu = { error: e.message.split('\n')[0] }; }
  // filtres
  try {
    await load(page, url); await page.waitForTimeout(300);
    const n = await page.$$eval('[data-filter], .filters button', (b) => b.length);
    if (!n) out.filters = { present: false };
    else {
      const rows = [];
      for (let i = 0; i < n; i++) {
        const b = (await page.$$('[data-filter], .filters button'))[i];
        await b.click(); await page.waitForTimeout(300);
        rows.push(await page.evaluate((i) => {
          const btns = [...document.querySelectorAll('[data-filter], .filters button')];
          const x = btns[i];
          const cards = [...document.querySelectorAll('.project, [data-tags]')];
          const vis = cards.filter((c) => { const cs = getComputedStyle(c), r = c.getBoundingClientRect(); return !c.hidden && cs.display !== 'none' && cs.visibility !== 'hidden' && r.height > 0; }).length;
          return { label: x.innerText.trim().replace(/\s+/g, ' '), filter: x.dataset.filter || null, visibleCards: vis, totalCards: cards.length, ariaPressed: x.getAttribute('aria-pressed'), ariaCurrent: x.getAttribute('aria-current'), classActive: x.classList.contains('active') || x.classList.contains('is-active') };
        }, i));
      }
      out.filters = { present: true, rows };
    }
  } catch (e) { out.filters = { error: e.message.split('\n')[0] }; }
  // clavier
  try {
    await load(page, url); await page.waitForTimeout(300);
    await page.evaluate(() => { document.activeElement?.blur?.(); scrollTo(0, 0); });
    const seq = [];
    for (let i = 0; i < 25; i++) { await page.keyboard.press('Tab'); await page.waitForTimeout(40); seq.push(await page.evaluate(focusInfoFn)); }
    out.keyboard = { order: seq.map((s) => `${s.sel}${s.text ? ' "' + s.text + '"' : ''}`), withoutIndicator: seq.map((s, i) => ({ i: i + 1, ...s })).filter((s) => !s.indicator).map((s) => `#${s.i} ${s.sel} "${s.text || ''}"`), zeroSizeFocus: seq.filter((s) => s.zeroSize).map((s) => s.sel), detail: seq };
    const first = seq[0];
    out.skipLink = { present: !!(first && first.href && first.href.startsWith('#') && /contenu|content|skip|passer|principal|main|aller/i.test(`${first.text} ${first.href}`)), first: first ? `${first.sel} "${first.text}" ${first.href || ''}` : null };
  } catch (e) { out.keyboard = { error: e.message.split('\n')[0] }; }
  return out;
}

// Sites qui refusent les requetes automatisees (LinkedIn : code 999 ou page de connexion) :
// leurs liens sont signales « non verifie » au lieu d'etre testes. A verifier a la main.
const NOT_CHECKED = [/(^|\.)linkedin\.com$/i];

async function checkExternal(urls) {
  const res = [];
  const one = async (u) => {
    if (NOT_CHECKED.some((re) => re.test(new URL(u).hostname))) { res.push({ url: u, status: null, note: 'non verifie : site hostile aux requetes automatisees, a tester a la main' }); return; }
    const t = async (method) => {
      const c = new AbortController(); const to = setTimeout(() => c.abort(), 10000);
      try { const r = await fetch(u, { method, redirect: 'follow', signal: c.signal, headers: { 'User-Agent': UA, Accept: '*/*' } }); return r.status; }
      finally { clearTimeout(to); }
    };
    try {
      let s = await t('HEAD');
      if (s >= 400 || s === 405) s = await t('GET');
      res.push({ url: u, status: s });
    } catch (e) {
      try { res.push({ url: u, status: await t('GET') }); } catch (e2) { res.push({ url: u, status: 0, error: e2.name === 'AbortError' ? 'timeout 10s' : String(e2.cause?.code || e2.message) }); }
    }
  };
  for (let i = 0; i < urls.length; i += 6) await Promise.all(urls.slice(i, i + 6).map(one));
  return res.sort((a, b) => a.url.localeCompare(b.url));
}

function freePort() {
  return new Promise((resolve) => { const srv = http.createServer(); srv.listen(0, '127.0.0.1', () => { const p = srv.address().port; srv.close(() => resolve(p)); }); });
}

// Lance npx lighthouse avec un delai dur : l'arbre de processus est tue (taskkill /T /F) a expiration.
function runWithHardTimeout(cmd, ms) {
  return new Promise((resolve) => {
    const child = spawn(cmd, { shell: true, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    child.stderr.on('data', (d) => { err = (err + d).slice(-600); });
    child.stdout.on('data', () => {});
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      else child.kill('SIGKILL');
    }, ms);
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, timedOut, err }); });
  });
}

async function runLighthouse(url, mode) {
  const outFile = path.join(OUT, `lighthouse-${mode}.json`);
  fs.rmSync(outFile, { force: true });
  let last = null;
  for (let attempt = 1; attempt <= 2 && !fs.existsSync(outFile); attempt++) {
    // Chromium lance par Playwright avec un port de debogage : evite chrome-launcher (EPERM au nettoyage sous Windows)
    const port = await freePort();
    const br = await chromium.launch({ executablePath: CHROME, headless: true, args: [`--remote-debugging-port=${port}`, '--no-first-run', '--disable-gpu'] });
    const cmd = `npx --yes lighthouse "${url}" --port=${port} --output=json --output-path="${outFile}" --only-categories=performance,accessibility,best-practices,seo ${mode === 'desktop' ? '--preset=desktop' : ''} --max-wait-for-load=45000 --quiet`;
    last = await runWithHardTimeout(cmd, 150000);
    await br.close().catch(() => {});
  }
  if (!fs.existsSync(outFile)) return { error: `Lighthouse a echoue 2 fois (${last.timedOut ? 'delai dur de 150 s depasse' : 'code ' + last.code}). ${last.err.replace(/\s+/g, ' ').slice(-300)}` };
  const j = JSON.parse(fs.readFileSync(outFile, 'utf8'));
  const scores = Object.fromEntries(Object.entries(j.categories).map(([k, c]) => [k, c.score === null ? null : Math.round(c.score * 100)]));
  const failing = [];
  for (const c of Object.values(j.categories)) for (const ref of c.auditRefs) {
    const a = j.audits[ref.id];
    if (!a || a.score === null || a.score >= 0.9 || !['binary', 'numeric', 'metricSavings'].includes(a.scoreDisplayMode)) continue;
    failing.push({ id: a.id, title: a.title, category: c.id, score: a.score, weight: ref.weight, display: a.displayValue || '', impact: ref.weight * (1 - a.score) });
  }
  failing.sort((a, b) => b.impact - a.impact || b.weight - a.weight);
  const seen = new Set(); const top = failing.filter((f) => !seen.has(f.id) && seen.add(f.id)).slice(0, 8);
  const m = j.audits;
  const metrics = Object.fromEntries(['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index'].map((k) => [k, m[k]?.displayValue]));
  return { scores, metrics, top };
}

// ---------- rapport ----------
function toMarkdown(R) {
  const L = [];
  L.push(`# Rapport QA - ${R.date}`, '', `Racine : ${R.root}`, '');
  if (R.lighthouse) {
    L.push('## Lighthouse', '', '| Mode | Perf | A11y | Bonnes pratiques | SEO | FCP | LCP | TBT | CLS |', '|---|---|---|---|---|---|---|---|---|');
    for (const [mode, x] of Object.entries(R.lighthouse)) {
      if (x.error) { L.push(`| ${mode} | ${x.error} |`); continue; }
      const s = x.scores, m = x.metrics;
      L.push(`| ${mode} | ${s.performance} | ${s.accessibility} | ${s['best-practices']} | ${s.seo} | ${m['first-contentful-paint']} | ${m['largest-contentful-paint']} | ${m['total-blocking-time']} | ${m['cumulative-layout-shift']} |`);
    }
    for (const [mode, x] of Object.entries(R.lighthouse)) if (x.top) { L.push('', `Audits en echec (${mode}) :`); x.top.forEach((a) => L.push(`- [${a.category}] ${a.title} (${a.id}) score ${a.score}${a.display ? ' - ' + a.display : ''}`)); }
    L.push('');
  }
  for (const p of R.pages) {
    L.push(`## ${p.file}`, '', '### Viewports', '', '| Viewport | Debordement | Fautifs | Console | pageerror | Req. echouees | HTTP>=400 | Images cassees |', '|---|---|---|---|---|---|---|---|');
    for (const [n, v] of Object.entries(p.viewports)) L.push(`| ${n} | ${v.overflow?.overflow ? `OUI (${v.overflow.scrollWidth}>${v.overflow.innerWidth})` : 'non'} | ${(v.overflow?.culprits || []).slice(0, 4).map((c) => c.sel).join(', ')} | ${v.console.length} | ${v.pageErrors.length} | ${v.failedRequests.length} | ${v.badStatus.length} | ${v.brokenImages.length} |`);
    const logs = Object.entries(p.viewports).flatMap(([n, v]) => [...v.console, ...v.pageErrors, ...v.failedRequests, ...v.badStatus].map((x) => `${n}: ${x}`));
    if (logs.length) { L.push('', 'Journaux :'); [...new Set(logs)].slice(0, 20).forEach((x) => L.push(`- ${x}`)); }
    L.push('', '### axe-core');
    for (const [n, list] of Object.entries(p.axe)) {
      if (!Array.isArray(list)) { L.push(`- ${n}: erreur ${list.error}`); continue; }
      const c = {}; list.forEach((x) => (c[x.impact] = (c[x.impact] || 0) + 1));
      L.push('', `${n}px : ${list.length} regles en violation (${Object.entries(c).map(([k, v]) => `${k}:${v}`).join(', ') || 'aucune'})`);
      list.forEach((x) => L.push(`- ${x.id} [${x.impact}] x${x.nodes} : ${x.examples.join(' | ')}`));
    }
    if (p.seo) {
      const s = p.seo;
      L.push('', '### SEO / semantique', '', `- title (${s.titleLen}) : ${s.title}`, `- description (${s.descriptionLen}) : ${s.description ?? 'ABSENTE'}`, `- canonical : ${s.canonical ?? 'ABSENT'}`, `- og : ${Object.entries(s.og).map(([k, v]) => `${k}=${v ? 'ok' : 'ABSENT'}`).join(', ')}`, `- twitter:card : ${s.twitterCard ?? 'ABSENT'}`, `- JSON-LD : ${s.jsonLd.length ? s.jsonLd.join(',') : 'ABSENT'}`, `- lang : ${s.lang ?? 'ABSENT'}`, `- h1 : ${s.h1Count} ; sauts : ${s.headingSkips.join(', ') || 'aucun'}`, `- images : ${s.imgCount} ; sans alt : ${s.imgsNoAlt.length} ; sans width/height : ${s.imgsNoSize.length}`, `- target=_blank sans rel : ${s.blankBadLinks.length}`, `- ancres mortes : ${s.deadAnchors.join(', ') || 'aucune'}`, `- favicon : ${s.favicon ?? 'ABSENT'} ; theme-color : ${s.themeColor ?? 'ABSENT'}`);
    }
    if (p.interactions) {
      const i = p.interactions;
      L.push('', '### Interactions (390px)');
      if (i.menu?.present) { const m = i.menu; L.push(`- Menu (${m.button}, ${m.buttonSize}) : avant visible=${m.before?.visible}; clic -> visible=${m.afterClick?.visible} aria-expanded=${m.afterClick?.expanded} focus=${m.focusAfterOpen}; Echap -> expanded=${m.afterEscape?.expanded} visible=${m.afterEscape?.visible} focus=${m.focusAfterEscape}; second clic -> expanded=${m.afterSecondClick?.expanded} visible=${m.afterSecondClick?.visible}`); } else L.push(`- Menu : ${JSON.stringify(i.menu)}`);
      if (i.filters?.rows) i.filters.rows.forEach((r) => L.push(`- Filtre "${r.label}" : ${r.visibleCards}/${r.totalCards} cartes ; aria-pressed=${r.ariaPressed} ; classe active=${r.classActive}`)); else L.push(`- Filtres : ${JSON.stringify(i.filters)}`);
      if (i.keyboard?.order) { L.push(`- Lien d'evitement : ${i.skipLink.present ? 'oui' : 'NON'} (1er Tab : ${i.skipLink.first})`, `- Ordre Tab : ${i.keyboard.order.join(' > ')}`, `- Sans indicateur de focus : ${i.keyboard.withoutIndicator.length ? i.keyboard.withoutIndicator.join(' ; ') : 'aucun'}`, `- Focus sur element de taille nulle : ${i.keyboard.zeroSizeFocus.join(', ') || 'aucun'}`); }
    }
    L.push('', '### Mouvement reduit / sans JS');
    for (const k of ['reducedMotion', 'noJs']) for (const [n, r] of Object.entries(p[k])) L.push(`- ${k === 'noJs' ? 'JS desactive' : 'reduced-motion'} ${n}px : ${r.count} element(s) invisible(s)${r.count ? ' ex. ' + r.items.slice(0, 5).map((x) => x.sel).join(', ') : ''}`);
    if (p.print) L.push('', `### Impression A4 : ${p.print.pages ?? p.print.error} page(s)`);
    L.push('');
  }
  L.push('## Fichiers racine', '', `robots.txt : ${R.files.robots ? 'present' : 'ABSENT'} ; sitemap.xml : ${R.files.sitemap ? 'present' : 'ABSENT'} ; 404.html : ${R.files.notFound ? 'present' : 'absent'}`, '');
  const extSkipped = R.external.filter((e) => e.status === null).length;
  const extErrors = R.external.filter((e) => e.status !== null && (e.status >= 400 || e.status === 0)).length;
  L.push('## Liens externes', '', `${R.external.length} uniques, ${extErrors} en erreur${extSkipped ? `, ${extSkipped} non verifie(s)` : ''}.`, '');
  R.external.forEach((e) => L.push(`- ${e.status ?? '—'}${e.error ? ' ' + e.error : ''}${e.note ? ' (' + e.note + ')' : ''} ${e.url}`));
  return L.join('\n') + '\n';
}

async function main() {
  const { server, port } = await startServer();
  const base = `http://127.0.0.1:${port}`;
  const R = { date: new Date().toISOString(), root: ROOT, pages: [], files: {}, external: [], lighthouse: null };
  const htmlFiles = fs.readdirSync(ROOT).filter((f) => f.toLowerCase().endsWith('.html') && f !== '404.html').sort();
  if (fs.existsSync(path.join(ROOT, '404.html'))) htmlFiles.push('404.html');
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  try {
    for (const f of htmlFiles) { console.log('> page', f); try { await auditPage(browser, base, f, R); } catch (e) { console.error('ERREUR', f, e.message); R.pages.push({ file: f, error: e.message, viewports: {}, axe: {}, reducedMotion: {}, noJs: {} }); } }
    const probe = async (p) => { const r = await fetch(base + p); return r.status === 200; };
    R.files = { robots: await probe('/robots.txt'), sitemap: await probe('/sitemap.xml'), notFound: fs.existsSync(path.join(ROOT, '404.html')) };
    const ext = [...new Set(R.pages.flatMap((p) => p.seo?.externalLinks || []))];
    console.log('> liens externes', ext.length);
    R.external = await checkExternal(ext);
  } finally { await browser.close(); }
  if (WITH_LH) {
    R.lighthouse = {};
    for (const mode of ['mobile', 'desktop']) { console.log('> lighthouse', mode); try { R.lighthouse[mode] = await runLighthouse(`${base}/`, mode); } catch (e) { R.lighthouse[mode] = { error: e.message }; } }
  }
  server.close();
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(R, null, 2));
  fs.writeFileSync(path.join(OUT, 'report.md'), toMarkdown(R));
  console.log('Rapport : ' + path.join(OUT, 'report.md'));
}

main().then(() => process.exit(0), (e) => { console.error('Echec harnais :', e); process.exit(0); });
