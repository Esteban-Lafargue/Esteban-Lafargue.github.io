/* Esteban Lafargue — Portfolio · tiny, dependency-free behaviour */
(() => {
  'use strict';

  /* 0. WIP mode: ?wip shows every element masked with [data-wip][hidden] (unfinished content kept for
        demos and tests), ?wip=0 turns it off. Remembered for the tab (sessionStorage); visitors never see it. */
  {
    let wip = false;
    const q = new URLSearchParams(location.search);
    try {
      if (q.has('wip')) { if (q.get('wip') === '0') sessionStorage.removeItem('wip'); else sessionStorage.setItem('wip', '1'); }
      wip = sessionStorage.getItem('wip') === '1';
    } catch (err) { wip = q.has('wip') && q.get('wip') !== '0'; }
    if (wip) {
      document.documentElement.classList.add('is-wip');
      document.querySelectorAll('[data-wip][hidden]').forEach((el) => el.removeAttribute('hidden'));
      const badge = document.createElement('a');
      badge.className = 'wip-badge'; badge.href = '?wip=0';
      badge.textContent = 'WIP mode · hidden items shown · exit';
      document.body.appendChild(badge);
    }
  }

  /* 1. Light up nodes, pins and wires as they enter the viewport */
  const live = document.querySelectorAll('.reveal, .wire, .node, .stitle');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-live');
          io.unobserve(e.target);
        }
      }
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
    live.forEach((el) => io.observe(el));
  } else {
    live.forEach((el) => el.classList.add('is-live'));
  }

  /* 2. YouTube facade: load the player only when asked (fast first paint) */
  document.querySelectorAll('.yt[data-yt]').forEach((box) => {
    const id = box.dataset.yt;
    const btn = box.querySelector('.yt__btn');
    if (!btn || !/^[\w-]{11}$/.test(id)) {
      if (btn) { btn.disabled = true; btn.querySelector('.yt__label').textContent = document.documentElement.lang === 'fr' ? '[Showreel — lien à venir]' : '[Showreel — link to come]'; }
      return;
    }
    btn.style.backgroundImage = `url(https://i.ytimg.com/vi/${id}/maxresdefault.jpg)`;
    btn.addEventListener('click', () => {
      const f = document.createElement('iframe');
      f.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
      f.title = box.dataset.title || 'Video';
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.allowFullscreen = true;
      box.replaceChildren(f);
    }, { once: true });
  });

  /* 3. Case-study cards: play the hover clip if one is provided */
  document.querySelectorAll('.card, .sys--main').forEach((card) => {
    const v = card.querySelector('video');
    if (!v) return;
    const play = () => { v.play().then(() => v.classList.add('is-ready')).catch(() => {}); };
    const stop = () => { v.pause(); };
    card.addEventListener('mouseenter', play);
    card.addEventListener('focus', play);
    card.addEventListener('mouseleave', stop);
    card.addEventListener('blur', stop);
  });
})();

/* 4. Step clips: play while visible, pause when off-screen; click toggles */
(() => {
  const clips = document.querySelectorAll('video.loop');
  if (!clips.length) return;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  clips.forEach((v) => {
    v.addEventListener('click', () => (v.paused ? v.play() : v.pause()));
    if (calm) v.controls = true;
  });
  if (calm || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) e.target.play().catch(() => {});
      else e.target.pause();
    }
  }, { threshold: 0.4 });
  clips.forEach((v) => io.observe(v));
})();

/* 5. Blueprint lightbox: click a graph to view it full size, click again to zoom, ← → to browse */
(() => {
  const dlg = document.querySelector('dialog.lightbox');
  if (!dlg || typeof dlg.showModal !== 'function') return;
  const stage = dlg.querySelector('.lightbox__stage');
  const img = stage.querySelector('img');
  const cap = dlg.querySelector('.lightbox__cap');
  const num = dlg.querySelector('.lightbox__n');
  let set = [], i = 0;
  const show = () => {
    const b = set[i];
    stage.classList.remove('is-zoomed');
    img.src = b.dataset.full; img.alt = b.dataset.caption; cap.textContent = b.dataset.caption;
    num.textContent = `${i + 1} / ${set.length}`;
  };
  document.querySelectorAll('.bp__thumb').forEach((b) => b.addEventListener('click', () => {
    set = [...b.closest('.bp__list').querySelectorAll('.bp__thumb')];
    i = set.indexOf(b); show(); dlg.showModal();
  }));
  const step = (d) => { i = (i + d + set.length) % set.length; show(); };
  img.addEventListener('click', (e) => {
    const r = img.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
    const z = stage.classList.toggle('is-zoomed');
    if (z) { stage.scrollLeft = fx * img.naturalWidth - stage.clientWidth / 2; stage.scrollTop = fy * img.naturalHeight - stage.clientHeight / 2; }
  });
  dlg.addEventListener('click', (e) => {
    const a = e.target.closest('[data-lb]');
    if (a) { a.dataset.lb === 'close' ? dlg.close() : step(a.dataset.lb === 'next' ? 1 : -1); }
    else if (e.target === dlg) dlg.close();
  });
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') step(1);
    if (e.key === 'ArrowLeft') step(-1);
  });
})();

/* 6. Exec rail: one continuous Blueprint wire in the left margin.
      Every section title (.stitle) or [data-stop] element gets a pin; the wire fills as you read,
      each pin pops when reached and the wire stops exactly on the last one. */
(() => {
  const main = document.querySelector('main.wrap');
  if (!main) return;
  document.documentElement.classList.add('has-rail');
  const rail = document.createElement('div');
  rail.className = 'rail';
  rail.setAttribute('aria-hidden', 'true');
  rail.innerHTML = '<i class="rail__fill"></i>';
  main.prepend(rail);
  let stops = [];
  let lastReading = -Infinity;
  const hit = (s) => { s.classList.remove('is-hit'); void s.offsetWidth; s.classList.add('is-hit'); };

  const layout = () => {
    const wasEnd = rail.classList.contains('is-end');
    rail.querySelectorAll('.rail__stop').forEach((n) => n.remove());
    const els = [...main.querySelectorAll('.stitle, [data-stop]')].filter((e) => e.offsetParent !== null);
    if (els.length < 2) { rail.hidden = true; return; }
    rail.hidden = false;
    const mTop = main.getBoundingClientRect().top + scrollY;
    const rLeft = rail.getBoundingClientRect().left;
    stops = els.map((el) => {
      const r = el.getBoundingClientRect();
      const anchor = el.querySelector('.stitle__tag, .node__head') || el;
      const ar = anchor.getBoundingClientRect();
      const y = ar.top + scrollY - mTop + Math.min(ar.height, 44) / 2;
      const c = getComputedStyle(anchor).getPropertyValue('--c').trim() || getComputedStyle(el).getPropertyValue('--c').trim();
      const s = document.createElement('span');
      s.className = 'rail__stop';
      s.style.top = `${y}px`;
      if (c) s.style.setProperty('--c', c);
      s.style.setProperty('--w', `${Math.max(0, r.left - rLeft - 6)}px`);
      rail.append(s);
      return { y, s, el };
    });
    // the wire ends exactly on the last pin: reaching it is the payoff
    stops[stops.length - 1].s.classList.add('rail__stop--end');
    stops.forEach((st) => { st.on = st.y <= lastReading; st.s.classList.toggle('is-on', st.on); });
    const first = stops[0].y, last = stops[stops.length - 1].y;
    rail.style.setProperty('--top', `${first}px`);
    rail.style.setProperty('--len', `${last - first}px`);
    rail.classList.toggle('is-end', wasEnd && stops[stops.length - 1].on);
    update();
  };

  const update = () => {
    if (!stops.length) return;
    const mTop = main.getBoundingClientRect().top + scrollY;
    // reading line sits at 55% of the screen, then slides to the bottom edge as the page ends
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const t = Math.min(1, scrollY / max);
    const reading = scrollY + innerHeight * (0.55 + 0.45 * t ** 3) - mTop + (t > 0.995 ? 9999 : 0);
    const first = stops[0].y, last = stops[stops.length - 1].y;
    const fill = Math.max(0, Math.min(reading, last) - first);
    rail.style.setProperty('--fill', `${fill}px`);
    lastReading = reading;
    stops.forEach((st) => {
      const on = st.y <= reading;
      if (on === st.on) return;
      st.on = on;
      st.s.classList.toggle('is-on', on);
      if (on) hit(st.s); // juice: the pin pops when the wire reaches it
      if (on && st.el.classList.contains('career__item')) hit(st.el); // juice: career step node pops with its pin
      if (st.el.classList.contains('career__item')) st.el.classList.toggle('is-reached', on);
    });
    rail.classList.toggle('is-end', stops[stops.length - 1].on);
  };

  let raf = 0;
  addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); }, { passive: true });
  addEventListener('resize', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(layout); });
  // career path: opening "Details" pushes the next stops down, so the pins follow
  main.addEventListener('toggle', (e) => { if (e.target.closest('.career')) { cancelAnimationFrame(raf); raf = requestAnimationFrame(layout); } }, true);
  addEventListener('load', layout);
  document.addEventListener('layout:changed', () => requestAnimationFrame(layout));
  document.querySelectorAll('details').forEach((d) => d.addEventListener('toggle', () => requestAnimationFrame(layout)));
  if ('ResizeObserver' in window) new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(layout); }).observe(main);
  layout();
})();

/* 7. Contact form (Web3Forms): send in place, without leaving the page */
(() => {
  const form = document.querySelector('form[data-web3forms]');
  if (!form) return;
  const status = form.querySelector('.form__status');
  const FRL = document.documentElement.lang === 'fr';
  const MSG = FRL ? { off: 'Le formulaire n’est pas encore relié. Utilisez le lien email en attendant.', sending: 'Envoi…', ok: 'Message envoyé. Merci, je vous réponds très vite.', err: 'Un problème est survenu. Écrivez-moi à estebanlafargue34@gmail.com.' }
                  : { off: 'The form is not connected yet. Please use the email link for now.', sending: 'Sending…', ok: 'Message sent. Thank you, I’ll get back to you soon.', err: 'Something went wrong. Please write to estebanlafargue34@gmail.com.' };
  const btn = form.querySelector('.form__send');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.access_key.value === 'WEB3FORMS_ACCESS_KEY') {
      status.className = 'form__status is-err';
      status.textContent = MSG.off;
      return;
    }
    btn.disabled = true; status.className = 'form__status'; status.textContent = MSG.sending;
    try {
      const res = await fetch(form.action, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      form.reset();
      status.className = 'form__status is-ok';
      status.textContent = MSG.ok;
    } catch {
      status.className = 'form__status is-err';
      status.textContent = MSG.err;
    } finally { btn.disabled = false; }
  });
})();

/* 8. Demo reel: big play button over the poster, so it reads as clickable */
(() => {
  document.querySelectorAll('video.reel__video').forEach((v) => {
    const wrap = document.createElement('div');
    wrap.className = 'reel__wrap';
    v.replaceWith(wrap); wrap.append(v);
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'reel__play';
    b.innerHTML = `<span class="yt__play" aria-hidden="true"></span><span class="reel__label">${document.documentElement.lang === 'fr' ? 'Lancer la Demo Reel' : 'Play the demo reel'}</span>`;
    wrap.append(b);
    v.removeAttribute('controls');
    b.addEventListener('click', () => { v.controls = true; v.play(); });
    v.addEventListener('play', () => wrap.classList.add('is-playing'));
  });
})();

/* 9. Living background: soft light pulses travel along the grid, and the grid glows a little
      under the cursor. Low contrast, behind everything, paused when the tab is hidden. */
