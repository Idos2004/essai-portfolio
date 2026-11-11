# Rapport final — modernisation du portfolio

Branche : `audit-modernisation-portfolio` (locale, non poussée, non fusionnée). Date : 11 novembre 2026.
Documents liés : [AUDIT.md](AUDIT.md) (diagnostic initial), [PLAN_AMELIORATION.md](PLAN_AMELIORATION.md) (feuille de route et statuts), [INVENTAIRE_VISUEL.md](INVENTAIRE_VISUEL.md) (médias).

## 1. Résultats mesurés avant / après

Mesures du harnais `tests/qa.mjs` (Playwright, axe-core, Lighthouse), sur la même machine. « Avant » = copie propre de `main` ; « après » = branche de travail, avec les en-têtes de `vercel.json` appliqués localement.

| Mesure | Avant | Après |
|---|---|---|
| Lighthouse mobile (perf. · access. · bonnes pratiques · SEO) | 85 · 94 · 96 · 100 | **91 · 100 · 100 · 100** |
| Lighthouse desktop | 91 · 91 · 100 · 100 | **100 · 100 · 100 · 100** |
| Premier affichage / plus grand élément (mobile) | 3,3 s / 3,3 s | **1,4 s / 2,1 s** |
| Décalage de mise en page (CLS) desktop | 0,006 | **0** |
| Violations axe-core (WCAG 2.2 AA) | 16 nœuds (contraste) + 1 (CV) | **0** sur les 3 pages, à 390 et 1440 px |
| Liens externes en erreur | 1 sur 8 | **0 sur 10** testés (LinkedIn à vérifier à la main) |
| Erreurs console et requêtes en échec | 1 (favicon du CV) | **0** |
| Débordement horizontal (5 largeurs, de 360 à 1440 px) | aucun | aucun |
| CV imprimé (A4) | 2 pages | **1 page** |
| Menu mobile | cible 30 px, Échap inopérant | cible 44 px, Échap, clic extérieur, retour du focus |
| Filtres de projets | état non exposé | `aria-pressed` et annonce du résultat |
| Lien d'évitement | absent | présent |
| Contenu sans JavaScript ou en mouvement réduit | visible | visible |
| `robots.txt`, `sitemap.xml`, `404.html`, données structurées | absents | présents |
| En-têtes de sécurité | HSTS seul (Vercel) | CSP stricte + 5 en-têtes (actifs après déploiement) ; 0 violation CSP vérifiée |

