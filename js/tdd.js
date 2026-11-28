/* Project Abyss TDD page: the document bar sticks under the site menu, lights up the section being read
   and fills a progress line; following a link to a section opens nothing else, details stay as the reader left them. */
(() => {
  const bar = document.querySelector('[data-tdd-nav]');
  if (!bar) return;
  const nav = document.querySelector('.nav');
  const links = [...bar.querySelectorAll('a[href^="#"]')];
  const secs = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  const root = document.documentElement;
  let ticking = false;
  const update = () => {
    ticking = false;
    const top = nav ? nav.getBoundingClientRect().height : 0;
    root.style.setProperty('--tdd-top', top + 'px');
    const line = top + bar.offsetHeight + 24;
    let cur = 0;
    secs.forEach((s, i) => { if (s.getBoundingClientRect().top <= line + 40) cur = i; });
    links.forEach((a, i) => {
      const on = i === cur;
      if (on !== a.classList.contains('is-active')) {
        a.classList.toggle('is-active', on);
        if (on) { a.setAttribute('aria-current', 'true'); const r = a.offsetLeft - (a.parentNode.clientWidth - a.offsetWidth) / 2; a.parentNode.scrollTo({ left: r, behavior: 'smooth' }); }
        else a.removeAttribute('aria-current');
      }
    });
    const first = secs[0].getBoundingClientRect().top + scrollY - line;
    const end = document.querySelector('.contact');
    const last = (end ? end.getBoundingClientRect().top + scrollY : document.body.scrollHeight) - innerHeight;
    const p = Math.min(1, Math.max(0, (scrollY - first) / Math.max(1, last - first)));
    bar.style.setProperty('--p', p.toFixed(3));
  };
  const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener('scroll', req, { passive: true });
  addEventListener('resize', req);
  document.addEventListener('toggle', req, true);
  update();
})();