(() => {
  // soft mode when the system asks for less motion: slower, fewer pulses, shapes don't spin
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cv = document.createElement('canvas');
  cv.className = 'bg-live';
  cv.setAttribute('aria-hidden', 'true');
  document.body.prepend(cv);
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  const G = 32;
  const COLORS = ['#4da3ff', '#4fd8ff', '#b18cff', '#3ddc97', '#f2c14e'];
  const fine = matchMedia('(pointer: fine)').matches;
  let rings = [], debris = [];
  const SHAPES = ['circle', 'square', 'diamond', 'hex', 'tri', 'star'];
  const poly = (x, y, r, n, rot, inner) => { // regular polygon, or a star when inner is set
    const k = inner ? n * 2 : n;
    for (let i = 0; i <= k; i++) {
      const a = rot + (i / k) * 6.283 - 1.5708, rr = inner && i % 2 ? r * inner : r;
      i ? ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
  };
  const shape = (kind, x, y, r, rot) => {
    ctx.beginPath();
    if (kind === 'circle') ctx.arc(x, y, r, 0, 6.283);
    else if (kind === 'square') poly(x, y, r * 1.2, 4, rot + 0.785);
    else if (kind === 'diamond') poly(x, y, r * 1.2, 4, rot);
    else if (kind === 'hex') poly(x, y, r * 1.05, 6, rot);
    else if (kind === 'tri') poly(x, y, r * 1.2, 3, rot);
    else poly(x, y, r * 1.2, 5, rot, 0.5);
  };
  let overFree = false, aiming = false;
  const WAVES = true;
  const WAVE_KINDS = ['sweep', 'ring', 'diamond', 'scan'];
  let wave = null, waveIdx = (Math.random() * 4) | 0, nextWave = performance.now() + 2500;
  let w = 0, h = 0, pulses = [], mx = -1e4, my = -1e4, gx = -1e4, gy = -1e4, prev = 0, nextSpawn = 0;

  const size = () => {
    const dpr = Math.min(2, devicePixelRatio || 1);
    w = innerWidth; h = innerHeight;
    cv.width = w * dpr; cv.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  // little bugs crawl along the empty grid. They never walk over content: at each grid crossing they look
  // ahead and turn (or go back) when the next crossing is covered by text, a card, an image... Now and then
  // a rare golden "critical bug" shows up.
  let bugs = [], nextCrit = performance.now() + 25000 + Math.random() * 20000, bugId = 0;
  const BLOCK = 'a, button, input, textarea, select, label, video, img, svg, iframe, figure, table, form, .node, .card, p, h1, h2, h3, h4, h5, li, dl, dt, dd, span, small, strong, em, b, blockquote, figcaption, .btn, .nav, .lightbox, .stitle, .chip, .rail, .kills, .loot, .wipe';
  const navH = () => { const n = document.querySelector('.nav'); return n ? n.getBoundingClientRect().bottom : 0; };
  const blocked = (x, y) => { // viewport coordinates
    if (x < 6 || x > w - 6 || y < navH() + 6 || y > h - 6) return true;
    for (const [ox, oy] of [[0, 0], [12, 0], [-12, 0], [0, 12], [0, -12]]) {
      const el = document.elementFromPoint(x + ox, y + oy);
      if (!el) return true;
      if (el.closest(BLOCK)) return true;
      for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) return true;
    }
    return false;
  };
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const spawnBug = () => {
    const sy = scrollY, nh = navH();
    for (let k = 0; k < 14; k++) {
      const x = Math.round((20 + Math.random() * (w - 40)) / G) * G, yv = Math.round((nh + 20 + Math.random() * (h - nh - 40) + sy) / G) * G - sy;
      if (blocked(x, yv)) continue;
      const free = DIRS.filter(([dx, dy]) => !blocked(x + dx * G, yv + dy * G));
      if (!free.length) continue;
      const [dx, dy] = free[(Math.random() * free.length) | 0];
      const crit = performance.now() > nextCrit;
      if (crit) nextCrit = performance.now() + 45000 + Math.random() * 30000;
      bugs.push({ x, y: yv + sy, dx, dy, tx: x + dx * G, ty: yv + sy + dy * G, ang: Math.atan2(dy, dx), speed: (34 + Math.random() * 30) * (calm ? 0.5 : 1) * (crit ? 0.8 : 1),
        c: crit ? '#ffd166' : COLORS[(Math.random() * COLORS.length) | 0], crit, phase: Math.random() * 6.283, age: 0, life: 12 + Math.random() * 12 });
      return;
    }
  };
  const nextStep = (b) => { // at a crossing: keep going most of the time, else turn; never into content
    const sy = scrollY, opts = DIRS.filter(([dx, dy]) => !(dx === -b.dx && dy === -b.dy));
    opts.sort(() => Math.random() - 0.5);
    if (Math.random() < 0.65) opts.sort((u, v) => (v[0] === b.dx && v[1] === b.dy) - (u[0] === b.dx && u[1] === b.dy));
    opts.push([-b.dx, -b.dy]);
    const ok = opts.find(([dx, dy]) => !blocked(b.x + dx * G, b.y - sy + dy * G));
    if (!ok) { b.life = Math.min(b.life, b.age + 0.3); return; } // boxed in: fade away
    b.dx = ok[0]; b.dy = ok[1]; b.tx = b.x + b.dx * G; b.ty = b.y + b.dy * G;
  };
  // a tiny beetle: body, head, antennae, three pairs of legs that scuttle
  const drawBug = (x, y, ang, c, t, crit) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    if (crit) { ctx.shadowColor = c; ctx.shadowBlur = 10; }
    ctx.strokeStyle = c + 'cc'; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = -1; i <= 1; i++) {
      const wig = Math.sin(t * 22 + i * 2) * 0.9;
      ctx.moveTo(i * 2.2, 0); ctx.lineTo(i * 2.2 + wig, -4.6);
      ctx.moveTo(i * 2.2, 0); ctx.lineTo(i * 2.2 - wig, 4.6);
    }
    ctx.moveTo(5, -0.8); ctx.lineTo(7.6, -2.8); ctx.moveTo(5, 0.8); ctx.lineTo(7.6, 2.8);
    ctx.stroke();
    ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(-0.4, 0, 4, 2.7, 0, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.arc(4.4, 0, 1.7, 0, 6.283); ctx.fill();
    ctx.restore();
  };

  // fixed-bugs counter: a toast top right under the menu, only while bugs are being fixed; score kept for the visit
  const FRL = document.documentElement.lang === 'fr';
  let kills = 0, killBox = null, killNum = null;
  try { kills = parseInt(sessionStorage.getItem('pulseKills'), 10) || 0; } catch (err) { /* private mode */ }
  const placeKills = () => { const nav = document.querySelector('.nav'); if (killBox) killBox.style.top = `${(nav ? nav.getBoundingClientRect().height : 64) + 12}px`; };
  const makeKills = () => {
    killBox = document.createElement('div');
    killBox.className = 'kills'; killBox.setAttribute('aria-hidden', 'true');
    killBox.innerHTML = `<span class="kills__pin"></span><span class="kills__lbl">${FRL ? 'Bugs corrigés' : 'Bugs fixed'}</span><span class="kills__num"><span>${kills}</span></span>`;
    document.body.appendChild(killBox);
    killNum = killBox.querySelector('.kills__num');
    placeKills(); addEventListener('resize', placeKills);
  };
  let killHide = 0;
  const MILESTONES = [[10, 'Debugger', 'Débuggeur'], [25, 'Bug hunter', 'Chasseur de bugs'], [50, 'QA legend', 'Légende du QA'], [100, 'Ship it!', 'On peut livrer !']];
  const addKill = (c, n = 1) => {
    // a toast: it pops in on a fix (showing the old score, then rolling to the new one) and leaves after a short while
    if (!killBox) makeKills();
    killBox.classList.add('is-on');
    const before = kills;
    kills += n;
    // milestones: the toast shows a short title for a moment, in gold, with a small chime
    const ms = MILESTONES.filter(([v]) => before < v && kills >= v).pop();
    clearTimeout(killHide); killHide = setTimeout(() => killBox.classList.remove('is-on', 'is-bump', 'is-milestone'), ms ? 3600 : 2600);
    const lbl = killBox.querySelector('.kills__lbl');
    if (ms) {
      lbl.textContent = FRL ? ms[2] : ms[1];
      killBox.classList.add('is-milestone');
      chime();
      clearTimeout(lbl._t); lbl._t = setTimeout(() => { lbl.textContent = FRL ? 'Bugs corrigés' : 'Bugs fixed'; killBox.classList.remove('is-milestone'); }, 3400);
    }
    try { sessionStorage.setItem('pulseKills', kills); } catch (err) { /* private mode */ }
    killBox.style.setProperty('--k', c);
    // odometer: the old number rolls up and out, the new one rolls in from below
    const old = killNum.lastElementChild, nu = document.createElement('span');
    nu.textContent = kills; nu.className = 'is-in';
    killNum.appendChild(nu);
    if (old) { old.className = 'is-out'; setTimeout(() => old.remove(), 400); }
    killBox.classList.remove('is-bump'); void killBox.offsetWidth; killBox.classList.add('is-bump');
    const plus = document.createElement('span');
    plus.className = 'kills__plus'; plus.textContent = `+${n}`;
    killBox.appendChild(plus); setTimeout(() => plus.remove(), 800);
  };

  const frame = (now) => {
    const dt = Math.min(0.05, (now - prev) / 1000 || 0); prev = now;
    ctx.clearRect(0, 0, w, h);
    const sy = scrollY;

    // grid waves: every few seconds a soft wave travels across the grid lines,
    // each time with another pattern (sweep, ripple, diamond, glitch scan). Low contrast, behind everything.
    if (WAVES) {
      if (!wave && now > nextWave) {
        const kind = WAVE_KINDS[waveIdx++ % WAVE_KINDS.length];
        const ox = Math.random() * w, oy = Math.random() * h, a = ((Math.random() * 8) | 0) * 0.785;
        const reach = kind === 'sweep' || kind === 'scan' ? Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a)) : Math.hypot(w, h) * (kind === 'diamond' ? 1.4 : 1);
        wave = { kind, ox, oy, ca: Math.cos(a), sa: Math.sin(a), t: 0, speed: (kind === 'scan' ? 520 : 380) * (calm ? 0.5 : 1), reach: reach + 200, c: hex2rgb(COLORS[(Math.random() * COLORS.length) | 0]) };
        if (kind === 'sweep' || kind === 'scan') { // start from the side the wave comes from
          const cx = w / 2, cy = h / 2;
          wave.ox = cx - wave.ca * (reach / 2 + 100); wave.oy = cy - wave.sa * (reach / 2 + 100);
        }
      }
      if (wave) {
        wave.t += dt;
        const front = wave.t * wave.speed, BAND = wave.kind === 'scan' ? 50 : 110;
        if (front > wave.reach + BAND) { wave = null; nextWave = now + (calm ? 14000 : 7000) + Math.random() * 6000; }
        else {
          const buckets = [[], [], [], []];
          const off = -(sy % G);
          for (let x = 0; x <= w + G; x += G) for (let y = off; y <= h + G; y += G) {
            // the wave lives in screen space, so scrolling never pushes it out of view
            const yp = y + sy, dx = x - wave.ox, dy = y - wave.oy;
            let d;
            if (wave.kind === 'ring') d = Math.hypot(dx, dy);
            else if (wave.kind === 'diamond') d = Math.abs(dx) + Math.abs(dy);
            else d = dx * wave.ca + dy * wave.sa;
            if (wave.kind === 'scan') d += (((x * 7 + yp * 13) / G) % 5) * 22; // ragged, like a glitch
            const k = 1 - Math.abs(d - front) / BAND;
            if (k <= 0) continue;
            buckets[Math.min(3, (k * k * 4) | 0)].push(x + 0.5, y + 0.5);
          }
          buckets.forEach((pts, i) => {
            if (!pts.length) return;
            ctx.strokeStyle = `rgba(${wave.c},${0.07 + i * 0.07})`; ctx.lineWidth = 1; ctx.beginPath();
            for (let j = 0; j < pts.length; j += 2) {
              const x = pts[j], y = pts[j + 1];
              ctx.moveTo(x - G / 2, y); ctx.lineTo(x + G / 2, y); ctx.moveTo(x, y - G / 2); ctx.lineTo(x, y + G / 2);
            }
            ctx.stroke();
            if (i >= 2) { ctx.fillStyle = `rgba(${wave.c},${0.2 + (i - 2) * 0.15})`; for (let j = 0; j < pts.length; j += 2) ctx.fillRect(pts[j] - 1, pts[j + 1] - 1, 2, 2); }
          });
        }
      }
    }

    // grid glow under the cursor
    if (fine && mx > -1e3) {
      gx += (mx - gx) * 0.12; gy += (my - gy) * 0.12;
      const R = 200;
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, R);
      g.addColorStop(0, 'rgba(77,163,255,.22)'); g.addColorStop(1, 'rgba(77,163,255,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 1; ctx.beginPath();
      for (let x = Math.floor((gx - R) / G) * G; x <= gx + R; x += G) { ctx.moveTo(x + 0.5, gy - R); ctx.lineTo(x + 0.5, gy + R); }
      const off = -(sy % G);
      for (let y = Math.floor((gy - R - off) / G) * G + off; y <= gy + R; y += G) { ctx.moveTo(gx - R, y + 0.5); ctx.lineTo(gx + R, y + 0.5); }
      ctx.stroke();
    }

    // click bursts: a shape (circle, square, diamond, hexagon, triangle, star) and a glowing node
    rings = rings.filter((r) => {
      r.t += dt / 0.9;
      if (r.t >= 1) return false;
      const e = 1 - Math.pow(1 - r.t, 3), y = r.y - sy;
      ctx.lineWidth = 2 * (1 - r.t) + 0.5;
      ctx.strokeStyle = `rgba(${r.rgb},${0.6 * (1 - r.t)})`;
      shape(r.kind, r.x, y, 6 + e * r.size, r.rot + r.spin * e); ctx.stroke();
      ctx.fillStyle = `rgba(${r.rgb},${0.9 * (1 - r.t)})`;
      ctx.beginPath(); ctx.arc(r.x, y, 4 * (1 - r.t) + 1.5 + (r.t < 0.15 ? 3 * (1 - r.t / 0.15) : 0), 0, 6.283); ctx.fill();
      return true;
    });

    // destroyed pulses: shards fly out and fade, with a quick flash
    debris = debris.filter((d) => {
      d.t += dt / d.ttl;
      if (d.t >= 1) return false;
      d.vx *= 0.92; d.vy *= 0.92; d.x += d.vx * dt; d.y += d.vy * dt;
      const y = d.y - sy, a = 1 - d.t;
      if (d.bp) { // quick red breakpoint ring snapping shut on the bug
        ctx.strokeStyle = `rgba(${d.rgb},${a})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(d.x, y, 7 + 10 * (1 - Math.pow(1 - d.t, 2)), 0, 6.283); ctx.stroke();
      } else if (d.label) { // "BUG_042 · FIXED" debug bubble that rises and fades
        const e = 1 - Math.pow(1 - d.t, 3), ly = y - 16 - 12 * e, al = d.t < 0.7 ? 1 : (1 - d.t) / 0.3;
        ctx.font = '600 10px "JetBrains Mono", ui-monospace, monospace';
        const tw = ctx.measureText(d.label).width;
        ctx.fillStyle = `rgba(5,5,5,${0.75 * al})`; ctx.fillRect(d.x - tw / 2 - 6, ly - 9, tw + 12, 15);
        ctx.strokeStyle = `rgba(${d.rgb},${0.6 * al})`; ctx.lineWidth = 1; ctx.strokeRect(d.x - tw / 2 - 5.5, ly - 8.5, tw + 11, 14);
        ctx.fillStyle = `rgba(${d.rgb},${al})`; ctx.textAlign = 'center'; ctx.fillText(d.label, d.x, ly + 2); ctx.textAlign = 'start';
      } else if (d.flash) {
        ctx.fillStyle = `rgba(${d.rgb},${0.35 * a})`;
        ctx.beginPath(); ctx.arc(d.x, y, 4 + 18 * (1 - a * a), 0, 6.283); ctx.fill();
      } else {
        ctx.strokeStyle = `rgba(${d.rgb},${a})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(d.x, y); ctx.lineTo(d.x - d.vx * 0.03, y - d.vy * 0.03); ctx.stroke();
      }
      return true;
    });

    // the click burst is a weapon: its shape and its four pulses fix every bug they reach, right away
    if (rings.length) {
      const hits = bugs.filter((b) => b.age > 0.2 && (
        rings.some((r) => r.t < 0.8 && Math.hypot(b.x - r.x, b.y - r.y) < 6 + (1 - Math.pow(1 - r.t, 3)) * r.size + 8) ||
        pulses.some((q) => q.burst && q.life > 0.2 && Math.hypot(b.x - (q.horiz ? q.pos : q.line), b.y - (q.horiz ? q.line : q.pos)) < 14)));
      hits.forEach((b, i) => {
        bugs.splice(bugs.indexOf(b), 1);
        const rgb = hex2rgb(b.c), fixed = FRL ? 'CORRIGÉ' : 'FIXED';
        debris.push({ bp: true, x: b.x, y: b.y, vx: 0, vy: 0, t: 0, ttl: 0.4, rgb: '255,77,77' }); // red breakpoint ring
        debris.push({ flash: true, x: b.x, y: b.y, vx: 0, vy: 0, t: 0, ttl: 0.35, rgb });
        for (let k = 0; k < 10; k++) {
          const a = (6.283 * k) / 10 + Math.random() * 0.5, v = 160 + Math.random() * 160;
          debris.push({ x: b.x, y: b.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, ttl: 0.45 + Math.random() * 0.25, rgb });
        }
        debris.push({ label: b.crit ? `CRITICAL BUG · ${fixed}` : `BUG_${String(++bugId).padStart(3, '0')} · ${fixed}`, x: b.x, y: b.y, vx: 0, vy: 0, t: 0, ttl: 1.1, rgb: b.crit ? '255,209,102' : '61,220,151' });
        addKill(b.c, b.crit ? 3 : 1);
        setTimeout(() => pop(b.x / w), i * 70);
      });
    }

    // bugs: walk toward the next crossing, decide there; fade in, fade out at the end of their life
    if (now > nextSpawn && bugs.length < (w < 700 || calm ? 3 : 5)) { spawnBug(); nextSpawn = now + 1200 + Math.random() * 1800; }
    const nb = navH();
    bugs = bugs.filter((b) => {
      b.age += dt;
      if (b.age > b.life + 0.4) return false;
      // the bug notices the mouse: it slows down, gets nervous (legs faster, a little shiver) and glows softly
      const near = fine && Math.hypot(b.x - mx, b.y - sy - my) < 80;
      b.alert = (b.alert || 0) + ((near ? 1 : 0) - (b.alert || 0)) * Math.min(1, dt * 8);
      b.legT = (b.legT || b.phase) + dt * (1 + 2.2 * b.alert);
      const ddx = b.tx - b.x, ddy = b.ty - b.y, d = Math.hypot(ddx, ddy), step = b.speed * (1 - 0.7 * b.alert) * dt;
      if (d <= step) { b.x = b.tx; b.y = b.ty; if (b.age < b.life) nextStep(b); }
      else { b.x += (ddx / d) * step; b.y += (ddy / d) * step; }
      const target = Math.atan2(b.dy, b.dx); let da = target - b.ang;
      while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283;
      b.ang += da * Math.min(1, dt * 14);
      const yv = b.y - sy;
      if (yv < nb + 4 || yv > h + 60) return false; // scrolled under the sticky menu or far below: gone
      ctx.globalAlpha = Math.min(1, b.age / 0.3, Math.max(0, (b.life + 0.4 - b.age) / 0.4));
      const jit = calm ? 0 : Math.sin(now / 16) * 0.7 * b.alert;
      if (b.alert > 0.05) {
        const gl = ctx.createRadialGradient(b.x, yv, 0, b.x, yv, 16);
        gl.addColorStop(0, `rgba(${hex2rgb(b.c)},${0.35 * b.alert})`); gl.addColorStop(1, `rgba(${hex2rgb(b.c)},0)`);
        ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(b.x, yv, 16, 0, 6.283); ctx.fill();
      }
      drawBug(b.x + jit * -Math.sin(b.ang), yv + jit * Math.cos(b.ang), b.ang, b.c, calm ? b.phase : b.legT, b.crit);
      ctx.globalAlpha = 1;
      return true;
    });

    // click pulses
    ctx.lineWidth = 1.5;
    pulses = pulses.filter((p) => {
      p.pos += p.dir * p.speed * dt;
      const head = p.pos;
      let tail = p.pos - p.dir * p.len;
      if (p.burst) { // clicked pulses start at the clicked node and fade out
        if ((tail - p.start) * p.dir < 0) tail = p.start;
        p.life -= dt / p.ttl;
        if (p.life <= 0) return false;
      }
      let x1, y1, x2, y2;
      if (p.horiz) { const y = p.line - sy + 0.5; if (y < -10 || y > h + 10) return false; x1 = tail; x2 = head; y1 = y2 = y; }
      else { const x = p.line + 0.5; x1 = x2 = x; y1 = tail - sy; y2 = head - sy; }
      const g = ctx.createLinearGradient(x1, y1, x2, y2);
      const a = p.burst ? Math.round(255 * Math.min(1, p.life * 1.4)).toString(16).padStart(2, '0') : '70';
      g.addColorStop(0, p.c + '00'); g.addColorStop(1, p.c + (p.burst ? a : '45'));
      ctx.lineWidth = p.burst ? 2 : 1.5;
      ctx.strokeStyle = g; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.fillStyle = p.c + a; ctx.beginPath(); ctx.arc(x2, y2, 2.6, 0, 6.283); ctx.fill();
      const range = p.horiz ? w : sy + h;
      return p.dir > 0 ? tail < range + 10 : tail > (p.horiz ? -10 : sy - 10);
    });
    // near a bug, on the empty grid: the cursor turns into a small crosshair
    const aim = fine && overFree && bugs.some((b) => b.alert > 0.5);
    if (aim !== aiming) { aiming = aim; document.documentElement.classList.toggle('is-aiming', aim); }
    if (!document.hidden) requestAnimationFrame(frame);
  };

  size();
  addEventListener('resize', size);
  if (fine) {
    addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; overFree = !(e.target.closest && e.target.closest(SKIP)); if (gx < -1e3) { gx = mx; gy = my; } }, { passive: true });
    document.addEventListener('pointerleave', () => { mx = my = gx = gy = -1e4; });
  }
  // click on the empty grid: the nearest crossing fires pulses along its four lines
  const SKIP = 'a, button, input, textarea, select, label, video, img, .node, .card, p, h1, h2, h3, li, dl, .btn, .nav, .lightbox';
  const hex2rgb = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)).join(',');
  // a very soft synthesized "blip" on grid clicks: notes from a pentatonic scale, slight detune,
  // panned toward the click side, so it never sounds twice the same (Web Audio, no file to load)
  let actx = null;
  const NOTES = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
  const blip = (xRatio) => {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      const t = actx.currentTime, f = NOTES[(Math.random() * NOTES.length) | 0] * (Math.random() < 0.25 ? 0.5 : 1);
      const out = actx.createGain(), lp = actx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 2400;
      out.gain.setValueAtTime(0, t);
      out.gain.linearRampToValueAtTime(0.045, t + 0.008);
      out.gain.exponentialRampToValueAtTime(0.0001, t + 0.38 + Math.random() * 0.12);
      let node = out;
      if (actx.createStereoPanner) { const pan = actx.createStereoPanner(); pan.pan.value = (xRatio - 0.5) * 0.8; out.connect(pan); node = pan; }
      lp.connect(out); node.connect(actx.destination);
      [[f, 'triangle', 1], [f * 2, 'sine', 0.35]].forEach(([fr, type, g]) => {
        const o = actx.createOscillator(), og = actx.createGain();
        o.type = type; o.frequency.setValueAtTime(fr * 1.015, t); o.frequency.exponentialRampToValueAtTime(fr, t + 0.06);
        o.detune.value = (Math.random() - 0.5) * 24; og.gain.value = g;
        o.connect(og); og.connect(lp); o.start(t); o.stop(t + 0.55);
      });
    } catch (err) { /* no audio: silent */ }
  };
  // milestone reached: a soft rising arpeggio
  const chime = () => {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      const t0 = actx.currentTime + 0.12;
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        const t = t0 + i * 0.08, o = actx.createOscillator(), g = actx.createGain();
        o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.04, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
        o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + 0.55);
      });
    } catch (err) { /* no audio: silent */ }
  };
  // destroying a pulse: a short, soft "pop" that drops in pitch (also varied each time)
  const pop = (xRatio) => {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      const t = actx.currentTime, f = 700 + Math.random() * 300;
      const o = actx.createOscillator(), g = actx.createGain(), lp = actx.createBiquadFilter();
      o.type = 'triangle'; lp.type = 'lowpass'; lp.frequency.value = 2200;
      o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.3, t + 0.14);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.connect(lp); lp.connect(g);
      let node = g;
      if (actx.createStereoPanner) { const pan = actx.createStereoPanner(); pan.pan.value = (xRatio - 0.5) * 0.8; g.connect(pan); node = pan; }
      node.connect(actx.destination);
      o.start(t); o.stop(t + 0.25);
    } catch (err) { /* no audio: silent */ }
  };
  addEventListener('click', (e) => {
    if (e.button !== 0 || getSelection().toString() || (e.target.closest && e.target.closest(SKIP))) return;
    if (document.documentElement.classList.contains('da')) return; // project art direction (WIP): its own click, main.js §22
    const x = Math.round(e.clientX / G) * G, yPage = Math.round((e.clientY + scrollY) / G) * G;
    const c = COLORS[(Math.random() * COLORS.length) | 0];
    const kind = SHAPES[(Math.random() * SHAPES.length) | 0];
    blip(e.clientX / w);
    rings.push({ x: x + 0.5, y: yPage + 0.5, t: 0, rgb: hex2rgb(c), kind, size: 80 + Math.random() * 30, rot: 0, spin: calm || kind === 'circle' || kind === 'square' ? 0 : (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.8) });
    for (const [horiz, dir] of [[1, 1], [1, -1], [0, 1], [0, -1]]) {
      const start = horiz ? x : yPage;
      pulses.push({ burst: true, horiz: !!horiz, line: horiz ? yPage : x, pos: start, start, dir, len: 70, speed: 380 + Math.random() * 120, c, life: 1, ttl: 0.9 + Math.random() * 0.3 });
    }
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { prev = performance.now(); requestAnimationFrame(frame); } });
  requestAnimationFrame(frame);
})();

