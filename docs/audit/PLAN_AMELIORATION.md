# Plan d'amélioration priorisé

Branche : `audit-modernisation-portfolio`. Statuts au 11 novembre 2026.
Les mesures « avant / après » figurent dans [AUDIT.md](AUDIT.md) et [RAPPORT_FINAL.md](RAPPORT_FINAL.md).

Légende : **P0** critique · **P1** important · **P2** optimisation · **P3** facultatif ou décision à prendre.

## P0 — Critique

| # | Problème constaté | Conséquence | Solution retenue | Fichiers | Validation | Statut |
|---|---|---|---|---|---|---|
| 1 | Informations de projets inexactes : Éclat Surprises présenté en Next.js (JavaScript natif en réalité) ; « paiements simulés » attribués à AgriMarché (aucun module de paiement) ; EVENTO marqué « EN LIGNE » alors qu'il s'agit d'une version de test au paiement simulé ; pile EVENTO contradictoire (Redis ou Prisma) ; double nom AgriMarket / AgriMarché ; « Fudei-Ludi » au lieu de « Fidei Ludi ». | Perte de crédibilité dès qu'un recruteur vérifie un dépôt ou une démo. | Contenus réécrits à partir des dépôts (`gh api`) et des sites en ligne ; statuts nuancés (version de test, MVP, prototype). | `index.html`, `cv.html` | Relecture croisée avec le dossier de vérification des projets. | Fait |
| 2 | Liens vers des ressources inaccessibles aux visiteurs : dépôt privé `eloquence-idos` présenté comme lien, démo Google AI Studio privée de Fidei Ludi. | Erreur 404 ou connexion exigée : impression de lien cassé. | Liens retirés ; mention « Code privé, présentation sur demande ». | `index.html`, `cv.html` | Contrôle HTTP des liens externes par le harnais QA. | Fait |
| 3 | Deux implémentations concurrentes : `app.js` (rendu des projets en JavaScript, jamais chargé, identifiants absents du HTML, données divergentes) et `script.js` ; `moi.png` (2,2 Mo) non référencé. | Confusion de maintenance, risque de modifier le mauvais fichier. | Suppression (l'historique Git conserve les fichiers) ; scripts regroupés dans `assets/js/main.js`. | `app.js`, `script.js`, `styles.css`, `moi.png` | Recherche de références : aucune. | Fait |

## P1 — Important

| # | Problème constaté | Conséquence | Solution retenue | Fichiers | Validation | Statut |
|---|---|---|---|---|---|---|
| 4 | Contrastes insuffisants (jusqu'à 3,2:1) et textes de 7 à 11 px pour le contenu courant. | Critère WCAG 1.4.3 non respecté, lecture difficile sur mobile. | Nouvelle palette (tous les textes ≥ 5,9:1), corps 16–17 px, libellés ≥ 13 px. | `assets/css/main.css` | axe-core (`color-contrast`), calcul des ratios. | Fait |
| 5 | Aperçus de projets dessinés en CSS, présentés comme illustrations. | Aucune preuve visuelle du travail réel. | Captures réelles des 4 plateformes en ligne : 4 vues desktop et 4 vues mobile, chacune en 2 tailles WebP. | `assets/img/projects/` | Contrôle visuel ; aucune image cassée (harnais). | Fait |
| 6 | Accueil sans portrait ni nom dans le titre principal (monogramme et orbites décoratives). | Première impression impersonnelle, référencement du nom affaibli. | Portrait studio optimisé (14,6 Ko), `h1` avec nom et métier, faits clés. | `index.html`, `assets/img/portrait/` | Capture du premier écran à 1440 et 390 px. | Fait |
| 7 | CV absent de la navigation ; style et gestionnaire `onclick` en ligne ; Sportivo et Éclat absents. | CV introuvable, incompatible avec une CSP stricte, incomplet. | Liens vers le CV (en-tête, accueil, contact, pied) ; CV refait, une page A4. | `cv.html`, `assets/css/cv.css` | PDF A4 généré : 1 page, aucune erreur console. | Fait |
| 8 | SEO incomplet : pas de canonical, `og:image`, `og:url`, carte Twitter, données structurées, `robots.txt`, `sitemap.xml`. | Partages sans aperçu, indexation moins précise. | Métadonnées complètes, JSON-LD `ProfilePage` / `Person`, image de partage 1200×630, robots et sitemap. | `index.html`, `cv.html`, `robots.txt`, `sitemap.xml` | Contrôles SEO du harnais, Lighthouse SEO. | Fait |
| 9 | Interactions peu accessibles : filtres sans état, résultats non annoncés, menu mobile sans Échap ni `aria-controls`, pas de lien d'évitement, focus peu visible, `<label>` hors formulaires. | Navigation clavier et lecteur d'écran dégradée. | `aria-pressed`, zone `role="status"`, Échap, clic extérieur et perte de focus ferment le menu, lien d'évitement, `:focus-visible` contrasté, balisage sémantique (`dl`, `ol`, `figure`). | `index.html`, `assets/js/main.js` | Tests clavier, menu et filtres du harnais ; axe-core. | Fait |
| 10 | Menu mobile masqué sans JavaScript. | Navigation impossible si le script ne se charge pas. | Classes `no-js` / `js` : menu visible et filtres masqués sans JavaScript. | `index.html`, `assets/css/main.css` | Contrôle « JavaScript désactivé » du harnais. | Fait |
| 11 | README trompeur (« ouvrir index.html ») alors que les chemins sont absolus. | Page sans styles en local. | README réécrit : serveur statique, QA, déploiement, mise à jour des contenus. | `README.md` | Relecture. | Fait |

## P2 — Optimisation

| # | Problème constaté | Conséquence | Solution retenue | Fichiers | Validation | Statut |
|---|---|---|---|---|---|---|
| 12 | Trois familles Google Fonts chargées depuis deux origines tierces. | Requêtes bloquantes supplémentaires, dépendance externe. | Polices auto-hébergées (WOFF2 latin, 76 Ko), préchargement des deux principales. | `assets/fonts/`, `assets/css/*.css` | Lighthouse, absence de requête tierce. | Fait |
| 13 | Animations d'apparition inopérantes (le script ciblait `.reveal`, absent du HTML) ; contenu masqué si JavaScript échoue. | Code mort, risque de contenu invisible. | Révélation limitée aux éléments sous la ligne de flottaison, désactivée avec `prefers-reduced-motion`, contenu visible sans JavaScript. | `assets/js/main.js`, `assets/css/main.css` | Contrôle « aucun élément à opacity 0 » du harnais. | Fait |
| 14 | Éléments décoratifs chargés : grain plein écran, bandeau défilant, orbites, compteurs « 01 / 05 ». | Bruit visuel, coût de rendu. | Retirés au profit d'une mise en page épurée. | `index.html`, `assets/css/main.css` | Revue visuelle. | Fait |
| 15 | Aucun en-tête de sécurité sur la production. | Protection limitée (clickjacking, sniffing, injection). | `vercel.json` : CSP stricte (empreinte SHA-256 du seul script en ligne), `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`, COOP ; cache long des polices. | `vercel.json` | Harnais avec `--headers` (CSP appliquée localement). | Fait, actif après déploiement |
| 16 | `README.md` publié sur le site ; futurs dossiers `docs/` et `tests/` également exposés. | Fichiers internes servis publiquement. | `.vercelignore`. | `.vercelignore` | Relecture. | Fait |
| 17 | HTML et CSS compressés à la main sur quelques lignes. | Maintenance difficile. | Code formaté, CSS organisé en sections avec jetons de design. | Tous | Validation HTML (html-validate) et CSS (csstree). | Fait |
| 18 | Pas de page 404, de manifeste ni d'icône tactile. | Finition incomplète. | `404.html`, `site.webmanifest`, icônes 180 et 512 px. | Racine, `assets/img/icons/` | Harnais (pages 404 et icônes chargées). | Fait |

## P3 — Facultatif ou décision de votre part

| # | Sujet | Recommandation | Statut |
|---|---|---|---|
| 19 | GitHub Pages est configuré sur `main:/docs` (en erreur faute de dossier). Après fusion, `docs/audit/` y serait publié. | Désactiver GitHub Pages dans les réglages du dépôt : la production est sur Vercel. | Décision requise |
| 20 | Dépôt Sportivo introuvable sur le compte Idos2004 : le rôle « projet personnel » est repris de l'ancien portfolio. | Confirmer le rôle et, si possible, lier le dépôt. | Décision requise |
| 21 | L'usage d'assistants de code IA est mentionné dans le profil et pour les projets issus de Google AI Studio. | Confirmer ce niveau de transparence, ou le préciser projet par projet. | Décision requise |
| 22 | Aucun profil LinkedIn n'est cité (aucune source fiable trouvée). | Ajouter le lien s'il existe. | À compléter |
| 23 | Portrait limité à 480 px de large (source de 486 px). | Nouvelle séance photo en haute définition pour un rendu net sur écrans Retina. | À prévoir |
| 24 | La démo EVENTO dépend d'une API en hébergement gratuit (catalogue indisponible lors des captures). | Réveiller l'API avant un entretien, ou passer à un hébergement permanent. | À prévoir |
| 25 | Le dépôt public d'Éclat Surprises s'appelle `anniversaire-`. | Le renommer (par exemple `eclat-surprises`) ; GitHub redirige l'ancien lien. | Décision requise |
| 26 | Version anglaise, thème clair, études de cas détaillées, galerie de captures. | Améliorations utiles mais non indispensables. | Non réalisé |
