# Portfolio — BALOGOU Eustache

Portfolio professionnel de BALOGOU Eustache (Idos Jackson), développeur web junior à Cotonou (Bénin).
Site statique en HTML, CSS et JavaScript natifs : aucun framework, aucune étape de build.

En ligne : https://balogou-portfolio.vercel.app

## Contenu du site

- **Accueil** : présentation, portrait, accès aux projets et au CV.
- **Projets** : huit projets avec captures réelles, rôle, statut, technologies et liens (démo, code). Filtres « En ligne », « Back-end & API », « Code public ».
- **Profil**, **Compétences** (niveaux présentés honnêtement), **Parcours** et **Contact**.
- **CV** (`cv.html`) : version en ligne et imprimable au format A4.

## Structure

```
index.html            Page principale
cv.html               CV en ligne et imprimable
404.html              Page d'erreur (servie automatiquement par Vercel)
assets/css/main.css   Styles du site (jetons de design en tête de fichier)
assets/css/cv.css     Styles du CV (écran et impression)
assets/js/main.js     Interactions : menu mobile, filtres, copie de l'e-mail, animations
assets/fonts/         Polices auto-hébergées (licence SIL OFL, voir le README du dossier)
assets/img/           Portrait, captures des projets, image de partage, icônes
favicon.svg, site.webmanifest, robots.txt, sitemap.xml
vercel.json           En-têtes de sécurité et de cache
docs/audit/           Audit, plan d'amélioration et rapport (non publiés)
tests/                Outils de contrôle qualité et de capture (non publiés)
```

## Lancer en local

Les chemins des ressources commencent par `/` : ouvrir `index.html` par double-clic ne charge pas les styles.
Il faut un petit serveur statique à la racine du dépôt, par exemple :

```bash
python -m http.server 8000
# puis ouvrir http://localhost:8000
```

## Contrôle qualité

Le dossier `tests/` contient un harnais Playwright (accessibilité axe-core, débordements, liens, SEO, interactions, impression du CV, Lighthouse en option).

```bash
cd tests
npm install
node qa.mjs --out ./output            # contrôles complets
node qa.mjs --out ./output --lighthouse --headers   # + Lighthouse et en-têtes de vercel.json
```

Le harnais utilise Chromium. Si le navigateur de Playwright n'est pas installé, lancer `npx playwright install chromium` ou indiquer un exécutable avec la variable `CHROME_PATH`.

Les captures des projets en ligne se régénèrent avec `node tests/tools/capture-projects.mjs` (voir l'en-tête du script).

## Déploiement

Vercel publie le dépôt tel quel (aucun build). `.vercelignore` exclut `docs/`, `tests/` et ce README.

`vercel.json` définit une politique de sécurité du contenu (CSP) stricte : aucun style en ligne, aucun script externe.
Un seul script en ligne est autorisé, par son empreinte SHA-256 : `document.documentElement.className="js"` (présent dans `index.html`, `cv.html` et `404.html`).
**Si ce script change, recalculer l'empreinte** et mettre à jour `vercel.json` :

```bash
printf '%s' 'document.documentElement.className="js"' | openssl dgst -sha256 -binary | openssl base64
```

## Mettre à jour le contenu

- **Ajouter un projet** : copier un bloc `<li class="project">` dans la section `#projets` d'`index.html`.
  L'attribut `data-project-tags` alimente les filtres : `online`, `backend`, `code` (et `team`, `mobile` à titre descriptif). Les compteurs des filtres se mettent à jour automatiquement.
- **Captures** : `assets/img/projects/<projet>-<vue>-<largeur>.webp` (desktop 640 et 1280 px, mobile 390 et 780 px), avec `width`, `height`, `alt` et `loading="lazy"`.
- **CV** : modifier `cv.html` en cohérence avec `index.html`, puis vérifier l'aperçu d'impression (une page A4 visée).
- **Référencement** : mettre à jour `lastmod` dans `sitemap.xml` et `dateModified` dans les données structurées d'`index.html`.

## Crédits

- Polices : Manrope, Space Grotesk et DM Mono (SIL Open Font License 1.1).
- Photographie et captures : propriété de BALOGOU Eustache ; les captures montrent ses propres projets en ligne.

## Contact

eustachebalogou@gmail.com · https://github.com/Idos2004