/* 10. Juice: key numbers count up when they appear, then pop */
(() => {
  const nums = [...document.querySelectorAll('.proof dt span')].filter((s) => /^\d+\+?$/.test(s.textContent.trim()));
  if (!nums.length || !('IntersectionObserver' in window)) return;
  const run = (s) => {
    const txt = s.textContent.trim(), n = parseInt(txt, 10), plus = txt.endsWith('+') ? '+' : '';
    const t0 = performance.now(), dur = 900 + n * 6;
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - t, 4);
      s.textContent = Math.round(n * e) + (t === 1 ? plus : '');
      if (t < 1) requestAnimationFrame(tick); else s.classList.add('is-counted');
    };
    s.textContent = '0';
    requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    e.target.querySelectorAll('dt span').forEach((s, i) => { if (nums.includes(s)) setTimeout(() => run(s), i * 120); });
  }), { threshold: 0.4 });
  document.querySelectorAll('.proof').forEach((p) => io.observe(p));
})();

/* 11. Juice: a soft light follows the cursor inside cards and nodes */
(() => {
  if (!matchMedia('(pointer: fine)').matches) return;
  const SEL = 'a.card, a.next-proj, .hero__node, .node.direct, .tuto-card';
  document.addEventListener('pointermove', (e) => {
    const el = e.target.closest && e.target.closest(SEL);
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, { passive: true });
})();

/* 12. Juice: project cards tilt toward the cursor, a glare slides across, a squash on click */
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const fine = matchMedia('(pointer: fine)').matches, MAX = 4; // degrees: subtle, it stays a portfolio
  if (fine) {
    document.addEventListener('pointermove', (e) => {
      const el = e.target.closest && e.target.closest('a.card');
      if (!el) return;
      const r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      el.classList.add('is-tilt');
      el.style.setProperty('--ry', `${((px - 0.5) * 2 * MAX).toFixed(2)}deg`);
      el.style.setProperty('--rx', `${((0.5 - py) * 2 * MAX).toFixed(2)}deg`);
      el.style.setProperty('--gp', `${(px * 100).toFixed(1)}%`);
    }, { passive: true });
    document.addEventListener('pointerout', (e) => {
      const el = e.target.closest && e.target.closest('a.card');
      if (!el || el.contains(e.relatedTarget)) return;
      el.classList.remove('is-tilt');
      el.style.removeProperty('--rx'); el.style.removeProperty('--ry');
    });
  }
  // click: the card squashes, then the page opens
  document.addEventListener('click', (e) => {
    const el = e.target.closest && e.target.closest('a.card[href]');
    if (!el || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || el.target === '_blank') return;
    e.preventDefault();
    el.classList.remove('is-squash'); void el.offsetWidth; el.classList.add('is-squash');
    setTimeout(() => (window.juiceGo || ((h) => { location.href = h; }))(el.href), 140);
  });
  addEventListener('pageshow', () => document.querySelectorAll('a.card.is-squash').forEach((c) => c.classList.remove('is-squash')));
})();

