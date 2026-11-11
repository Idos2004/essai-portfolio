/*
 * Portfolio de BALOGOU Eustache — interactions
 * JavaScript natif, sans dépendance. Le contenu reste entièrement lisible
 * et navigable sans JavaScript : ce fichier n'ajoute que du confort.
 *
 * Performance : aucune lecture de mise en page (scrollY, getBoundingClientRect)
 * au démarrage. Les états liés au défilement passent par IntersectionObserver.
 */
(() => {
  'use strict';

  const root = document.documentElement;
  root.classList.remove('no-js');
  root.classList.add('js');

  const hasObserver = 'IntersectionObserver' in window;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktopLayout = window.matchMedia('(min-width: 56.25em)');

  /* 1. Navigation mobile ------------------------------------------------- */
  // Le bouton garde un libellé fixe (« Menu ») : seul aria-expanded change d'état.
  const toggle = document.querySelector('[data-nav-toggle]');
  const nav = toggle && document.getElementById(toggle.getAttribute('aria-controls'));

  if (toggle && nav) {
    const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';

    const setOpen = (open, { returnFocus = false } = {}) => {
      toggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
      if (!open && returnFocus) toggle.focus();
    };

    toggle.addEventListener('click', () => setOpen(!isOpen()));

    // Un lien choisi ferme le menu.
    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });

    // Échap ferme le menu et rend le focus au bouton.
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen()) setOpen(false, { returnFocus: true });
    });

    // Un clic en dehors du menu le ferme.
    document.addEventListener('click', (event) => {
      if (isOpen() && !nav.contains(event.target) && !toggle.contains(event.target)) setOpen(false);
    });

    // Le focus qui quitte le menu le ferme : aucun élément focalisé ne reste masqué dessous.
    nav.addEventListener('focusout', (event) => {
      const next = event.relatedTarget;
      if (isOpen() && next && !nav.contains(next) && next !== toggle) setOpen(false);
    });

    // Passage en disposition large : le menu déroulant n'a plus lieu d'être.
    desktopLayout.addEventListener('change', (event) => {
      if (event.matches) setOpen(false);
    });
  }

  /* 2. En-tête : séparation visible dès que la page défile ---------------- */
  // Une sentinelle de 8 px placée en haut de page : quand elle sort de l'écran,
  // la page a défilé. Aucun écouteur de défilement, aucune lecture de scrollY.
  const header = document.querySelector('[data-header]');
  const sentinel = document.querySelector('[data-scroll-sentinel]');

  if (header && sentinel && hasObserver) {
    new IntersectionObserver(([entry]) => {
      header.classList.toggle('is-scrolled', !entry.isIntersecting);
    }).observe(sentinel);
  }

  /* 3. Lien de navigation actif selon la section affichée ----------------- */
  const navLinks = [...document.querySelectorAll('.nav-list a[href^="#"]')];
  const spiedSections = navLinks
    .map((link) => document.getElementById(link.getAttribute('href').slice(1)))
    .filter(Boolean);
  const hero = document.getElementById('accueil');

  if (hasObserver && spiedSections.length) {
    const setCurrent = (id) => {
      navLinks.forEach((link) => {
        if (link.getAttribute('href') === `#${id}`) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    };
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setCurrent(entry.target.id);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    spiedSections.forEach((section) => spy.observe(section));
    if (hero) spy.observe(hero);
  }

  /* 4. Filtres de projets ------------------------------------------------- */
  const filterButtons = [...document.querySelectorAll('[data-filter]')];
  const projects = [...document.querySelectorAll('[data-project-tags]')];
  const filterStatus = document.querySelector('[data-filter-status]');

  if (filterButtons.length && projects.length) {
    const tagsOf = (item) => item.dataset.projectTags.split(/\s+/).filter(Boolean);
    const matches = (item, value) => value === 'all' || tagsOf(item).includes(value);

    // Les compteurs sont recalculés depuis le contenu réel de la page.
    filterButtons.forEach((button) => {
      const count = button.querySelector('[data-filter-count]');
      if (count) count.textContent = String(projects.filter((item) => matches(item, button.dataset.filter)).length);
    });

    const applyFilter = (button) => {
      const value = button.dataset.filter;
      let visible = 0;
      projects.forEach((item) => {
        const show = matches(item, value);
        item.hidden = !show;
        if (show) visible += 1;
      });
      filterButtons.forEach((other) => other.setAttribute('aria-pressed', String(other === button)));
      if (filterStatus) {
        const plural = visible > 1 ? 's' : '';
        const name = button.firstChild ? button.firstChild.textContent.trim() : value;
        filterStatus.textContent = `${visible} projet${plural} affiché${plural} : ${name}.`;
      }
    };

    filterButtons.forEach((button) => button.addEventListener('click', () => applyFilter(button)));
  }

  /* 5. Copie de l'adresse e-mail ----------------------------------------- */
  const copyButton = document.querySelector('[data-copy]');
  const copyFeedback = document.querySelector('[data-copy-feedback]');

  if (copyButton) {
    let resetTimer;
    copyButton.addEventListener('click', async () => {
      const value = copyButton.dataset.copy;
      let copied = false;
      try {
        await navigator.clipboard.writeText(value);
        copied = true;
      } catch {
        copied = false;
      }
      if (!copyFeedback) return;
      const message = copied
        ? 'Adresse e-mail copiée dans le presse-papiers.'
        : `Copie impossible ici : l'adresse est ${value}`;
      // Vider puis réécrire : un second clic est de nouveau annoncé par les lecteurs d'écran.
      copyFeedback.textContent = '';
      window.clearTimeout(resetTimer);
      window.setTimeout(() => {
        copyFeedback.textContent = message;
        resetTimer = window.setTimeout(() => { copyFeedback.textContent = ''; }, 5000);
      }, 60);
    });
  }

  /* 6. Apparition progressive au défilement ------------------------------ */
  // La première notification de l'observateur indique si l'élément est déjà
  // visible : seuls ceux situés plus bas sont masqués puis révélés.
  // Rien ne disparaît après affichage, et le contenu reste visible sans JavaScript.
  if (!reduceMotion.matches && hasObserver) {
    const seen = new WeakSet();
    const pending = new Set();

    const revealer = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        const element = entry.target;
        if (!seen.has(element)) {
          seen.add(element);
          if (entry.isIntersecting) {
            observer.unobserve(element);
          } else {
            element.classList.add('reveal-pending');
            pending.add(element);
          }
          return;
        }
        if (entry.isIntersecting) {
          element.classList.add('is-revealed');
          pending.delete(element);
          observer.unobserve(element);
        }
      });
    });

    document.querySelectorAll('[data-reveal]').forEach((element) => revealer.observe(element));

    // Impression : tout doit être visible, même ce qui n'a pas encore défilé.
    window.addEventListener('beforeprint', () => {
      pending.forEach((element) => element.classList.add('is-revealed'));
    });
  }

  /* 7. Année courante ----------------------------------------------------- */
  const year = String(new Date().getFullYear());
  document.querySelectorAll('[data-year]').forEach((element) => { element.textContent = year; });

  /* 8. Impression du CV --------------------------------------------------- */
  document.querySelectorAll('[data-print]').forEach((button) => {
    button.addEventListener('click', () => window.print());
  });
})();
