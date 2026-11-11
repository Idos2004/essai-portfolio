# Audit initial du portfolio

État audité : branche `main` (commit `2b18558`), identique octet pour octet à la production https://balogou-portfolio.vercel.app.
Date : 11 novembre 2026. Mesures réalisées sur une copie propre de `main` (`git archive`), avec le harnais `tests/qa.mjs`.

## Synthèse

**État général.** Site statique en HTML, CSS et JavaScript natifs (8 fichiers), déployé sur Vercel sans étape de build. La base est saine : aucun débordement horizontal, aucune erreur JavaScript, un titre principal unique, un SEO technique de base correct (Lighthouse SEO 100).

**Forces existantes.**
- Direction artistique sombre déjà cohérente, avec une couleur d'accent identifiable.
- Souci d'honnêteté déjà visible : niveaux de compétences modestes, visuels signalés comme illustratifs, projets non publics indiqués.
- Respect partiel de `prefers-reduced-motion` ; aucun contenu masqué sans JavaScript.

**Principaux problèmes.**
1. Plusieurs informations de projets inexactes ou invérifiables (voir § 4).
2. Aucune capture réelle : les « aperçus » sont des maquettes dessinées en CSS.
3. Texte très petit (11 déclarations à 7 px, 14 % de texte jugé lisible sur mobile) et contrastes insuffisants (jusqu'à 3,16:1).
4. Interactions peu accessibles : pas de lien d'évitement, aucune règle `:focus`, menu mobile sans Échap, filtres sans état exposé.
5. Code mort (`app.js`, `moi.png`), CV isolé de la navigation, partage social sans image, aucun en-tête de sécurité.

## Mesures de référence

| Mesure | Résultat avant |
|---|---|
| Lighthouse mobile | Performance 85 · Accessibilité 94 · Bonnes pratiques 96 · SEO 100 ; FCP et LCP 3,3 s ; TBT 0 ; CLS 0 |
| Lighthouse desktop | Performance 91 · Accessibilité 91 · Bonnes pratiques 100 · SEO 100 ; FCP et LCP 1,3 s ; CLS 0,006 |
| Principaux audits en échec | contraste ; ressources bloquantes (≈ 730 ms, polices Google) ; taille de police (14 % lisible) ; cache |
| axe-core, `index.html` | `color-contrast` (grave) : 16 nœuds à 1440 px, 13 à 390 px |
| axe-core, `cv.html` | `region` (modéré) : contenu hors repère |
| Débordement horizontal | aucun (2 pages × 5 largeurs d'écran) |
| Erreurs | aucune sur l'accueil ; `cv.html` : 404 sur `/favicon.ico` |
| Liens externes (8) | 1 cassé : dépôt privé `eloquence-idos` (404 pour les visiteurs) |
| SEO social et structuré | absents : canonical, `og:image`, `og:url`, `og:type`, carte Twitter, JSON-LD |
| Fichiers techniques | `robots.txt`, `sitemap.xml`, `404.html` absents |
| CV imprimé | 2 pages A4, colonnes coupées |
| Menu mobile | bouton de 30 × 29 px ; Échap ne ferme pas le menu |
| Filtres | aucun `aria-pressed` ; rangée tronquée à 390 px |
| Clavier | pas de lien d'évitement ; indicateur de focus laissé au navigateur |
| En-têtes de production | seul HSTS est présent (aucune CSP, ni `nosniff`, ni `Referrer-Policy`) ; `Cache-Control: max-age=0` |

## 1. Audit technique

| Constat | Fichier | Problème | Gravité |
|---|---|---|---|
| Deux scripts pour un seul site | `app.js`, `script.js` | `index.html` ne charge que `script.js`. `app.js` (rendu des projets en JavaScript) cible `#projectsGrid`, `#menuToggle`, `#mainNav` et `#copyEmail`, absents du HTML, avec des données divergentes (Fudei-Ludi, pile EVENTO). C'est un reste d'une version antérieure. | P0 |
| Image orpheline | `moi.png` (1024×1536, 2,2 Mo) | Référencée seulement par l'ancienne branche `portfolio-redesign-2026`. | P0 |
| Animations mortes | `script.js` l. 8, `styles.css` | Le script observe `.reveal`, qu'aucun élément ne porte. | P2 |
| Code compressé à la main | `index.html` (12 lignes), `styles.css` | Lecture et revue difficiles. | P2 |
| Styles et script en ligne dans le CV | `cv.html` | Bloc `<style>` et `onclick` : incompatibles avec une CSP stricte. | P1 |
| Chemins absolus | `index.html` | `/styles.css` fonctionne sur Vercel mais pas en ouvrant le fichier, comme le conseillait le README. | P1 |
| Branches alternatives | `portfolio-dark-premium`, `portfolio-redesign-2026` | Versions antérieures non fusionnées ; `main` est la plus complète. Laissées intactes. | Info |
| Déploiement | — | Vercel (aucun `vercel.json`). GitHub Pages est aussi activé sur `main:/docs`, en erreur faute de dossier. | P3 |
| Polices | `index.html` | 3 familles Google Fonts sur 2 origines tierces, bloquantes (≈ 730 ms). | P2 |

## 2. Audit UI/UX

1. **Lisibilité** : contenu courant entre 7 et 12 px (`.hero-foot` 8 px, libellés 8 px, filtres 9 px, descriptions de projets 10 px).
2. **Contraste** : `.eyebrow span` (#596372) et `.hero-foot` (#596170) sur #090b10, soit 3,24 et 3,16:1 pour 4,5 requis.
3. **Accueil** : titre en slogan sans le nom, dernier mot en contour de 1 px peu lisible ; à 390 px, le décor (orbites, pastilles flottantes) occupe un écran entier sans information.
4. **Projets** : maquettes CSS illustratives au texte illisible sur mobile, aucune capture réelle ; rangée de filtres tronquée à 390 px.
5. **Navigation** : CV absent du menu et de l'accueil ; bouton de menu de 30 px, sous la cible tactile recommandée de 44 px.
6. **Bruit visuel** : grain plein écran, bandeau défilant, compteurs décoratifs (« 01 / 05 »).

## 3. SEO et accessibilité

- **SEO** : `title` (34 caractères) et `description` (110 caractères) corrects mais peu descriptifs ; aucune balise de partage avec image ni URL canonique ; pas de données structurées ; pas de `robots.txt` ni de `sitemap.xml`. Le CV n'a ni description ni favicon.
- **Accessibilité** (cible WCAG 2.2 AA) : échecs de contraste (1.4.3) ; pas de mécanisme d'évitement (2.4.1) ; focus non stylé (2.4.7) ; état des filtres non exposé (4.1.2) ; menu mobile sans Échap ; cible du menu trop petite (2.5.8 demande 24 px minimum, 44 px recommandés) ; `<label>` utilisés hors formulaires.
- **Points conformes** : `lang="fr"`, un seul `h1`, aucun saut de niveau de titre, `prefers-reduced-motion` respecté, contenu visible sans JavaScript.

## 4. Audit des contenus

Vérification menée sur les dépôts (`gh api`, lecture seule) et les démonstrations en ligne.

| Projet | Constat | Correction appliquée |
|---|---|---|
| EVENTO | Badge « EN LIGNE », mais il s'agit d'une version de test (paiement FedaPay simulé, API en hébergement gratuit). Pile contradictoire (Redis ou Prisma) : les deux sont utilisés. Projet solo (48 commits), tests et CI réels. | Statut « Version de test en ligne », pile complète, qualité mise en avant. |
| AgriMarket / AgriMarché | Le site, le README et les données affichent « AgriMarché ». Les « paiements simulés » cités n'existent pas : seuls SMS et notifications sont simulés. | Nom unifié « AgriMarché », simulations décrites exactement. |
| Sportivo | Dépôt introuvable sur le compte Idos2004 ; fonctionnalités jamais décrites. | Fonctionnalités décrites d'après le site ; rôle repris de l'ancien portfolio, **à confirmer**. |
| Éclat Surprises | Annoncé en Next.js ; c'est du HTML, CSS et JavaScript natifs. Dépôt public `anniversaire-`. | Pile corrigée, lien vers le code ajouté. |
| gestionTemps | Présenté pour ses tests et sa CI, mais un seul test factice ; fonction réelle non décrite (roue de la vie, objectifs SMART, planificateur, bilan annuel). Base Google AI Studio. | Décrit comme prototype, avec sa fonction réelle. |
| SIRADn | Aucun dépôt accessible ; rôle déclaré (cahier des charges, back-end avec IA). | Présenté comme projet d'équipe non public. |
| L'École de l'Éloquence | Lien vers un dépôt privé (404). Studio web à 2 commits issu d'AI Studio ; une application Android sérieuse (« Éloquence », Kotlin/Compose, Room, tests) n'était pas valorisée. | Les deux outils présentés, sans lien privé. |
| Fudei-Ludi | Nom réel « Fidei Ludi » ; démo AI Studio privée. | Nom corrigé, lien vers le dépôt public uniquement. |
| Compétences | NestJS, Next.js et Prisma absents alors qu'ils sont utilisés dans les projets ; niveaux non reliés aux preuves. | Classement « Utilisé en projet / En progression / Notions ». |
| CV | Sportivo, Éclat et l'application Android absents ; pas de lien vers le portfolio. | CV aligné sur la page d'accueil. |

Aucune information n'a été ajoutée sans preuve. Les données personnelles de tiers vues dans les dépôts (numéros de démonstration, nom d'un proche, adresse de support) ne sont pas publiées.

## 5. Ressources visuelles

Voir [INVENTAIRE_VISUEL.md](INVENTAIRE_VISUEL.md). En résumé : le dossier `PHOTOS_PROFESSIONNELLES` ne contient que des portraits (aucune capture de projet) ; les fichiers « montage » sont des décors fictifs et ont été exclus ; les captures des projets ont été réalisées sur les sites en ligne.