/* 13. Juice: page transitions. The page dims softly while a thin Blueprint wire draws along the top,
   then the next page fades in with a slight rise. Internal links only; soft mode (fade, no rise) on reduced motion. */
(() => {
  const root = document.documentElement;
  const wipe = document.createElement('div');
  wipe.className = 'wipe'; wipe.setAttribute('aria-hidden', 'true');
  wipe.innerHTML = '<span class="wipe__wire"></span>';
  document.body.appendChild(wipe);

  // arrival: the head script covered the page; uncover it with the wire still moving
  if (root.classList.contains('is-arriving')) {
    wipe.classList.add('is-covered');
    root.classList.remove('is-arriving');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      wipe.classList.remove('is-covered'); wipe.classList.add('is-in');
      const main = document.querySelector('main');
      if (main) main.classList.add('is-entering');
      setTimeout(() => { wipe.classList.remove('is-in'); if (main) main.classList.remove('is-entering'); }, 600);
    }));
  }
  addEventListener('pageshow', (e) => { if (e.persisted) { wipe.className = 'wipe'; root.classList.remove('fx-leaving'); } });

  // The browser itself animates between pages (cross-document View Transitions, see the head script and
  // css "Page transitions v2"). We navigate at once, so the next page loads while the current one slides away:
  // no frozen page. A wire runs along the top while the next page loads.
  const vt = root.classList.contains('fx-vt');
  const go = (href) => {
    if (vt) {
      wipe.className = 'wipe is-load'; root.classList.add('fx-leaving');
      location.href = href;
      return;
    }
    try { sessionStorage.setItem('wipe', '1'); } catch (err) { /* private mode: no arrival sweep */ }
    wipe.className = 'wipe is-out';
    setTimeout(() => { location.href = href; }, 400);
  };
  window.juiceGo = go;

  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target === '_blank' || a.hasAttribute('download') || a.origin !== location.origin) return;
    if (/\.(pdf|mp4|jpg|png|zip)$/i.test(a.pathname)) return;
    if (a.pathname === location.pathname && a.search === location.search) return; // same page / anchor
    if (vt) { wipe.className = 'wipe is-load'; root.classList.add('fx-leaving'); return; } // native navigation
    e.preventDefault();
    go(a.href);
  });
})();

