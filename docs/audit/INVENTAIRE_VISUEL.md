# Inventaire visuel

## 1. Captures des plateformes (tests/tools/capture-projects.mjs)
Playwright, desktop 1440x900 (x1) et mobile 390x844 (x2), après networkidle, polices et ~1,5 s ; défilement unique puis retour en haut. Aucune connexion ni formulaire. Aucune retouche (redimensionnement seul, desktop 16:10).

| Fichier(s) | Contenu |
|---|---|
| evento-desktop / -mobile | Accueil EVENTO : héros violet « Vivez l'essentiel », recherche, catégories |
| agrimarket-desktop / -mobile | Accueil AgriMarché : héros vert, filtres, début du catalogue d'annonces |
| sportivo-desktop / -mobile | Accueil Sportivo : héros « Ton terrain, ton équipe, ton match », sports |
| eclat-surprises-desktop / -mobile | Éclat : assistant « Faites-lui une belle surprise », étape 1 Occasion |
| sportivo-terrains-{1280,640} | Liste des terrains avec filtres (11 terrains) |
| sportivo-detail-{1280,640} | Fiche « Arena Foot Fidjrossè » : galerie, tarif, créneaux |

Rejetées : evento /evenements (« 0 événement trouvé », état vide), agrimarket /support (FAQ + formulaire vide, peu valorisant). Aucune donnée personnelle de tiers visible. Mobile : 390 et 780 px (haut de page).
Particularité : eclat-surprises échoue avec `waitUntil: domcontentloaded` (ERR_ABORTED) ; le script utilise `commit` puis l'attente réseau.

## 2. Portraits (source en lecture seule)
Inventaire hors _cache/_ecartes/_outils : 00_ORIGINAUX (8 jpeg ~35 Ko), 01 (CV 2, LinkedIn 2 en 800x800, studio 2, entrepreneur 2 montages), 02 (retouche 3, fond flou 2, 2 montages), 03 (5 montages plage), 04 (editorial 1, 3 montages), 05 (4 montages), 06 (7, dont 1 montage), 07 réseaux sociaux (déclinaisons), 08 sélection (doublons de 01/02/04/06), 09 rapports. Fichiers dérivés : 1080x1350 (agrandis depuis ~486 px de large réels).
Exclus : tous les « montage » (décor fictif), 03_PLAGE_ET_VACANCES, 05_STYLE_URBAIN (montages), 07 (formats réseaux), 00_ORIGINAUX, moi.png (non autorisé).
Planche : scratchpad/planche-portraits.jpg (16 candidats). Finalistes : portrait_02_studio, portrait_08_studio, portrait_01_cinematographique.
**Retenu : 01_PHOTOS_PROFESSIONNELLES/Portrait_studio/portrait_02_studio.jpg** : visage net et frontal, cadrage buste, fond gris très sombre quasi identique à #0b0d12, lumière sobre, aucune scène fictive. Le 08_studio est trop serré et plus brillant ; le cinématographique est plus contrasté mais n'est pas la variante studio.

## 3. Fichiers produits
Projets (assets/img/projects/) : voir tableau ci-dessous. Portraits (assets/img/portrait/) : portrait-480.webp 480x600 (14,6 Ko), portrait-square-320.webp (5,5 Ko), portrait-square-320.jpg (11,6 Ko). OG : assets/img/og/og-cover.jpg 1200x630 (~58 Ko). Icônes : assets/img/icons/apple-touch-icon.png 180x180 (4,2 Ko), icon-512.png 512x512 (14,9 Ko). Scripts : tests/tools/capture-projects.mjs, tests/tools/render-brand-assets.mjs.

Tailles projets (Ko) : desktop 1280 : evento 38, agrimarket 72, sportivo 42, eclat 22, terrains 83, detail 48 ; 640 : 15, 22, 16, 8, 29, 17. Mobile 780 : 60, 63, 51, 50 ; 390 : 27, 26, 24, 21. Tous sous les seuils visés.

## 3 bis. Intégration finale (coordinateur)
- Retenus dans le site : pour chaque plateforme, une vue desktop (640 et 1280 px) dans un cadre de navigateur et une vue mobile (390 et 780 px) superposée. Pour Sportivo, la vue desktop retenue est la liste « Trouver un terrain » (plus démonstrative que l'accueil, déjà visible sur mobile).
- Retirés du dépôt car inutilisés : `sportivo-desktop-{1280,640}.webp`, `sportivo-detail-{1280,640}.webp`, `portrait-square-320.webp` (le CV utilise la version JPEG). Ils restent régénérables avec `tests/tools/capture-projects.mjs`.
- Textes alternatifs rédigés à partir du contenu réel de chaque capture ; images non prioritaires en `loading="lazy"`, portrait de l'accueil en `fetchpriority="high"`.
- Poids des images de l'accueil, choisi par le navigateur grâce à `srcset` : ≈ 0,19 Mo sur écran standard (versions 640 et 390 px), ≈ 0,33 Mo sur écran haute densité (versions 1280 et 390 px), portrait compris.

## 4. Limites
- portrait-960 non produit : la source réelle fait ~486 px de large, 960 serait un agrandissement ; plafond = 480.
- Les captures reflètent les sites au 11/11/2026 (contenus susceptibles de changer, annonces de démonstration).
- Le portrait source est un traitement automatique (contours légèrement lissés) ; le recadrage carré est centré sur le visage.
- Pas de 2e état pour AgriMarket et Éclat (pages publiques peu différenciées ou SPA sans lien).
