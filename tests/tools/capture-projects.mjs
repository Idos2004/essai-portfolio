// Captures brutes des plateformes en ligne (lecture seule : aucune connexion, aucun formulaire).
// Usage : node capture-projects.mjs [dossierSortie] [--links]
//   --links : liste les liens publics de chaque site puis quitte.
//   Sortie par défaut : tests/output/captures (ignoré par Git). Variables : CHROME_PATH, ONLY=<slug>,
//   EXTRA_STATES='{"<slug>":{"<nom-vue>":"/chemin-public"}}' pour capturer des pages supplémentaires.
//   Les PNG bruts sont ensuite convertis en WebP (voir docs/audit/INVENTAIRE_VISUEL.md).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] && !process.argv[2].startsWith('--')
  ? process.argv[2]
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../output/captures');
const LINKS_ONLY = process.argv.includes('--links');
// Navigateur : variable CHROME_PATH si définie, sinon le Chromium installé par Playwright.
const EXE = process.env.CHROME_PATH;
const SITES = {
  evento: 'https://evento-qkdi.vercel.app/',
  agrimarket: 'https://agrimarket-tawny.vercel.app/',
  sportivo: 'https://sportivo-gold.vercel.app/',
  'eclat-surprises': 'https://eclat-surprises.vercel.app/',
};
// Chemins supplémentaires publics (même origine) : { slug: { nom: chemin } } — complétés après exploration avec --links
const EXTRA = JSON.parse(process.env.EXTRA_STATES || '{}');
fs.mkdirSync(OUT, { recursive: true });

const COOKIE = /^(accepter|tout accepter|accept|accept all|ok|j'accepte|fermer|close|compris|got it)$/i;
async function settle(page) {
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  // bannière cookies éventuelle
  for (const b of await page.locator('button, [role=button]').all().catch(() => [])) {
    const t = ((await b.innerText().catch(() => '')) || '').trim();
    if (COOKIE.test(t) && /cookie/i.test(await page.locator('body').innerText().catch(() => ''))) { await b.click({ timeout: 1500 }).catch(() => {}); break; }
  }
  // défilement unique pour le chargement différé, puis retour en haut
  await page.evaluate(async () => {
    const h = document.documentElement.scrollHeight;
    for (let y = 0; y < h; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(800);
}

const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
const profiles = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};
for (const [slug, url] of Object.entries(SITES)) {
  if (process.env.ONLY && process.env.ONLY !== slug) continue;
  for (const [pname, opts] of Object.entries(profiles)) {
    const ctx = await browser.newContext({ ...opts, locale: 'fr-FR' });
    const page = await ctx.newPage();
    try {
      const resp = await page.goto(url, { waitUntil: 'commit', timeout: 45000 });
      console.log(slug, pname, 'HTTP', resp && resp.status());
      await settle(page);
      if (LINKS_ONLY) {
        if (pname === 'desktop') {
          const l = await page.$$eval('a[href]', as => [...new Set(as.map(a => a.href + ' | ' + a.innerText.trim().slice(0, 40)))]);
          console.log(l.join('\n'));
        }
      } else {
        await page.screenshot({ path: path.join(OUT, `${slug}-${pname}.png`) });
        for (const [name, p] of Object.entries(EXTRA[slug] || {})) {
          await page.goto(new URL(p, url).href, { waitUntil: 'commit', timeout: 45000 });
          await settle(page);
          await page.screenshot({ path: path.join(OUT, `${slug}-${name}-${pname}.png`) });
        }
      }
    } catch (e) { console.log(slug, pname, 'ERREUR', e.message.split('\n')[0]); }
    await ctx.close();
  }
}
await browser.close();