/* 14. Juice: downloading the CV feels like picking up loot. A burst of particles, then a small toast under the button */
(() => {
  if (!Element.prototype.animate) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FR = document.documentElement.lang === 'fr';
  const COLS = ['--c-gameplay', '--c-xp', '--c-tools', '--c-edu', '--c-projects', '--c-profile'];
  let toast, hideT;
  const showToast = (r) => {
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'loot'; toast.setAttribute('role', 'status');
      toast.innerHTML = `<span class="loot__pin"></span><span class="loot__txt">${FR ? 'CV acquis' : 'CV acquired'} <b>✓</b></span>`;
      document.body.appendChild(toast);
    }
    // right under the button that was clicked, where the eyes already are
    toast.classList.remove('is-on');
    const half = toast.offsetWidth / 2 + 8;
    toast.style.left = `${Math.min(innerWidth - half, Math.max(half, r.left + r.width / 2))}px`;
    toast.style.top = `${r.bottom + 10}px`;
    void toast.offsetWidth; toast.classList.add('is-on');
    clearTimeout(hideT); hideT = setTimeout(() => toast.classList.remove('is-on'), 2400);
  };
  const burst = (x, y) => {
    const cs = getComputedStyle(document.documentElement);
    for (let i = 0; i < 18; i++) {
      const p = document.createElement('span');
      p.className = 'loot-bit' + (i % 3 === 0 ? ' loot-bit--sq' : '');
      p.style.left = `${x}px`; p.style.top = `${y}px`;
      p.style.background = cs.getPropertyValue(COLS[i % COLS.length]).trim();
      document.body.appendChild(p);
      const a = (Math.PI * 2 * i) / 18 + Math.random() * 0.4, d = 40 + Math.random() * 50;
      const dx = Math.cos(a) * d, dy = Math.sin(a) * d - 20;
      p.animate([
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1) rotate(${Math.random() * 180}deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(calc(-50% + ${dx * 1.1}px), calc(-50% + ${dy + 40}px)) scale(.3)`, opacity: 0 },
      ], { duration: 750 + Math.random() * 250, easing: 'cubic-bezier(.2, .8, .3, 1)' }).onfinish = () => p.remove();
    }
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[download][href$=".pdf"]');
    if (!a || e.button !== 0) return;
    const r = a.getBoundingClientRect();
    if (!reduce) {
      burst(r.left + r.width / 2, r.top + r.height / 2);
      a.classList.remove('is-looted'); void a.offsetWidth; a.classList.add('is-looted');
    }
    showToast(r);
  });
})();

/* 15. Case-study hero: a gameplay loop as a darkened background (WIP, data-wip hidden).
       Nothing is downloaded while the box is hidden; soft mode keeps the still frame only. */
(() => {
  document.querySelectorAll('.hero-media').forEach((box) => {
    const v = box.querySelector('video[data-src]');
    if (!v || box.hidden || box.offsetParent === null) return;
    // juice: the screen powers on once the page is visible (after the arrival fade), not while it is covered
    let loaded = document.readyState === 'complete', want = false;
    const on = () => setTimeout(() => box.classList.add('is-ready'), 300);
    if (!loaded) addEventListener('load', () => { loaded = true; if (want) on(); }, { once: true });
    const ready = () => { if (want) return; want = true; if (loaded) on(); };
    if (v.dataset.poster) { v.poster = v.dataset.poster; ready(); }
    // juice: the loop dims as the hero scrolls away (reading comes first)
    const dim = () => { const r = box.getBoundingClientRect(); box.style.setProperty('--dim', Math.min(1, Math.max(0, -r.top / Math.max(1, r.height * .8))).toFixed(3)); };
    addEventListener('scroll', () => requestAnimationFrame(dim), { passive: true }); dim();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    v.addEventListener('playing', ready, { once: true });
    v.src = v.dataset.src;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); }).observe(box);
    } else v.play().catch(() => {});
  });
})();

/* 16. Immersion (WIP, only with ?wip): Abyss page = a dive. The deeper you scroll, the darker and bluer the water,
       light ripples fade at the surface, marine snow drifts, and a depth gauge counts down. Never over the text. */
(() => {
  const root = document.documentElement;
  if (!root.classList.contains('is-wip') || root.dataset.theme !== 'abyss') return;
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dive = document.createElement('div');
  dive.className = 'dive'; dive.setAttribute('aria-hidden', 'true');
  dive.innerHTML = '<i class="dive__light"></i><i class="dive__dark"></i><i class="dive__threat"></i><canvas class="dive__snow"></canvas>';
  document.body.prepend(dive);
  const gauge = document.createElement('div');
  gauge.className = 'depth'; gauge.setAttribute('aria-hidden', 'true');
  gauge.innerHTML = '<span class="depth__lbl">Depth</span><b class="depth__val">0 m</b><span class="depth__bar"><i></i></span>';
  document.body.append(gauge);
  const val = gauge.querySelector('.depth__val'), MAX = 120;
  let t = 0;
  const depth = () => {
    const max = Math.max(1, root.scrollHeight - innerHeight);
    t = Math.min(1, Math.max(0, scrollY / max));
    root.style.setProperty('--depth', t.toFixed(3));
    const d = Math.round(t * MAX); val.textContent = d ? `−${d} m` : `0 m`;
    // the bottom of the page feels tense: a red pulse at the edges, the gauge turns to a warning, something big passes by
    const k = Math.min(1, Math.max(0, (t - .62) / .33)), tension = k * k * (3 - 2 * k);
    root.style.setProperty('--tension', tension.toFixed(3));
    gauge.classList.toggle('is-danger', tension > .5);
  };
  addEventListener('scroll', () => requestAnimationFrame(depth), { passive: true }); depth();
  // the bottom of the page is watched: §24 draws what lives there

  // marine snow: tiny pale specks drifting down, slower and dimmer as you go deeper
  const cv = dive.querySelector('canvas'), ctx = cv.getContext('2d');
  if (!ctx) return;
  let w = 0, h = 0, flakes = [];
  const size = () => {
    const dpr = Math.min(2, devicePixelRatio || 1);
    w = innerWidth; h = innerHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(w * h / (calm ? 26000 : 14000));
    flakes = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, r: .5 + Math.random() * 1.6, s: 4 + Math.random() * 14, p: Math.random() * 6.28, a: .15 + Math.random() * .35 }));
  };
  size(); addEventListener('resize', size);
  let prev = performance.now(), lastY = scrollY;
  const draw = (now) => {
    const dt = Math.min(.05, (now - prev) / 1000); prev = now;
    const dy = scrollY - lastY; lastY = scrollY;
    ctx.clearRect(0, 0, w, h);
    for (const f of flakes) {
      if (!calm) { f.y += f.s * dt - dy * f.r * .08; f.p += dt * .8; f.x += Math.sin(f.p) * dt * 4; }
      if (f.y > h + 4) { f.y = -4; f.x = Math.random() * w; } else if (f.y < -4) { f.y = h + 4; f.x = Math.random() * w; }
      ctx.globalAlpha = f.a * (1 - t * .5);
      ctx.fillStyle = t > .6 ? '#ffc2ee' : '#cfe8ff';
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.283); ctx.fill();
    }
    if (!document.hidden) requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { prev = performance.now(); requestAnimationFrame(draw); } });
})();

/* 18. Immersion (WIP, only with ?wip): each project page has its own air, behind the content only.
       Kläppen: fireflies that wander and blink. Flying AI: soft clouds drifting by. WolfPeak: light snow. */
(() => {
  const root = document.documentElement;
  const theme = root.dataset.theme;
  if (!root.classList.contains('is-wip') || !['klappen', 'flying', 'wolfpeak'].includes(theme)) return;
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cv = document.createElement('canvas');
  cv.className = 'air'; cv.setAttribute('aria-hidden', 'true');
  document.body.prepend(cv);
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  let w = 0, h = 0, items = [];
  const R = Math.random;
  const make = () => {
    if (theme === 'klappen') return R() < .6
      ? { leaf: true, x: R() * w, y: R() * h, s: 14 + R() * 22, p: R() * 6.28, sw: .6 + R() * .9, rot: R() * 6.28, vr: (R() - .5) * 2.4, r: 5 + R() * 6, c: ['#e8893a', '#d9622b', '#f2b24a', '#b8461f', '#e9a03c'][(R() * 5) | 0], a: .35 + R() * .35 }
      : { x: R() * w, y: R() * h, vx: 0, vy: 0, p: R() * 6.28, sp: .6 + R() * 1.2, r: 1.2 + R() * 1.6 };
    if (theme === 'flying') return { x: R() * w, y: R() * h, s: 6 + R() * 14, r: 120 + R() * 220, a: .045 + R() * .05, k: .45 + R() * .3 };
    return { x: R() * w, y: R() * h, s: 12 + R() * 30, r: .6 + R() * 1.8, p: R() * 6.28, a: .2 + R() * .45 };
  };
  const size = () => {
    const dpr = Math.min(2, devicePixelRatio || 1);
    w = innerWidth; h = innerHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const per = theme === 'flying' ? 160000 : theme === 'klappen' ? 26000 : 16000;
    items = Array.from({ length: Math.max(4, Math.round(w * h / per)) }, make);
  };
  size(); addEventListener('resize', size);
  let prev = performance.now();
  const draw = (now) => {
    const dt = calm ? 0 : Math.min(.05, (now - prev) / 1000); prev = now;
    ctx.clearRect(0, 0, w, h);
    for (const o of items) {
      if (theme === 'klappen' && o.leaf) {
        o.y += o.s * dt; o.p += dt * o.sw; o.x += Math.sin(o.p) * dt * 26; o.rot += o.vr * dt;
        if (o.y > h + 12) { o.y = -12; o.x = R() * w; }
        ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot); ctx.scale(1, .45 + .55 * Math.abs(Math.cos(o.p * 1.3)));
        ctx.globalAlpha = o.a; ctx.fillStyle = o.c;
        ctx.beginPath(); ctx.moveTo(-o.r, 0); ctx.quadraticCurveTo(0, -o.r * .7, o.r, 0); ctx.quadraticCurveTo(0, o.r * .7, -o.r, 0); ctx.fill();
        ctx.globalAlpha = o.a * .6; ctx.strokeStyle = '#5a2a12'; ctx.lineWidth = .6; ctx.beginPath(); ctx.moveTo(-o.r, 0); ctx.lineTo(o.r, 0); ctx.stroke();
        ctx.restore(); ctx.globalAlpha = 1;
      } else if (theme === 'klappen') {
        o.p += dt * o.sp; o.vx += (R() - .5) * 18 * dt; o.vy += (R() - .5) * 18 * dt; o.vx *= .98; o.vy *= .98;
        o.x = (o.x + o.vx * dt * 6 + w) % w; o.y = (o.y + o.vy * dt * 6 + h) % h;
        const a = calm ? .5 : Math.max(0, Math.sin(o.p)) ** 2;
        const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r * 7);
        g.addColorStop(0, `rgba(255,226,150,${.8 * a})`); g.addColorStop(.25, `rgba(255,170,80,${.25 * a})`); g.addColorStop(1, 'rgba(255,150,60,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(o.x, o.y, o.r * 7, 0, 6.283); ctx.fill();
      } else if (theme === 'flying') {
        o.x += o.s * dt; if (o.x - o.r > w) { o.x = -o.r; o.y = R() * h; }
        const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
        g.addColorStop(0, `rgba(255,236,220,${o.a})`); g.addColorStop(1, 'rgba(255,200,160,0)');
        ctx.save(); ctx.translate(o.x, o.y); ctx.scale(1, o.k); ctx.translate(-o.x, -o.y);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, 6.283); ctx.fill(); ctx.restore();
      } else {
        o.y += o.s * dt; o.p += dt; o.x += Math.sin(o.p) * dt * 8;
        if (o.y > h + 4) { o.y = -4; o.x = R() * w; }
        ctx.globalAlpha = o.a; ctx.fillStyle = '#e8f1ff'; ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1;
      }
    }
    if (!document.hidden) requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { prev = performance.now(); requestAnimationFrame(draw); } });
})();

/* 20. Immersion (WIP, only with ?wip): optional ambient sound, off by default, made by the browser (no audio file).
       Kläppen forest (leaves + birds), Flying AI wind, Abyss underwater (muffled, deeper as you scroll, bubbles),
       WolfPeak cold wind, other pages a soft pad. The choice follows you from page to page in the tab. */
(() => {
  const root = document.documentElement;
  if (!root.classList.contains('is-wip')) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const fr = root.lang === 'fr';
  const theme = root.dataset.theme || 'home';
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'amb';
  const label = (on) => { btn.innerHTML = `<span class="amb__ico" aria-hidden="true">${on ? '🔊' : '🔈'}</span>${fr ? 'Ambiance' : 'Ambience'}<span class="amb__bars" aria-hidden="true"><i></i><i></i><i></i></span>`; btn.setAttribute('aria-pressed', on); btn.classList.toggle('is-on', on); };
  document.body.append(btn);
  let ctx = null, master = null, on = false, timers = [];
  const noise = (kind) => { // white, pink-ish or brown noise buffer, looped
    const len = ctx.sampleRate * 4, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0, b = [0, 0, 0];
    for (let i = 0; i < len; i++) {
      const wht = Math.random() * 2 - 1;
      if (kind === 'brown') { last = (last + .02 * wht) / 1.02; d[i] = last * 3.5; }
      else if (kind === 'pink') { b[0] = .997 * b[0] + wht * .029; b[1] = .985 * b[1] + wht * .032; b[2] = .95 * b[2] + wht * .048; d[i] = (b[0] + b[1] + b[2] + wht * .02) * 1.6; }
      else d[i] = wht;
    }
    const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; return s;
  };
  const lfo = (target, rate, depth, base) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = rate; g.gain.value = depth; o.connect(g).connect(target); target.value = base; o.start(); };
  const chirp = (f0, f1, dur, vol) => {
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
    o.type = 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + .05);
  };
  const every = (min, max, fn) => { const go = () => { timers.push(setTimeout(() => { if (on) fn(); go(); }, min + Math.random() * (max - min))); }; go(); };
  let abyssFilter = null, tens = null;
  const build = () => {
    ctx = new AC(); master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    if (theme === 'klappen') {
      const n = noise('pink'), f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = 'bandpass'; f.Q.value = .6; lfo(f.frequency, .07, 500, 1400); lfo(g.gain, .11, .25, .55);
      n.connect(f).connect(g).connect(master); n.start();
      every(2500, 7000, () => { const b = 2400 + Math.random() * 1600, k = 1 + (Math.random() * 3 | 0); for (let i = 0; i < k; i++) setTimeout(() => chirp(b, b * 1.35, .09, .05), i * 130); });
    } else if (theme === 'abyss') {
      const n = noise('brown'), f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = 'lowpass'; f.Q.value = 1.5; f.frequency.value = 520; abyssFilter = f; lfo(g.gain, .06, .3, .9);
      n.connect(f).connect(g).connect(master); n.start();
      const hum = ctx.createOscillator(), hg = ctx.createGain(); hum.frequency.value = 55; hg.gain.value = .05; hum.connect(hg).connect(master); hum.start();
      every(1800, 6000, () => { const k = 2 + (Math.random() * 4 | 0); for (let i = 0; i < k; i++) setTimeout(() => { const b = 300 + Math.random() * 500; chirp(b, b * 2.2, .07, .035); }, i * (60 + Math.random() * 80)); });
      // tension layer: two close low tones beat against each other, louder near the bottom of the page
      tens = ctx.createGain(); tens.gain.value = 0; tens.connect(master);
      [41, 41.8].forEach((hz) => { const o = ctx.createOscillator(), lp = ctx.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = hz; lp.type = 'lowpass'; lp.frequency.value = 160; o.connect(lp).connect(tens); o.start(); });
      every(7000, 14000, () => { // a distant groan, only when deep
        if (!tens || tens.gain.value < .15) return;
        const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter(), t = ctx.currentTime;
        o.type = 'sawtooth'; o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(34, t + 3.5);
        lp.type = 'lowpass'; lp.frequency.value = 220; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.35 * tens.gain.value, t + 1.2); g.gain.exponentialRampToValueAtTime(.0001, t + 4);
        o.connect(lp).connect(g).connect(master); o.start(t); o.stop(t + 4.2);
      });
    } else if (theme === 'flying' || theme === 'wolfpeak') {
      const n = noise(theme === 'flying' ? 'pink' : 'white'), f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = 'bandpass'; f.Q.value = theme === 'flying' ? 1.2 : 3; lfo(f.frequency, .05, theme === 'flying' ? 350 : 700, theme === 'flying' ? 600 : 1600);
      lfo(g.gain, .09, .3, theme === 'flying' ? .6 : .25);
      n.connect(f).connect(g).connect(master); n.start();
    } else {
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; lfo(f.frequency, .04, 250, 700); f.connect(master);
      [110, 164.8, 220.5, 277.2].forEach((hz, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = i % 2 ? 'triangle' : 'sine'; o.frequency.value = hz; o.detune.value = (Math.random() - .5) * 12; lfo(g.gain, .03 + i * .017, .05, .07); o.connect(g).connect(f); o.start(); });
    }
  };
  const VOL = { home: .05, klappen: .07, abyss: .09, flying: .06, wolfpeak: .05 };
  // the choice is remembered (localStorage) until the visitor turns it off, on every page and visit
  const store = (v) => { try { v ? localStorage.setItem('amb', '1') : localStorage.removeItem('amb'); sessionStorage.removeItem('amb'); } catch (err) { /* private mode */ } };
  const depthMix = () => {
    if (!abyssFilter || !ctx) return;
    const t = Math.min(1, scrollY / Math.max(1, root.scrollHeight - innerHeight));
    abyssFilter.frequency.setTargetAtTime(520 - t * 340, ctx.currentTime, .3); // deeper = more muffled
    if (tens) { const k = Math.min(1, Math.max(0, (t - .62) / .33)); tens.gain.setTargetAtTime(k * k * (3 - 2 * k) * .9, ctx.currentTime, .8); }
  };
  const fadeIn = () => { if (ctx && on && ctx.state === 'running') { depthMix(); master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(VOL[theme] || .05, ctx.currentTime, .9); btn.classList.remove('is-armed'); } };
  const set = (v) => {
    on = v; label(on); store(on);
    if (on && !ctx) build();
    if (!ctx) return;
    if (on) ctx.resume().then(fadeIn); else master.gain.setTargetAtTime(0, ctx.currentTime, .4);
  };
  btn.addEventListener('click', () => set(!on));
  addEventListener('scroll', depthMix, { passive: true });
  // leaving the page: a short fade instead of a hard cut (the page transition leaves ~0.4 s)
  const fadeOut = () => { if (ctx && on) master.gain.setTargetAtTime(0, ctx.currentTime, .09); };
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank' || a.hasAttribute('download')) return;
    const u = new URL(a.href, location.href);
    if (u.origin === location.origin && !(u.pathname === location.pathname && u.hash)) fadeOut();
  }, true);
  addEventListener('pagehide', fadeOut);
  addEventListener('pageshow', (e) => { if (e.persisted && on && ctx) ctx.resume().then(fadeIn); });
  // still on from a previous page: start right away if the browser allows it, otherwise on the first click, tap or key
  let was = false; try { was = localStorage.getItem('amb') === '1' || sessionStorage.getItem('amb') === '1'; } catch (err) { /* private mode */ }
  label(false);
  if (was) {
    on = true; label(true); store(true); build();
    ctx.resume().then(fadeIn).catch(() => {});
    if (ctx.state !== 'running') {
      btn.classList.add('is-armed');
      const go = (e) => { if (e && e.target && e.target.closest && e.target.closest('.amb')) return; ['pointerdown', 'keydown', 'touchstart'].forEach((t) => removeEventListener(t, go, true)); if (on) ctx.resume().then(fadeIn); };
      ['pointerdown', 'keydown', 'touchstart'].forEach((t) => addEventListener(t, go, true));
    }
  }
})();

/* 21. Art direction per project (WIP, only with ?wip): each project page gets its own world (css/da.css,
       downloaded only in WIP mode). The shared grid, its pulses and the bug hunt are off on those pages. */
(() => {
  const root = document.documentElement;
  const theme = root.dataset.theme;
  const FONTS = { abyss: 'Exo+2:wght@300;500;600', klappen: 'Fredoka:wght@400;500;600', flying: 'Rajdhani:wght@500;600;700', wolfpeak: 'Barlow+Condensed:wght@500;600;700' };
  if (!root.classList.contains('is-wip') || !FONTS[theme]) return;
  const me = document.querySelector('script[src*="js/main.js"]');
  const css = document.createElement('link');
  css.rel = 'stylesheet'; css.href = new URL('../css/da.css' + (me ? new URL(me.src).search : ''), me ? me.src : location.href).href;
  css.onload = () => root.classList.add('da', 'da-' + theme);
  const font = document.createElement('link');
  font.rel = 'stylesheet'; font.href = `https://fonts.googleapis.com/css2?family=${FONTS[theme]}&display=swap`;
  document.head.append(font, css);
})();

/* 22. Art direction (WIP, only with ?wip): a click on empty space has its own effect and sound on each project page.
       Abyss: sonar ping + bubbles. Kläppen: a burst of leaves. Flying AI: wind streaks. WolfPeak: an ice crystal + snow puff. */
(() => {
  const root = document.documentElement;
  const theme = root.dataset.theme;
  if (!root.classList.contains('is-wip') || !['klappen', 'wolfpeak'].includes(theme)) return; // Flying AI: §23, Abyss: §24
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SKIP = 'a, button, input, textarea, select, label, video, img, .node, .card, p, h1, h2, h3, li, dl, .btn, .nav, .lightbox, .amb, .depth';
  const cv = document.createElement('canvas');
  cv.className = 'da-fx'; cv.setAttribute('aria-hidden', 'true');
  document.body.prepend(cv);
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  let w = 0, h = 0, fx = [], running = false, actx = null;
  const size = () => { const dpr = Math.min(2, devicePixelRatio || 1); w = innerWidth; h = innerHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  size(); addEventListener('resize', size);
  const R = Math.random;
  const audio = () => { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); return actx; } catch (err) { return null; } };
  const noiseBurst = (a, dur, f0, f1, q, vol) => {
    const t = a.currentTime, len = Math.ceil(a.sampleRate * dur), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = R() * 2 - 1;
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = buf; f.type = 'bandpass'; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + dur * .2); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    src.connect(f).connect(g).connect(a.destination); src.start(t);
  };
  const tone = (a, f, dur, vol, type = 'sine', delay = 0) => {
    const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * .96, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + .05);
  };
  const sound = () => {
    const a = audio(); if (!a) return;
    if (theme === 'abyss') { tone(a, 1180 + R() * 120, 1.4, .05); tone(a, 1180, .9, .018, 'sine', .32); tone(a, 1180, .7, .008, 'sine', .64); }
    else if (theme === 'klappen') noiseBurst(a, .22, 2600, 1400, 1.4, .06);
    else if (theme === 'flying') noiseBurst(a, .4, 380, 1700, 1.8, .07);
    else { const b = [2093, 2349, 2637, 3136][(R() * 4) | 0]; tone(a, b, .5, .03); tone(a, b * 1.5, .35, .015, 'sine', .05); }
  };
  addEventListener('click', (e) => {
    if (e.button !== 0 || getSelection().toString() || (e.target.closest && e.target.closest(SKIP))) return;
    const x = e.clientX, y = e.clientY;
    sound();
    if (theme === 'abyss') {
      for (let i = 0; i < 3; i++) fx.push({ k: 'ring', x, y, t: -i * .18, life: 1.6 });
      if (!calm) for (let i = 0; i < 9; i++) fx.push({ k: 'bubble', x: x + (R() - .5) * 20, y, vy: -(30 + R() * 60), p: R() * 6, r: 1.5 + R() * 3.5, t: 0, life: 1.6 + R() });
    } else if (theme === 'klappen') {
      const n = calm ? 4 : 9;
      for (let i = 0; i < n; i++) { const a = R() * 6.28, sp = calm ? 0 : 80 + R() * 120; fx.push({ k: 'leaf', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, rot: R() * 6, vr: (R() - .5) * 8, r: 5 + R() * 5, c: ['#e8893a', '#d9622b', '#f2b24a', '#b8461f'][(R() * 4) | 0], t: 0, life: 1.6 + R() * .6 }); }
      fx.push({ k: 'glow', x, y, t: 0, life: .7 });
    } else if (theme === 'flying') {
      const dir = R() < .5 ? -1 : 1;
      for (let i = 0; i < 5; i++) fx.push({ k: 'streak', x, y: y + (i - 2) * (8 + R() * 6), dir, len: 60 + R() * 90, sp: calm ? 0 : 500 + R() * 300, t: -i * .03, life: .7 });
    } else {
      fx.push({ k: 'flake', x, y, rot: R() * 1, t: 0, life: 1.4 });
      if (!calm) for (let i = 0; i < 12; i++) { const a = R() * 6.28, sp = 30 + R() * 70; fx.push({ k: 'snow', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: .8 + R() * 1.6, t: 0, life: 1 + R() * .6 }); }
    }
    if (!running) { running = true; prev = performance.now(); requestAnimationFrame(draw); }
  });
  let prev = 0;
  const draw = (now) => {
    const dt = Math.min(.05, (now - prev) / 1000); prev = now;
    ctx.clearRect(0, 0, w, h);
    fx = fx.filter((f) => (f.t += dt) < f.life);
    for (const f of fx) {
      if (f.t < 0) continue;
      const k = f.t / f.life, a = 1 - k;
      if (f.k === 'ring') {
        ctx.strokeStyle = `rgba(${k < .5 ? '111,227,255' : '255,155,224'},${.55 * a})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(f.x, f.y, 8 + k * 160, 0, 6.283); ctx.stroke();
      } else if (f.k === 'bubble') {
        f.y += f.vy * dt; f.p += dt * 5; const bx = f.x + Math.sin(f.p) * 4;
        ctx.strokeStyle = `rgba(190,240,255,${.7 * a})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(bx, f.y, f.r, 0, 6.283); ctx.stroke();
      } else if (f.k === 'leaf') {
        f.vy += 160 * dt; f.vx *= .97; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.vr * dt;
        ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot); ctx.globalAlpha = Math.min(1, a * 1.4); ctx.fillStyle = f.c;
        ctx.beginPath(); ctx.moveTo(-f.r, 0); ctx.quadraticCurveTo(0, -f.r * .7, f.r, 0); ctx.quadraticCurveTo(0, f.r * .7, -f.r, 0); ctx.fill(); ctx.restore(); ctx.globalAlpha = 1;
      } else if (f.k === 'glow') {
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 40 + k * 30); g.addColorStop(0, `rgba(255,200,120,${.35 * a})`); g.addColorStop(1, 'rgba(255,160,80,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, 70, 0, 6.283); ctx.fill();
      } else if (f.k === 'streak') {
        const head = f.x + f.dir * (f.sp * f.t + (f.sp ? 0 : 40 * k)), tail = head - f.dir * f.len;
        const g = ctx.createLinearGradient(tail, 0, head, 0); g.addColorStop(f.dir > 0 ? 0 : 1, 'rgba(255,214,184,0)'); g.addColorStop(f.dir > 0 ? 1 : 0, `rgba(255,214,184,${.6 * a})`);
        ctx.strokeStyle = g; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(tail, f.y); ctx.lineTo(head, f.y); ctx.stroke();
      } else if (f.k === 'flake') {
        const r = 6 + Math.min(1, k * 3) * 22;
        ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot + k * .6); ctx.strokeStyle = `rgba(214,228,245,${.8 * a})`; ctx.lineWidth = 1.3; ctx.beginPath();
        for (let i = 0; i < 6; i++) { ctx.rotate(1.0472); ctx.moveTo(0, 0); ctx.lineTo(0, -r); ctx.moveTo(0, -r * .55); ctx.lineTo(r * .22, -r * .75); ctx.moveTo(0, -r * .55); ctx.lineTo(-r * .22, -r * .75); }
        ctx.stroke(); ctx.restore();
      } else if (f.k === 'snow') {
        f.vx *= .95; f.vy = f.vy * .95 + 20 * dt; f.x += f.vx * dt; f.y += f.vy * dt;
        ctx.globalAlpha = a; ctx.fillStyle = '#e8f1ff'; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1;
      }
    }
    if (fx.length) requestAnimationFrame(draw); else { running = false; ctx.clearRect(0, 0, w, h); }
  };
})();

