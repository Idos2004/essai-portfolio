(() => {
  const menuButton = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".nav-links");
  menuButton?.addEventListener("click", () => {
    const isOpen = nav?.classList.toggle("open") ?? false;
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute("aria-label", isOpen ? "Fermer le menu" : "Ouvrir le menu");
  });
  nav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
    nav.classList.remove("open");
    menuButton?.setAttribute("aria-expanded", "false");
    menuButton?.setAttribute("aria-label", "Ouvrir le menu");
  }));
  const revealTargets = document.querySelectorAll(".section-label, .about-grid, .stack-card, .project-card, .timeline-item, .languages, .contact-wrap > *");
  revealTargets.forEach((element) => element.classList.add("reveal"));
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries, currentObserver) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add("visible"); currentObserver.unobserve(entry.target); }
    }), { threshold: 0.12 });
    revealTargets.forEach((element) => observer.observe(element));
  } else revealTargets.forEach((element) => element.classList.add("visible"));
  const filterButtons = document.querySelectorAll(".filter-btn");
  const projectCards = document.querySelectorAll(".project-card");
  filterButtons.forEach((button) => button.addEventListener("click", () => {
    filterButtons.forEach((item) => { item.classList.remove("active"); item.setAttribute("aria-pressed", "false"); });
    button.classList.add("active"); button.setAttribute("aria-pressed", "true");
    const filter = button.dataset.filter;
    projectCards.forEach((card) => { card.hidden = filter !== "all" && !(card.dataset.category || "").split(" ").includes(filter); });
  }));
  const year = document.querySelector("#year");
  if (year) year.textContent = String(new Date().getFullYear());
})();