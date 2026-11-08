(() => {
 const menu=document.querySelector('.menu'),nav=document.querySelector('nav');
 menu?.addEventListener('click',()=>{const open=nav?.classList.toggle('open')??false;menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Fermer le menu':'Ouvrir le menu');});
 nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menu?.setAttribute('aria-expanded','false');}));
 const filters=[...document.querySelectorAll('[data-filter]')],projects=[...document.querySelectorAll('.project[data-category]')];
 filters.forEach(button=>button.addEventListener('click',()=>{filters.forEach(item=>item.classList.toggle('active',item===button));const chosen=button.dataset.filter;projects.forEach(card=>{const cats=(card.dataset.category||'').split(/\s+/);card.hidden=chosen!=='all'&&!cats.includes(chosen);});}));
 const year=document.querySelector('#year');if(year)year.textContent=new Date().getFullYear();
 const reveal=document.querySelectorAll('.reveal');if('IntersectionObserver'in window&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}}),{threshold:.12});reveal.forEach(node=>observer.observe(node));}else reveal.forEach(node=>node.classList.add('visible'));
})();