/* 23. Entrance (public since 25 Nov 2026): the site "boots" on the first visit of the session (a wire draws out of the
   logo, then the screen opens), the first screen of every page arrives in a cascade (the title word by word), and
   content revealed on scroll lands with a little weight (rise, unblur, slight overshoot), staggered when several
   items come in together. */
(() => {
  const root = document.documentElement;
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('fx-entry');

  // first screen: cascade, in document order (measured from the top of main: a stylesheet still loading can push it down)
  const mainEl = document.querySelector('main'), mainTop = mainEl ? mainEl.getBoundingClientRect().top : 0;
  const SEL = 'main .case-hero .back, main .case-hero .skills-row, main .case-hero__row > *, main .case-hero .facts > div, main .crumbs, main .eyebrow, main h1, main .case-hero__pitch, main .hero2__pitch, main .hero2__sub, main section:first-of-type > div > p, main .hero__actions > *, main .hero__side > *, main .case-hero .node, main .hero-media';
  const first = [...document.querySelectorAll(SEL)].filter((el, i, a) => a.indexOf(el) === i && el.getBoundingClientRect().top - mainTop < innerHeight - 70 && !el.closest('[hidden]')).slice(0, 14);
  let booted = false;
  try { booted = sessionStorage.getItem('booted') === '1'; sessionStorage.setItem('booted', '1'); } catch (err) { booted = true; }
  const arriving = root.classList.contains('is-arriving') || document.querySelector('.wipe.is-covered, .wipe.is-in');
  const startDelay = !booted && !calm && !arriving ? 900 : root.classList.contains('fx-vt') ? 160 : 120;
  const GAP = 95, WGAP = 55; // ms between blocks, between words of the title
  // the title rises word by word out of a mask; each block after it waits for the title to be well underway
  const split = (h) => {
    const words = [];
    const walk = (n) => [...n.childNodes].forEach((c) => {
      if (c.nodeType === 1) { walk(c); return; }
      if (c.nodeType !== 3 || !c.textContent.trim()) return;
      const frag = document.createDocumentFragment();
      c.textContent.split(/(\s+)/).forEach((w) => {
        if (!w) return;
        if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(w)); return; }
        const o = document.createElement('span'), i = document.createElement('span');
        o.className = 'fx-w'; i.className = 'fx-wi'; i.textContent = w;
        o.appendChild(i); frag.appendChild(o); words.push(i);
      });
      c.replaceWith(frag);
    });
    walk(h);
    return words;
  };
  let d = startDelay, words = [];
  first.forEach((el) => {
    if (el.tagName === 'H1' && !calm) {
      const ws = split(el);
      ws.forEach((w, k) => w.style.setProperty('--fx-d', `${d + k * WGAP}ms`));
      words = words.concat(ws);
      d += Math.min(ws.length, 6) * WGAP + 120;
      return;
    }
    el.classList.add('fx-in'); el.style.setProperty('--fx-d', `${d}ms`);
    d += GAP;
  });
  root.classList.remove('fx-pre'); // the head script hid the first screen until now (no flash)
  requestAnimationFrame(() => requestAnimationFrame(() => first.forEach((el) => el.classList.add('fx-go'))));
  setTimeout(() => {
    first.forEach((el) => el.classList.remove('fx-in', 'fx-go'));
    // put the title back as plain text (keeps the DOM clean for copy and screen readers)
    words.forEach((w) => { const o = w.parentNode; if (o && o.parentNode) o.replaceWith(document.createTextNode(w.textContent)); });
    first.forEach((el) => { if (el.tagName === 'H1') el.normalize(); });
  }, d + 1400);

  // boot screen, once per session: logo, a wire drawing out of it, then the screen opens
  if (!booted && !calm && !arriving) {
    const boot = document.createElement('div');
    boot.className = 'fx-boot'; boot.setAttribute('aria-hidden', 'true');
    boot.innerHTML = '<div class="fx-boot__mark">EL<span>.</span></div><div class="fx-boot__wire"><i></i></div><div class="fx-boot__txt">Event BeginPlay</div>';
    document.body.appendChild(boot);
    root.classList.remove('fx-preboot');
    const end = () => { boot.classList.add('is-out'); setTimeout(() => boot.remove(), 600); };
    const t = setTimeout(end, 820);
    boot.addEventListener('click', () => { clearTimeout(t); end(); });
    addEventListener('keydown', () => { clearTimeout(t); end(); }, { once: true });
  }

  root.classList.remove('fx-preboot');
  // scroll reveals: items entering together get a small stagger
  if ('IntersectionObserver' in window) {
    let batch = 0, batchT = 0, early = 0;
    const t0 = performance.now();
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        if (first.includes(e.target)) return;
        // already on screen when the page opens (e.g. the demo reel on a tall screen): it joins the end of the
        // first-screen cascade instead of appearing at once, before the title
        const s = performance.now() - t0 < 700 ? d + early++ * GAP : Math.min(batch, 5) * 110;
        e.target.style.setProperty('--fx-s', `${s}ms`);
        e.target.classList.add('is-live');
        // once landed, back to its own hover transitions (tilt etc.)
        const el = e.target, done = () => el.classList.add('fx-done');
        el.addEventListener('transitionend', (ev) => { if (ev.target === el && ev.propertyName === 'transform') done(); });
        setTimeout(done, s + 3000);
        batch++; clearTimeout(batchT); batchT = setTimeout(() => { batch = 0; }, 120);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
    window.fxReveal = (el) => io.observe(el); // project cards are built later by projects.js
  }
})();

/* 23. Flying AI art direction (WIP, only with ?wip): a living sky. Air currents drift by, and now and then a small drone
       weaves across, leaving its dashed trajectory. Click on empty space = an EQS query: points pop around the click,
       scored green to red, the best one is picked and a drone flies in to it, hovers, then leaves. */
