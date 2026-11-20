/* Projects: reads data/projects.json and renders cards.
   <div data-projects="featured" data-base=""></div>      → featured cards (home)
   <div data-projects="all" data-base="../"></div>        → case studies + compact list (projects page) */
(() => {
  'use strict';
  const hosts = document.querySelectorAll('[data-projects]');
  if (!hosts.length) return;

  const FRL = document.documentElement.lang === 'fr';
  const CTA_FR = {
    'case-study': 'Lire l’étude de cas ▷',
    video: 'Voir la vidéo ↗',
    external: 'Jouer sur itch.io ↗',
    nda: 'Sous NDA · voir Expériences ▷',
    devlog: 'Lire le devlog ▷',
    info: 'Projet de stage',
    soon: 'Étude de cas bientôt',
    wip: 'En cours'
  };
  const L = (p, k) => (FRL && p.fr && p.fr[k] != null ? p.fr[k] : p[k]);
  const CL = (c) => (FRL && c.label_fr ? c.label_fr : c.label);
  const CTA = {
    'case-study': 'Read case study ▷',
    video: 'Watch the video ↗',
    external: 'Play on itch.io ↗',
    nda: 'Under NDA · see Experience ▷',
    devlog: 'Read the devlog ▷',
    info: 'Internship project',
    soon: 'Case study coming soon',
    wip: 'In progress'
  };
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  /* A field still waiting for info (empty or "[Role]") is never shown */
  const known = (v) => v != null && String(v).trim() !== '' && !/^\[.*\]$/.test(String(v).trim());
  const abs = (u, base) => (!u || /^(https?:|#|mailto:)/.test(u) ? u : base + u);

  function card(p, cats, base, linkBase) {
    const cat = cats[p.category] || { label: p.category, color: '--c-projects' };
    const ctaMap = FRL ? CTA_FR : CTA;
    const linked = p.url && !['soon', 'wip', 'info'].includes(p.status);
    const tag = linked ? 'a' : 'div';
    const href = linked ? ` href="${esc(abs(p.url, linkBase))}"` : '';
    const ext = linked && /^https?:/.test(p.url) ? ' target="_blank" rel="noopener"' : '';
    const media = p.thumb
      ? `<img src="${esc(abs(p.thumb, base))}" alt="" loading="lazy">${p.hover ? `<video muted loop playsinline preload="none" src="${esc(abs(p.hover, base))}"></video>` : ''}`
      : `<span class="card__ph card__ph--${esc(p.status)}">${p.status === 'nda' ? (FRL ? 'NDA · sans visuels' : 'NDA · no visuals') : esc(CL(cat))}</span>`;
    return `<${tag} class="node card reveal${linked ? '' : ' card--soon'}" style="--c:var(${cat.color})"${href}${ext}>
      <div class="node__head"><span class="node__icon" aria-hidden="true">ƒ</span>${esc(L(p, 'title'))}<span class="meta">${esc(L(p, 'period'))}</span></div>
      <div class="card__media">${media}</div>
      <div class="card__body">
        <div class="card__cat"><span class="chip" style="--c:var(${cat.color})">${esc(CL(cat))}</span>${known(L(p, 'team')) ? `<span class="card__team">${esc(L(p, 'team'))}</span>` : ''}</div>
        <p class="card__pitch">${esc(L(p, 'pitch'))}</p>
        ${known(L(p, 'role')) ? `<p class="card__role">${esc(L(p, 'role'))}</p>` : ''}
        <span class="card__cta">${ctaMap[p.status] || ''}</span>
      </div>
    </${tag}>`;
  }

  /* Bento card (home): one-line hook + proof metric, no role line */
  function bento(p, cats, base, linkBase, i) {
    const cat = cats[p.category] || { label: p.category, color: '--c-projects' };
    const linked = p.url && !['soon', 'wip', 'info'].includes(p.status);
    const tag = linked ? 'a' : 'div';
    const href = linked ? ` href="${esc(abs(p.url, linkBase))}"` : '';
    const media = p.thumb
      ? `<img src="${esc(abs(p.thumb, base))}" alt="" loading="lazy">${p.hover ? `<video muted loop playsinline preload="none" src="${esc(abs(p.hover, base))}"></video>` : ''}`
      : `<span class="card__ph card__ph--${esc(p.status)}">${esc(L(p, 'title'))}</span>`;
    return `<${tag} class="node card bento__item bento__item--${i} reveal" style="--c:var(${cat.color})"${href}>
      <div class="node__head"><span class="node__icon" aria-hidden="true">ƒ</span>${esc(L(p, 'title'))}<span class="meta">${esc(L(p, 'kind') || CL(cat))} · ${esc(L(p, 'period'))}</span></div>
      <div class="card__media">${media}</div>
      <div class="card__body">
        <p class="bento__hook">${esc(L(p, 'hook') || L(p, 'pitch'))}</p>
        ${p.metric ? `<p class="bento__metric">${esc(L(p, 'metric'))}</p>` : ''}
        <span class="card__cta">${(FRL ? CTA_FR : CTA)[p.status] || ''}</span>
      </div>
    </${tag}>`;
  }

  /* Case-study card (projects page): the skills it proves come first, then the hook */
  function spotCard(p, cats, base, linkBase, T) {
    const cat = cats[p.category] || { label: p.category, color: '--c-projects' };
    const linked = p.url && !['soon', 'wip', 'info'].includes(p.status);
    const tag = linked ? 'a' : 'div';
    const href = linked ? ` href="${esc(abs(p.url, linkBase))}"` : '';
    const media = p.thumb
      ? `<img src="${esc(abs(p.thumb, base))}" alt="" loading="lazy">${p.hover ? `<video muted loop playsinline preload="none" src="${esc(abs(p.hover, base))}"></video>` : ''}`
      : `<span class="card__ph card__ph--${esc(p.status)}">${esc(L(p, 'title'))}</span>`;
    const proves = L(p, 'proves') || [];
    return `<${tag} class="node card spot__item reveal" data-skills="${esc((p.skills || []).join(' '))}" style="--c:var(${cat.color})"${href}>
      <div class="node__head"><span class="node__icon" aria-hidden="true">ƒ</span>${esc(L(p, 'title'))}<span class="meta">${esc(L(p, 'kind') || CL(cat))} · ${esc(L(p, 'period'))}</span></div>
      <div class="card__media">${media}</div>
      <div class="card__body">
        ${proves.length ? `<div class="proves"><span class="proves__label">${T.proves}</span>${proves.map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</div>` : ''}
        <p class="card__pitch">${esc(L(p, 'hook') || L(p, 'pitch'))}</p>
        ${p.metric ? `<p class="bento__metric">${esc(L(p, 'metric'))}</p>` : ''}
        ${known(L(p, 'role')) && !String(L(p, 'metric') || '').includes(L(p, 'role')) ? `<p class="card__role">${esc(L(p, 'role'))}</p>` : ''}
        <span class="card__cta">${(FRL ? CTA_FR : CTA)[p.status] || ''}</span>
      </div>
    </${tag}>`;
  }

  /* Compact row (projects page): one line per smaller project, no empty image */
  function row(p, cats, base, linkBase) {
    const cat = cats[p.category] || { label: p.category, color: '--c-projects' };
    const linked = p.url && !['soon', 'wip', 'info'].includes(p.status);
    const tag = linked ? 'a' : 'div';
    const href = linked ? ` href="${esc(abs(p.url, linkBase))}"` : '';
    const ext = linked && /^https?:/.test(p.url) ? ' target="_blank" rel="noopener"' : '';
    const who = [L(p, 'team'), L(p, 'role')].filter(known).map(esc).join(' · ');
    const thumb = p.thumb ? `<span class="prow__thumb"><img src="${esc(base + p.thumb)}" alt="" loading="lazy"></span>` : '';
    return `<li class="reveal" data-skills="${esc((p.skills || []).join(' '))}"><${tag} class="prow${linked ? '' : ' prow--soon'}${thumb ? ' prow--thumb' : ''}" style="--c:var(${cat.color})"${href}${ext}>
      <span class="prow__year">${esc(p.date.slice(0, 4))}</span>${thumb}
      <span class="prow__main">
        <span class="prow__title">${esc(L(p, 'title'))}<span class="chip">${esc(CL(cat))}</span></span>
        <span class="prow__pitch">${esc(L(p, 'pitch'))}</span>
        ${who ? `<span class="prow__who">${who}</span>` : ''}
      </span>
      <span class="prow__cta">${(FRL ? CTA_FR : CTA)[p.status] || ''}</span>
    </${tag}></li>`;
  }

  function wireHover(root) {
    root.querySelectorAll('.card').forEach((c) => {
      const v = c.querySelector('video');
      if (!v) return;
      const play = () => v.play().then(() => v.classList.add('is-ready')).catch(() => {});
      c.addEventListener('mouseenter', play); c.addEventListener('focus', play);
      c.addEventListener('mouseleave', () => v.pause()); c.addEventListener('blur', () => v.pause());
    });
    root.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-live'));
  }

  hosts.forEach(async (host) => {
    const base = host.dataset.base || '';
    const linkBase = host.dataset.linkBase ?? base; // page links stay inside the current language
    let data;
    try { data = await (await fetch(base + 'data/projects.json')).json(); } catch { return; }
    const cats = data.categories;
    const list = [...data.projects].sort((a, b) => b.date.localeCompare(a.date));

    if (host.dataset.projects === 'featured') {
      const feat = list.filter((p) => p.featured).sort((a, b) => a.featured - b.featured);
      host.innerHTML = host.dataset.layout === 'bento'
        ? `<div class="bento">${feat.map((p, i) => bento(p, cats, base, linkBase, i + 1)).join('')}</div>`
        : `<div class="cards">${feat.map((p) => card(p, cats, base, linkBase)).join('')}</div>`;
      const n = document.querySelector('[data-projects-count]');
      if (n) n.textContent = list.length;
      wireHover(host);
      return;
    }

    /* All projects: big case-study cards first, then a compact list of everything else */
    const spot = list.filter((p) => p.spotlight).sort((a, b) => a.spotlight - b.spotlight);
    const rest = list.filter((p) => !p.spotlight);
    const T = FRL
      ? { spot: 'Études de cas', more: 'Autres projets', proves: 'Prouve' }
      : { spot: 'Case studies', more: 'More work', proves: 'Proves' };
    const skills = data.skills || {};
    const sCount = (k) => list.filter((p) => (p.skills || []).includes(k)).length;
    const sKeys = Object.keys(skills).filter(sCount);
    host.innerHTML = `
      <div class="filters" role="group" aria-label="${FRL ? 'Filtrer par compétence' : 'Filter by skill'}">
        <span class="filters__label">${FRL ? 'Compétence' : 'Skill'}</span>
        <button type="button" class="filter" aria-pressed="true" data-f="all">${FRL ? 'Tous' : 'All'} <span>${list.length}</span></button>
        ${sKeys.map((k) => `<button type="button" class="filter" aria-pressed="false" data-f="${k}" style="--c:var(${skills[k].color})">${esc(CL(skills[k]))} <span>${sCount(k)}</span></button>`).join('')}
      </div>
      <section class="ptier" aria-labelledby="ptier-spot">
        <h2 id="ptier-spot" class="stitle" style="--c:var(--ac)"><span class="stitle__tag">${T.spot}</span><span class="stitle__rule"></span></h2>
        <div class="spot">${spot.map((p) => spotCard(p, cats, base, linkBase, T)).join('')}</div>
      </section>
      <section class="ptier" aria-labelledby="ptier-more">
        <h2 id="ptier-more" class="stitle" style="--c:var(--ac)"><span class="stitle__tag">${T.more}</span><span class="stitle__rule"></span></h2>
        <ul class="plist">${rest.map((p) => row(p, cats, base, linkBase)).join('')}</ul>
      </section>`;
    wireHover(host);
    const apply = (f) => {
      host.querySelectorAll('[data-skills]').forEach((el) => { el.hidden = f !== 'all' && !el.dataset.skills.split(' ').includes(f); });
      host.querySelectorAll('.ptier').forEach((t) => { t.hidden = !t.querySelector('[data-skills]:not([hidden])'); });
      document.dispatchEvent(new CustomEvent('layout:changed'));
    };
    host.querySelectorAll('.filter').forEach((b) => b.addEventListener('click', () => {
      host.querySelectorAll('.filter').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      apply(b.dataset.f);
      try { history.replaceState(null, '', b.dataset.f === 'all' ? location.pathname : `#${b.dataset.f}`); } catch {}
    }));
    const start = host.querySelector(`.filter[data-f="${CSS.escape(location.hash.slice(1))}"]`);
    if (start) start.click(); else apply('all');
  });
})();