**Précision sur la performance.** La machine de test est modeste (Intel i3-6006U, indice Lighthouse de 570 à 980, alors qu'un poste courant dépasse 1 000) et les scores mobiles varient d'une exécution à l'autre. Une comparaison alternée sur 3 exécutions a donné une médiane de 85 avant, et de 91 à 94 après les optimisations finales. En production, la compression Brotli et le cache de Vercel amélioreront encore ces chiffres : le serveur local n'en applique pas.

## 2. Ce qui a été réalisé

**Technique.**
- Retrait du code mort et des doublons : `app.js` (jamais chargé), `script.js` et `styles.css` remplacés, et `moi.png` (2,2 Mo, non référencé).
- Nouvelle organisation : `assets/css`, `assets/js`, `assets/fonts` et `assets/img`.
- JavaScript sans aucune lecture de mise en page au démarrage, grâce à `IntersectionObserver`.
- Amélioration progressive : `no-js` / `js`, le contenu et la navigation fonctionnant sans JavaScript.
- `vercel.json` : CSP avec empreinte SHA-256, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`, COOP et cache long des polices. `.vercelignore` empêche la publication de `docs/`, `tests/` et du README.

**Visuel.**
- Direction artistique sombre conservée mais refondue, sur la base de jetons de design :
  - contrastes ≥ 5,9:1 ;
  - corps de texte à 16–17 px ;
  - polices auto-hébergées ;
  - hiérarchie claire ;
  - décor superflu retiré.
- Accueil avec portrait, nom et métier dans le `h1`, faits clés et deux appels à l'action.
- Cartes de projets avec captures réelles (desktop dans un cadre de navigateur et mobile superposé), statut, rôle, technologies et liens.

**Contenus.**
- Chaque projet a été vérifié dans son dépôt et sur sa démo ; statuts nuancés.
- Erreurs corrigées : pile d'Éclat Surprises, paiements d'AgriMarché, statut d'EVENTO, noms AgriMarché et Fidei Ludi.
- Application Android « Éloquence » ajoutée ; fonction réelle de gestionTemps décrite.
- Compétences classées selon l'usage réel : « Utilisé en projet », « En progression », « Notions ».
- Usage des assistants de code IA mentionné.
- Profil LinkedIn ajouté : contact, pied de page, CV et données structurées.
- Éloquence promue en grande carte : 3 captures fournies par vous (barres système du téléphone retirées, contenu intact), APK de test téléchargeable (version 1.1.0, Android 7.0+, empreinte SHA-256 affichée).
- Boutique Bengo ajoutée : boutique WordPress/WooCommerce de dropshipping menée avec vos frères, captures réelles prises sur le site, rôle confirmé par vous.

**Photographies et captures.**
- Portrait studio sans photomontage, optimisé en WebP (14,6 Ko).
- Captures réelles des 4 plateformes en ligne : 4 vues desktop et 4 vues mobile, en 2 ou 3 tailles WebP.
- Image de partage 1200×630 et icônes 180 et 512 px.

**CV.**
- Refait en clair, aligné sur l'accueil, avec portrait et liens.
- Tient sur une page A4.
- Accessible depuis l'en-tête, l'accueil, le contact et le pied de page.

**SEO.**
- Titre et description réécrits, URL canonique, Open Graph et carte Twitter.
- JSON-LD `ProfilePage` / `Person`.
- `robots.txt`, `sitemap.xml` et `site.webmanifest`.

**Documentation.**
- README réécrit : lancement local, contrôle qualité, déploiement, empreinte CSP, mise à jour des contenus.
- Dossier `docs/audit/` (4 documents).

## 3. Organisation du travail

L'orchestrateur a tenu les rôles d'architecte, d'auditeur technique, de direction artistique et d'intégrateur, la base de code (8 fichiers) étant trop petite pour justifier un agent d'architecture séparé. Cinq agents spécialisés (modèle économique Sonnet) ont travaillé sur des périmètres de fichiers disjoints :

| Agent | Mission | Résultat |
|---|---|---|
| Contenu et projets | Vérification factuelle en lecture seule des 15 dépôts (`gh api`) et des démos | Dossier par projet : 8 incohérences corrigées, informations à ne pas publier repérées |
| Médias | Captures Playwright des 4 plateformes, planche-contact des portraits, image OG, icônes | 20 captures WebP, portrait, image OG et icônes ; 5 fichiers inutilisés retirés ensuite ; inventaire visuel |
| QA, SEO et accessibilité | Harnais `tests/qa.mjs`, mesure de référence, critique UI/UX, en-têtes de production | Référence « avant », 10 faiblesses UI/UX mesurées |
| CV | Refonte de `cv.html` et `cv.css` | Version 2 pages, compactée ensuite à 1 page par l'orchestrateur |
| Relecture indépendante | Revue en lecture seule du code final | Aucun défaut P0 ni P1 ; 13 points P2/P3, dont 10 corrigés et 3 écartés avec justification |

**Skills et outils.** Aucun `CLAUDE.md`, agent personnalisé ni skill spécialisé (front-end, SEO, accessibilité, Playwright) n'était installé. Ces compétences ont été couvertes par des outils exécutés localement, sans dépendance ajoutée au site : Playwright 1.65 avec le Chromium déjà présent, axe-core, Lighthouse, html-validate, csstree-validator et Pillow.

**Méthode.** Reconnaissance, puis audits parallèles, puis dossier factuel, puis implémentation par l'intégrateur. Viennent ensuite la mesure, la relecture indépendante, les corrections et une nouvelle mesure. Chaque affirmation de test de ce rapport correspond à une exécution réelle.

## 4. Vérifications exécutées

- Harnais complet (3 pages × 5 largeurs) : débordements, console, requêtes, images, axe-core, SEO, liens externes, clavier, menu, filtres, mouvement réduit, désactivation de JavaScript, impression du CV. Lighthouse mobile et desktop.
- CSP appliquée localement sur les 3 pages, menu, filtres et impression compris : 0 violation.
- Validation HTML (html-validate, configuration dans `tests/.htmlvalidate.json`) : 0 erreur. Validation CSS (csstree) : 0 erreur sur `main.css` ; 1 faux positif sur `cv.css` (`margin` dans `@page`, propriété standard).
- Contrôle visuel des captures à 1440 et 390 px, ainsi que du rendu imprimé du CV.

**Limites.** Tests effectués avec Chromium uniquement : WebKit (Safari) et Firefox ne sont pas installés sur la machine, et aucun appareil réel n'a été testé. Les en-têtes de sécurité et de cache ne s'appliqueront qu'après déploiement sur Vercel. Le lien LinkedIn n'est pas testé automatiquement, LinkedIn refusant ce type de requêtes : il est à vérifier à la main.

## 5. Points restant à valider

Voir les éléments 19 à 26 de [PLAN_AMELIORATION.md](PLAN_AMELIORATION.md), notamment :
- désactiver GitHub Pages avant de fusionner ;
- retrouver le dépôt de Sportivo (Vercel → Settings → Git) ;
- valider la mention de l'assistance IA.