(() => {
  const root = document.documentElement;
  if (!root.classList.contains('is-wip') || root.dataset.theme !== 'flying') return;
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SKIP = 'a, button, input, textarea, select, label, video, img, .node, .card, p, h1, h2, h3, li, dl, .btn, .nav, .lightbox, .amb';
  const cv = document.createElement('canvas');
  cv.className = 'da-fx'; cv.setAttribute('aria-hidden', 'true');
  document.body.prepend(cv);
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  const R = Math.random;
  let w = 0, h = 0, wind = [], drones = [], queries = [], actx = null, nextDrone = performance.now() + 2500;
  const size = () => {
    const dpr = Math.min(2, devicePixelRatio || 1); w = innerWidth; h = innerHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    wind = Array.from({ length: Math.round(w * h / 45000) }, () => ({ x: R() * w, y: R() * h, len: 40 + R() * 120, s: 60 + R() * 140, a: .05 + R() * .1, p: R() * 6 }));
  };
  size(); addEventListener('resize', size);
  const audio = () => { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); return actx; } catch (err) { return null; } };
  const beep = (f, delay, dur = .09, vol = .035) => { const a = audio(); if (!a) return; const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + .05); };
  const whoosh = () => {
    const a = audio(); if (!a) return; const t = a.currentTime, len = a.sampleRate * .5, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = R() * 2 - 1;
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); src.buffer = buf; f.type = 'bandpass'; f.Q.value = 2.5;
    f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(1800, t + .25); f.frequency.exponentialRampToValueAtTime(700, t + .5);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05, t + .15); g.gain.exponentialRampToValueAtTime(.0001, t + .5);
    src.connect(f).connect(g).connect(a.destination); src.start(t);
  };
  // a drone: seek a target with arrival, or cruise across while weaving
  const spawn = (target) => {
    const left = target ? target.x > w / 2 : R() < .5;
    const x = left ? w + 30 : -30, y = target ? Math.max(40, Math.min(h - 40, target.y + (R() - .5) * 300)) : 80 + R() * (h - 160);
    drones.push({ x, y, vx: left ? -140 : 140, vy: 0, target, state: target ? 'seek' : 'cruise', t: 0, p: R() * 6, trail: [], dir: left ? -1 : 1, hover: 0 });
  };
  const drawDrone = (d) => {
    const ang = Math.atan2(d.vy, d.vx) * .3;
    ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(ang);
    ctx.strokeStyle = '#ffd9b8'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(6, 6); ctx.moveTo(6, -6); ctx.lineTo(-6, 6); ctx.stroke();
    ctx.fillStyle = '#ffb48a'; for (const [a, b] of [[-6, -6], [6, 6], [6, -6], [-6, 6]]) { ctx.beginPath(); ctx.arc(a, b, 2.2, 0, 6.283); ctx.fill(); }
    ctx.shadowColor = '#ff8a4c'; ctx.shadowBlur = 10; ctx.fillStyle = '#fff1e6'; ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, 6.283); ctx.fill();
    ctx.restore();
  };
  addEventListener('click', (e) => {
    if (e.button !== 0 || getSelection().toString() || (e.target.closest && e.target.closest(SKIP))) return;
    const cx = e.clientX, cy = e.clientY, pts = [];
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
      const x = cx + i * 26 + (R() - .5) * 6, y = cy + j * 26 + (R() - .5) * 6;
      const sc = Math.max(0, 1 - Math.hypot(i, j) / 3.2) * .7 + R() * .3; pts.push({ x, y, sc, d: (Math.abs(i) + Math.abs(j)) * .03 });
    }
    const best = pts.reduce((m, p) => (p.sc > m.sc ? p : m));
    queries.push({ pts, best, t: 0, life: 2.6 });
    beep(1320, 0); beep(1760, .09);
    if (!calm) setTimeout(() => { spawn({ x: best.x, y: best.y }); }, 350);
  });
  let prev = performance.now();
  const frame = (now) => {
    const dt = Math.min(.05, (now - prev) / 1000); prev = now;
    ctx.clearRect(0, 0, w, h);
    // air currents
    for (const s of wind) {
      if (!calm) { s.x += s.s * dt; s.p += dt; } if (s.x - s.len > w) { s.x = -s.len; s.y = R() * h; }
      const y = s.y + Math.sin(s.p + s.x * .01) * 3;
      const g = ctx.createLinearGradient(s.x - s.len, 0, s.x, 0); g.addColorStop(0, 'rgba(255,214,184,0)'); g.addColorStop(1, `rgba(255,214,184,${s.a})`);
      ctx.strokeStyle = g; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(s.x - s.len, y); ctx.lineTo(s.x, y); ctx.stroke();
    }
    // cruising drones now and then
    if (!calm && now > nextDrone && drones.filter((d) => d.state === 'cruise').length < 2) { spawn(null); nextDrone = now + 5000 + R() * 7000; }
    // EQS queries
    queries = queries.filter((q) => (q.t += dt) < q.life);
    for (const q of queries) {
      const fade = Math.min(1, (q.life - q.t) / .6);
      for (const p of q.pts) {
        const k = Math.min(1, Math.max(0, (q.t - p.d) / .18)); if (!k) continue;
        const r = Math.round(255 * (1 - p.sc)), gg = Math.round(90 + 165 * p.sc);
        ctx.fillStyle = `rgba(${r},${gg},90,${.85 * fade})`; ctx.beginPath(); ctx.arc(p.x, p.y, (2 + p.sc * 2.5) * (k < 1 ? 1 + (1 - k) * .8 : 1), 0, 6.283); ctx.fill();
      }
      if (q.t > .45) { const k = Math.min(1, (q.t - .45) / .25); ctx.strokeStyle = `rgba(120,255,160,${.9 * fade})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(q.best.x, q.best.y, 14 - k * 5, 0, 6.283); ctx.stroke(); }
    }
    // drones
    drones = drones.filter((d) => d.x > -60 && d.x < w + 60 && d.t < 20);
    for (const d of drones) {
      d.t += dt; d.p += dt * 3;
      if (d.state === 'seek') {
        const dx = d.target.x - d.x, dy = d.target.y - d.y, dist = Math.hypot(dx, dy), sp = Math.min(320, dist * 2.2);
        d.vx += ((dx / (dist || 1)) * sp - d.vx) * 3 * dt; d.vy += ((dy / (dist || 1)) * sp - d.vy) * 3 * dt;
        if (dist < 10) { d.state = 'hover'; whoosh(); }
      } else if (d.state === 'hover') {
        d.hover += dt; d.vx = Math.cos(d.p) * 30; d.vy = Math.sin(d.p) * 30;
        if (d.hover > .9) { d.state = 'leave'; d.vx = d.dir * -60; d.vy = -40; }
      } else if (d.state === 'leave') { d.vx += -d.dir * 380 * dt; d.vy *= .98; }
      else { d.vx = d.dir * 140; d.vy = Math.cos(d.p * .7) * 45; }
      d.x += d.vx * dt; d.y += d.vy * dt;
      d.trail.push([d.x, d.y]); if (d.trail.length > 70) d.trail.shift();
      ctx.setLineDash([3, 5]); ctx.strokeStyle = 'rgba(77,200,255,.35)'; ctx.lineWidth = 1; ctx.beginPath();
      d.trail.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.setLineDash([]);
      drawDrone(d);
    }
    if (!document.hidden) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { prev = performance.now(); requestAnimationFrame(frame); } });
})();

/* 24. Abyss art direction (WIP, only with ?wip): fish schools near the surface, and a click that changes with depth.
       Near the top: a xenobiologist scan (reticle, sweep, bright chirp) and nearby fish scatter.
       Deep down: a low, slow sonar ping in red. And something lives there: you never see it move or see its body,
       only eyes that open slowly at an edge, watch, close, and open again elsewhere (they close if the mouse comes close).
       The sonar shows a vague shape for a moment.
       The scan has a purpose: a small codex in the depth gauge (fish school, jellyfish, unknown signal). */
(() => {
  const root = document.documentElement;
  if (!root.classList.contains('is-wip') || root.dataset.theme !== 'abyss') return;
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SKIP = 'a, button, input, textarea, select, label, video, img, .node, .card, p, h1, h2, h3, li, dl, .btn, .nav, .lightbox, .amb, .depth';
  const cv = document.createElement('canvas');
  cv.className = 'da-fx'; cv.setAttribute('aria-hidden', 'true');
  const dv = document.querySelector(".dive"); if (dv) dv.after(cv); else document.body.prepend(cv); // above the dark water of §16
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  const R = Math.random;
  let w = 0, h = 0, schools = [], fx = [], actx = null;
  const depth = () => parseFloat(root.style.getPropertyValue('--depth')) || 0;
  const tension = () => parseFloat(root.style.getPropertyValue('--tension')) || 0;
  const school = (fromLeft) => {
    const n = 10 + (R() * 16 | 0), dir = fromLeft ? 1 : -1;
    return { x: fromLeft ? -120 : w + 120, y: 80 + R() * (h * .7), dir, sp: 22 + R() * 26, p: R() * 6, fish: Array.from({ length: n }, () => ({ ox: (R() - .5) * 110, oy: (R() - .5) * 50, ph: R() * 6, vx: 0, vy: 0, dx: 0, dy: 0, s: .7 + R() * .6 })) };
  };
  const size = () => { const dpr = Math.min(2, devicePixelRatio || 1); w = innerWidth; h = innerHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  size(); addEventListener('resize', size);
  schools = [school(true), school(false)]; schools[0].x = w * .2; schools[1].x = w * .75;
  // jellyfish: two of them, drifting up slowly in the middle of the dive
  const jelly = () => ({ x: w * (.1 + R() * .8), y: h * (.3 + R() * .8), r: 13 + R() * 8, p: R() * 6.28 });
  let jellies = [jelly(), jelly()];
  // codex: the scan is looking for something. Three entries to find, kept for the visit
  const FR = (root.lang || '').startsWith('fr');
  const T = FR ? { fish: 'Banc de poissons', jelly: 'Méduse', unknown: 'Signal inconnu · ???', none: 'Rien ici', nocontact: 'Aucun contact', fresh: 'Nouvelle entrée', logged: 'déjà au codex', done: 'Codex complet' }
    : { fish: 'Fish school', jelly: 'Jellyfish', unknown: 'Unknown signal · ???', none: 'Nothing here', nocontact: 'No contact', fresh: 'New entry', logged: 'already logged', done: 'Codex complete' };
  let codex = []; try { codex = JSON.parse(sessionStorage.getItem('abyss-codex') || '[]'); } catch (err) { codex = []; }
  const gauge = document.querySelector('.depth');
  const cdx = document.createElement('span'); cdx.className = 'depth__codex';
  const showCodex = () => { cdx.innerHTML = `Codex <b>${codex.length}</b>/3`; };
  if (gauge) { showCodex(); gauge.append(cdx); }
  const label = (x, y, text, col, sub) => { // what the scan found, in the scanner's own voice (above the page, readable)
    const el = document.createElement('div'); el.className = 'scan-tag'; el.setAttribute('aria-hidden', 'true'); el.style.setProperty('--c', `rgb(${col})`);
    el.innerHTML = `<b></b>${sub ? '<small></small>' : ''}`; el.firstChild.textContent = text; if (sub) el.lastChild.textContent = sub;
    document.body.append(el);
    const bw = el.offsetWidth, bh = el.offsetHeight;
    el.style.left = `${Math.min(innerWidth - bw - 8, Math.max(8, x - bw / 2))}px`; el.style.top = `${Math.min(innerHeight - bh - 8, Math.max(76, y - bh))}px`;
    setTimeout(() => el.remove(), 2600);
  };
  const found = (id, x, y) => {
    const fresh = !codex.includes(id);
    if (fresh) {
      codex.push(id); try { sessionStorage.setItem('abyss-codex', JSON.stringify(codex)); } catch (err) {}
      showCodex(); cdx.classList.remove('is-new'); void cdx.offsetWidth; cdx.classList.add('is-new');
      ping(988, 988, .25, .03, 0, 'triangle'); ping(1319, 1319, .35, .03, .12, 'triangle'); if (codex.length === 3) ping(1760, 1760, .5, .025, .26, 'triangle');
    }
    label(x, y, T[id], id === 'unknown' ? '255,95,109' : id === 'jelly' ? '255,155,224' : '111,227,255', fresh ? (codex.length === 3 ? `${T.fresh} · ${T.done}` : T.fresh) : T.logged);
  };
  const audio = () => { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); return actx; } catch (err) { return null; } };
  const ping = (f0, f1, dur, vol, delay = 0, type = 'sine', cut = 2400) => {
    const a = audio(); if (!a) return; const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain(), lp = a.createBiquadFilter();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * .6); lp.type = 'lowpass'; lp.frequency.value = cut;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .015); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(lp).connect(g).connect(a.destination); o.start(t); o.stop(t + dur + .05);
  };
  // the presence: you never see it move, never see its body. Eyes open slowly at an edge of the screen, watch you,
  // close, and open again somewhere else. The dark is a little thicker around them. Only the sonar hints at a shape.
  const mouse = { x: -999, y: -999 };
  addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  const LAYOUTS = [[[-4.5, 0], [4.5, 0]], [[-4.5, 0], [4.5, 0]], [[-5, .5], [4, 0], [-.5, -5]], [[-5, -3], [4.5, -3.5], [-3, 3], [3, 2.5]]];
  const ps = { x: 0, y: 0, state: 'hidden', k: 0, timer: 5, eyes: LAYOUTS[0], blinkAt: 0, blink: 0, lx: 0, ly: 0, gone: 0, reveal: 0, cloud: [] };
  const spot = () => { // close to an edge, half in the dark beyond the screen, never in the reading column
    const side = R() * 3 | 0, m = 16 + R() * 34;
    if (side === 0) return [m, h * (.25 + R() * .6)];
    if (side === 1) return [w - m, h * (.25 + R() * .6)];
    return [R() < .5 ? w * (.04 + R() * .12) : w * (.84 + R() * .12), h - m - 10];
  };
  const creak = (pan) => { // a low, slow sound from its side of the screen
    const a = audio(); if (!a) return; const t = a.currentTime, o = a.createOscillator(), g = a.createGain(), lp = a.createBiquadFilter(), sp = a.createStereoPanner ? a.createStereoPanner() : null;
    o.type = 'sawtooth'; o.frequency.setValueAtTime(52, t); o.frequency.linearRampToValueAtTime(44, t + 1.8); lp.type = 'lowpass'; lp.frequency.value = 180;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.035, t + .6); g.gain.exponentialRampToValueAtTime(.0001, t + 2);
    let n = o.connect(lp).connect(g); if (sp) { sp.pan.value = pan; n = n.connect(sp); } n.connect(a.destination); o.start(t); o.stop(t + 2.1);
  };
  const close = (fast) => { if (ps.state === 'hidden' || ps.state === 'closing') return; ps.state = 'closing'; ps.speed = fast ? 4 : 1.2; };
  const vanish = () => close(true);
  const drawPresence = (dt, tn) => {
    ps.reveal = Math.max(0, ps.reveal - dt * .7);
    if (ps.state === 'hidden') {
      ps.gone += dt;
      if (tn > .3 && (ps.timer -= dt) <= 0 && !document.hidden) {
        [ps.x, ps.y] = spot(); ps.eyes = LAYOUTS[R() * LAYOUTS.length | 0]; ps.state = 'opening'; ps.k = 0; ps.gone = 0; ps.watch = 2.5 + R() * 3; ps.blinkAt = 1 + R() * 1.5;
        if (Math.hypot(ps.x - mouse.x, ps.y - mouse.y) < 240) { ps.state = 'hidden'; ps.timer = 1; }
        else creak((ps.x / w) * 2 - 1);
      }
    } else if (ps.state === 'opening') { ps.k = Math.min(1, ps.k + dt / 1.8); if (ps.k === 1) ps.state = 'watching'; }
    else if (ps.state === 'watching') { if ((ps.watch -= dt) <= 0) close(false); if ((ps.blinkAt -= dt) <= 0 && ps.blinkAt > -dt * 2) ps.blink = .16; }
    else if (ps.state === 'closing') { ps.k = Math.max(0, ps.k - dt * ps.speed); if (!ps.k) { ps.state = 'hidden'; ps.timer = 5 + R() * 9; } }
    if (ps.state !== 'hidden' && Math.hypot(ps.x - mouse.x, ps.y - mouse.y) < 200) close(true); // you look its way: gone
    const A = ps.k * Math.min(1, tn * 1.6);
    if (ps.reveal > 0) { // the sonar return: scattered red dots in a shape too big for those eyes, then nothing
      for (const d of ps.cloud) { ctx.fillStyle = `rgba(255,95,109,${d[2] * ps.reveal})`; ctx.beginPath(); ctx.arc(d[0], d[1], 1.1, 0, 6.283); ctx.fill(); }
    }
    if (A < .01) return;
    // the darkness is thicker around it
    const g = ctx.createRadialGradient(ps.x, ps.y, 0, ps.x, ps.y, 90);
    g.addColorStop(0, `rgba(0,0,4,${.55 * A})`); g.addColorStop(1, 'rgba(0,0,4,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ps.x, ps.y, 90, 0, 6.283); ctx.fill();
    ps.blink = Math.max(0, ps.blink - dt);
    const la = Math.atan2(mouse.y - ps.y, mouse.x - ps.x); ps.lx += (Math.cos(la) * 1.2 - ps.lx) * dt * 2; ps.ly += (Math.sin(la) * 1.2 - ps.ly) * dt * 2;
    const open = ps.blink > 0 ? .08 : ps.k; // eyes open as narrow slits first
    ctx.save(); ctx.globalAlpha = .6 * A; ctx.fillStyle = '#ffe6cf'; ctx.shadowColor = '#ff8f6a'; ctx.shadowBlur = 6;
    for (const [ex, ey] of ps.eyes) { ctx.beginPath(); ctx.ellipse(ps.x + ex + ps.lx, ps.y + ey + ps.ly, 1.5, Math.max(.15, 1 * open), 0, 0, 6.283); ctx.fill(); }
    ctx.restore();
  };
  addEventListener('click', (e) => {
    if (e.button !== 0 || getSelection().toString() || (e.target.closest && e.target.closest(SKIP))) return;
    const x = e.clientX, y = e.clientY, deep = tension() > .45;
    if (deep) {
      ping(260, 240, 2.2, .07); ping(260, 240, 1.6, .025, .55); ping(260, 240, 1.2, .01, 1.1);
      for (let i = 0; i < 2; i++) fx.push({ k: 'sonar', x, y, t: -i * .5, life: 3 });
      if (ps.state !== 'hidden' || ps.gone < 2.5) { // it is (or was just) there: the ring reaches it, a short return, then it leaves
        const dd = Math.hypot(ps.x - x, ps.y - y), when = Math.max(0, (dd - 10) / 520 * 3);
        if (dd < 540) setTimeout(() => {
          const an = R() * 6.283; // an elongated, irregular shape behind the eyes, never the same twice
          ps.cloud = Array.from({ length: 46 }, () => { const u = R() * 6.283, rr = Math.sqrt(R()), ox = Math.cos(u) * rr * (60 + R() * 25), oy = Math.sin(u) * rr * (22 + R() * 14); return [ps.x + ox * Math.cos(an) - oy * Math.sin(an), ps.y + ox * Math.sin(an) + oy * Math.cos(an), .25 + R() * .55]; });
          ps.reveal = 1; ping(70, 46, 2.4, .08, 0, 'sawtooth', 320); found('unknown', ps.x, ps.y - 60); setTimeout(vanish, 500);
        }, when * 1000);
        else setTimeout(() => label(x, y - 40, T.nocontact, '160,160,180'), 1600);
      } else setTimeout(() => label(x, y - 40, T.nocontact, '160,160,180'), 1600);
    } else {
      ping(700, 1500, .45, .035); ping(1500, 1500, .08, .02, .4, 'triangle');
      fx.push({ k: 'scan', x, y, t: 0, life: 1.3 });
      const near = { fish: 1e9, jelly: 1e9 };
      for (const sc of schools) for (const f of sc.fish) { // fish nearby scatter away from the scan
        const fx0 = sc.x + f.ox + f.dx, fy0 = sc.y + f.oy + f.dy, dx = fx0 - x, dy = fy0 - y, d = Math.hypot(dx, dy);
        if (d < 220) { const k = (1 - d / 220) * 320; f.vx += (dx / (d || 1)) * k; f.vy += (dy / (d || 1)) * k; }
        if (d < near.fish) near.fish = d;
      }
      for (const j of jellies) near.jelly = Math.min(near.jelly, Math.hypot(j.x - x, j.y - y));
      const dp = depth(), fishVis = Math.max(0, 1 - dp * 1.9), jv = Math.max(0, 1 - Math.abs(dp - .42) / .26);
      setTimeout(() => {
        if (near.jelly < 75 && jv > .15) found('jelly', x, y - 40);
        else if (near.fish < 90 && fishVis > .15) found('fish', x, y - 40);
        else label(x, y - 40, T.none, '160,160,180');
      }, 450);
    }
  });
  let prev = performance.now();
  const frame = (now) => {
    const dt = Math.min(.05, (now - prev) / 1000); prev = now;
    ctx.clearRect(0, 0, w, h);
    const vis = Math.max(0, 1 - depth() * 1.9);
    // fish schools: visible near the surface only
    for (const sc of schools) {
      if (!calm) { sc.x += sc.dir * sc.sp * dt; sc.p += dt * .5; }
      const cy = sc.y + Math.sin(sc.p) * 30;
      if ((sc.dir > 0 && sc.x > w + 160) || (sc.dir < 0 && sc.x < -160)) Object.assign(sc, school(R() < .5));
      if (!vis) continue;
      for (const f of sc.fish) {
        if (!calm) { f.ph += dt * 6; f.dx += f.vx * dt; f.dy += f.vy * dt; f.vx *= .94; f.vy *= .94; f.dx *= .985; f.dy *= .985; }
        const fx0 = sc.x + f.ox + f.dx + Math.sin(f.ph * .3) * 4, fy0 = cy + f.oy + f.dy + Math.cos(f.ph * .25) * 3;
        const ang = Math.atan2(f.vy * .02, sc.dir + f.vx * .01);
        ctx.save(); ctx.translate(fx0, fy0); ctx.rotate(ang); ctx.scale(f.s * (sc.dir > 0 ? 1 : -1) * (Math.abs(f.vx) > 30 ? 1 : 1), f.s);
        ctx.globalAlpha = .24 * vis; ctx.fillStyle = '#a8e6ff';
        const tail = Math.sin(f.ph) * 1.6;
        ctx.beginPath(); ctx.moveTo(6, 0); ctx.quadraticCurveTo(0, -2.6, -5, 0); ctx.quadraticCurveTo(0, 2.6, 6, 0); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-4.5, 0); ctx.lineTo(-8, -2.4 + tail); ctx.lineTo(-8, 2.4 + tail); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
    // jellyfish: a soft pink bell that pulses and rises, tentacles trailing
    const jv = Math.max(0, 1 - Math.abs(depth() - .42) / .26);
    for (const j of jellies) {
      j.p += dt * 1.6; const pulse = Math.max(0, Math.sin(j.p)), sq = 1 + pulse * .18;
      if (!calm) { j.y -= (5 + pulse * 14) * dt; j.x += Math.sin(j.p * .2) * 4 * dt; }
      if (j.y < -80) Object.assign(j, jelly(), { y: h + 60 });
      if (!jv) continue;
      ctx.save(); ctx.translate(j.x, j.y); ctx.globalAlpha = jv;
      ctx.strokeStyle = 'rgba(255,170,230,.28)'; ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) { const tx = (i - 2) * j.r * .35; ctx.beginPath(); ctx.moveTo(tx, 0); for (let k = 1; k <= 6; k++) ctx.lineTo(tx + Math.sin(j.p * 1.3 - k * .7 + i) * 3, k * j.r * .45); ctx.stroke(); }
      const g = ctx.createRadialGradient(0, -j.r * .3, 0, 0, -j.r * .3, j.r * 1.2);
      g.addColorStop(0, 'rgba(255,190,240,.45)'); g.addColorStop(1, 'rgba(255,155,224,0)');
      ctx.fillStyle = g; ctx.shadowColor = '#ff9be0'; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.ellipse(0, 0, j.r * sq, j.r * .8 / sq, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,200,240,.4)'; ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    const tn = tension(); drawPresence(dt, tn);
    // click effects
    fx = fx.filter((f) => (f.t += dt) < f.life);
    for (const f of fx) {
      if (f.t < 0) continue;
      const k = f.t / f.life, a = 1 - k;
      if (f.k === 'scan') {
        const r = 34 - Math.min(1, k * 4) * 10;
        ctx.strokeStyle = `rgba(111,227,255,${.8 * a})`; ctx.lineWidth = 1.4;
        for (let i = 0; i < 4; i++) { const a0 = i * 1.5708 + .35; ctx.beginPath(); ctx.arc(f.x, f.y, r, a0, a0 + .9); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.arc(f.x, f.y, r * 2.4, k * 6.283 - .5, k * 6.283); ctx.closePath();
        ctx.fillStyle = `rgba(111,227,255,${.12 * a})`; ctx.fill();
        ctx.fillStyle = `rgba(255,155,224,${.9 * a})`; ctx.beginPath(); ctx.arc(f.x, f.y, 2.2, 0, 6.283); ctx.fill();
        for (let i = 0; i < 12; i++) { const an = i * .5236; ctx.beginPath(); ctx.moveTo(f.x + Math.cos(an) * (r * 2.4 - 4), f.y + Math.sin(an) * (r * 2.4 - 4)); ctx.lineTo(f.x + Math.cos(an) * r * 2.4, f.y + Math.sin(an) * r * 2.4); ctx.strokeStyle = `rgba(111,227,255,${.35 * a})`; ctx.stroke(); }
      } else if (f.k === 'sonar') {
        ctx.strokeStyle = `rgba(255,95,109,${.45 * a})`; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(f.x, f.y, 10 + k * 520, 0, 6.283); ctx.stroke();
      }
    }
    if (!document.hidden) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { prev = performance.now(); requestAnimationFrame(frame); } });
})();
