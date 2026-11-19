/* Esteban Lafargue — Portfolio · tiny, dependency-free behaviour */
(() => {
  'use strict';

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
      return { y, s };
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
    });
    rail.classList.toggle('is-end', stops[stops.length - 1].on);
  };

  let raf = 0;
  addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); }, { passive: true });
  addEventListener('resize', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(layout); });
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
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = document.createElement('canvas');
  cv.className = 'bg-live';
  cv.setAttribute('aria-hidden', 'true');
  document.body.prepend(cv);
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  const G = 32;
  const COLORS = ['#4da3ff', '#4fd8ff', '#b18cff', '#3ddc97', '#f2c14e'];
  const fine = matchMedia('(pointer: fine)').matches;
  let rings = [];
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
  let w = 0, h = 0, pulses = [], mx = -1e4, my = -1e4, gx = -1e4, gy = -1e4, prev = 0, nextSpawn = 0;

  const size = () => {
    const dpr = Math.min(2, devicePixelRatio || 1);
    w = innerWidth; h = innerHeight;
    cv.width = w * dpr; cv.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const spawn = () => {
    const horiz = Math.random() < 0.55, dir = Math.random() < 0.5 ? 1 : -1;
    const len = 90 + Math.random() * 140, speed = 45 + Math.random() * 70;
    const c = COLORS[(Math.random() * COLORS.length) | 0];
    if (horiz) { // page coordinates, so the pulse sticks to the scrolling grid
      const line = Math.floor((scrollY + Math.random() * h) / G) * G;
      pulses.push({ horiz, line, pos: dir > 0 ? -len : w + len, dir, len, speed, c });
    } else {
      const line = Math.floor((Math.random() * w) / G) * G;
      pulses.push({ horiz, line, pos: dir > 0 ? scrollY - len : scrollY + h + len, dir, len, speed, c });
    }
  };

  const frame = (now) => {
    const dt = Math.min(0.05, (now - prev) / 1000 || 0); prev = now;
    ctx.clearRect(0, 0, w, h);
    const sy = scrollY;

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

    // pulses
    if (now > nextSpawn && pulses.filter((p) => !p.burst).length < (w < 700 ? 3 : 7)) { spawn(); nextSpawn = now + 600 + Math.random() * 1400; }
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
      g.addColorStop(0, p.c + '00'); g.addColorStop(1, p.c + a);
      ctx.lineWidth = p.burst ? 2 : 1.5;
      ctx.strokeStyle = g; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.fillStyle = p.c + (p.burst ? a : 'aa'); ctx.beginPath(); ctx.arc(x2, y2, p.burst ? 2.6 : 2, 0, 6.283); ctx.fill();
      const range = p.horiz ? w : sy + h;
      return p.dir > 0 ? tail < range + 10 : tail > (p.horiz ? -10 : sy - 10);
    });
    if (!document.hidden) requestAnimationFrame(frame);
  };

  size();
  addEventListener('resize', size);
  if (fine) {
    addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; if (gx < -1e3) { gx = mx; gy = my; } }, { passive: true });
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
  addEventListener('click', (e) => {
    if (e.button !== 0 || getSelection().toString() || (e.target.closest && e.target.closest(SKIP))) return;
    const x = Math.round(e.clientX / G) * G, yPage = Math.round((e.clientY + scrollY) / G) * G;
    const c = COLORS[(Math.random() * COLORS.length) | 0];
    const kind = SHAPES[(Math.random() * SHAPES.length) | 0];
    blip(e.clientX / w);
    rings.push({ x: x + 0.5, y: yPage + 0.5, t: 0, rgb: hex2rgb(c), kind, size: 80 + Math.random() * 30, rot: 0, spin: kind === 'circle' || kind === 'square' ? 0 : (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.8) });
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
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const run = (s) => {
    const txt = s.textContent.trim(), n = parseInt(txt, 10), plus = txt.endsWith('+') ? '+' : '';
    if (reduce) return;
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
  if (!matchMedia('(pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
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
   then the next page fades in with a slight rise. Internal links only; respects reduced motion. */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
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
  addEventListener('pageshow', (e) => { if (e.persisted) wipe.className = 'wipe'; });

  const go = (href) => {
    if (reduce) { location.href = href; return; }
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
