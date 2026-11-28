/* EQS sandbox (Flying AI case study, WIP since 28 Nov 2026).
   A simplified top view of one floor of EQS_FlyingAvoidance, drawn in the browser:
   SimpleGrid around a centre pushed ahead of the AI by the start distance, a sphere-trace filter from the AI to each point,
   two distance scores (to the target: closer is better; to the AI: farther is better), Single Best Item.
   The ship re-runs the query on a tick interval and flies to the best point with smooth rotation and banking.
   Drag the target and the obstacles; the Details panel changes the query live. */
(() => {
  const box = document.querySelector('.eqsbox');
  if (!box) return;
  const cv = box.querySelector('.eqsbox__cv'), ctx = cv.getContext('2d');
  const form = box.querySelector('.eqsbox__panel'), hint = box.querySelector('.eqsbox__hint');
  if (!ctx || !form) return;
  const out = (k) => box.querySelector(`[data-eqs="${k}"]`);
  const NOSAFE = (document.documentElement.lang || '').startsWith('fr') ? 'Aucun point sûr · garde sa dernière position sûre' : 'No safe point · keeps its last safe location';
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- parameters (world units = Unreal units) ----
  const P = {};
  const fmt = { wTarget: (v) => `×${v.toFixed(1)}`, wSelf: (v) => `×${v.toFixed(1)}`, bank: (v) => `×${v.toFixed(1)}`, tick: (v) => `${v.toFixed(1)} s` };
  const read = () => {
    form.querySelectorAll('input[type=range]').forEach((i) => {
      P[i.name] = parseFloat(i.value);
      const o = i.parentElement.querySelector('output');
      if (o) o.textContent = fmt[i.name] ? fmt[i.name](P[i.name]) : String(P[i.name]);
    });
  };
  form.addEventListener('input', (e) => { read(); runQuery(); bump(e.target); });
  form.addEventListener('reset', () => setTimeout(() => { read(); runQuery(); }, 0));
  form.addEventListener('submit', (e) => e.preventDefault());
  read();
  const bump = (el) => { const row = el.closest('.eqsbox__row'); if (!row || calm) return; row.classList.remove('is-tuned'); void row.offsetWidth; row.classList.add('is-tuned'); };

  // ---- world ----
  let W = 0, H = 0, scale = 1, wW = 60000, wH = 36000; // canvas px, px per unit, world size
  const ship = { x: 6000, y: 18000, vx: 0, vy: 0, yaw: 0, roll: 0, trail: [] };
  const target = { x: 46000, y: 13000, r: 1100 };
  let obstacles = [];
  const resetObstacles = () => { // placed as fractions of the stage, so they fit any shape
    obstacles = [[.24, .1, .07, .3], [.4, .5, .08, .12], [.16, .7, .12, .08], [.62, .2, .05, .22], [.66, .68, .1, .1]]
      .map(([x, y, w, h]) => ({ x: x * wW, y: y * wH, w: w * wW, h: h * wH }));
  };

  const size = () => {
    const r = cv.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) return; // hidden (WIP) or not laid out yet: keep the current world
    const dpr = matchMedia('(pointer: coarse)').matches ? 1 : Math.min(2, devicePixelRatio || 1);
    W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const oldW = wW, oldH = wH;
    scale = Math.min(W / 42000, H / 30000); wW = W / scale; wH = H / scale;
    const fx = wW / oldW, fy = wH / oldH; // keep everything in place when the stage changes shape
    if (Math.abs(fx - 1) > .01 || Math.abs(fy - 1) > .01) {
      [ship, target].forEach((o) => { o.x *= fx; o.y *= fy; });
      obstacles.forEach((o) => { o.x *= fx; o.y *= fy; });
    }
  };

  // ---- the query ----
  let points = [], best = null, lastBest = null; // with no safe point, the ship keeps its last safe location
  const hitsBox = (ax, ay, bx, by, o, r) => { // segment (a→b) swept by a sphere of radius r vs a box (box inflated by r)
    const x0 = o.x - r, y0 = o.y - r, x1 = o.x + o.w + r, y1 = o.y + o.h + r;
    let t0 = 0, t1 = 1; const dx = bx - ax, dy = by - ay;
    for (const [p, q] of [[-dx, ax - x0], [dx, x1 - ax], [-dy, ay - y0], [dy, y1 - ay]]) {
      if (p === 0) { if (q < 0) return false; continue; }
      const t = q / p;
      if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
    }
    return true;
  };
  const runQuery = () => {
    const fx = Math.cos(ship.yaw), fy = Math.sin(ship.yaw);
    const cx = ship.x + fx * P.start, cy = ship.y + fy * P.start;
    const n = Math.floor(P.radius / P.spacing);
    points = [];
    for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
      const x = cx + i * P.spacing, y = cy + j * P.spacing;
      const inside = x > 0 && y > 0 && x < wW && y < wH;
      const cut = !inside || obstacles.some((o) => hitsBox(ship.x, ship.y, x, y, o, P.trace));
      points.push({ x, y, cut, dT: Math.hypot(x - target.x, y - target.y), dS: Math.hypot(x - ship.x, y - ship.y), s: 0 });
    }
    const kept = points.filter((p) => !p.cut);
    best = null;
    if (kept.length) { // each test is normalised over the kept items, then weighted, like EQS
      const rng = (k) => { let lo = Infinity, hi = -Infinity; kept.forEach((p) => { lo = Math.min(lo, p[k]); hi = Math.max(hi, p[k]); }); return [lo, Math.max(1, hi - lo)]; };
      const [tLo, tR] = rng('dT'), [sLo, sR] = rng('dS'), wSum = Math.max(.0001, P.wTarget + P.wSelf);
      kept.forEach((p) => {
        const sT = 1 - (p.dT - tLo) / tR, sS = (p.dS - sLo) / sR;
        p.s = (P.wTarget * sT + P.wSelf * sS) / wSum;
        if (!best || p.s > best.s) best = p;
      });
    }
    if (best) lastBest = { x: best.x, y: best.y };
    out('kept').textContent = kept.length; out('cut').textContent = points.length - kept.length;
    out('best').textContent = best ? best.s.toFixed(2) : '—';
    born = performance.now();
  };
  let born = 0;

  // ---- dragging ----
  let drag = null, touched = false, lastTouch = 0;
  const toWorld = (e) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale }; };
  const pick = (p) => {
    if (Math.hypot(p.x - target.x, p.y - target.y) < target.r + 16 / scale) return { o: target, kind: 'target' };
    for (let i = obstacles.length - 1; i >= 0; i--) { const o = obstacles[i]; if (p.x > o.x && p.x < o.x + o.w && p.y > o.y && p.y < o.y + o.h) return { o, kind: 'box' }; }
    return null;
  };
  cv.addEventListener('pointerdown', (e) => {
    const p = toWorld(e), hit = pick(p);
    if (!hit) return;
    drag = { ...hit, dx: p.x - hit.o.x, dy: p.y - hit.o.y };
    cv.setPointerCapture(e.pointerId); cv.classList.add('is-grabbing');
    if (!touched) { touched = true; hint.classList.add('is-gone'); }
    lastTouch = performance.now();
  });
  cv.addEventListener('pointermove', (e) => {
    const p = toWorld(e);
    if (!drag) { cv.style.cursor = pick(p) ? 'grab' : ''; return; }
    const o = drag.o;
    const mw = o.w || 0, mh = o.h || 0;
    o.x = Math.min(wW - mw, Math.max(0, p.x - drag.dx)); o.y = Math.min(wH - mh, Math.max(0, p.y - drag.dy));
    lastTouch = performance.now();
    runQuery();
  });
  const drop = () => { drag = null; cv.classList.remove('is-grabbing'); };
  cv.addEventListener('pointerup', drop); cv.addEventListener('pointercancel', drop);
  box.querySelector('.eqsbox__reset').addEventListener('click', () => { resetObstacles(); target.x = wW * .75; target.y = wH * .4; });

  // ---- simulation + drawing ----
  let running = false, last = 0, acc = 0, idleT = 0;
  const pc = getComputedStyle(box).getPropertyValue('--pc').trim() || '#ffb48a';
  const lerpAng = (a, b, t) => { let d = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI; return a + d * t; };
  const step = (dt) => {
    // the target drifts slowly when nobody is playing, so the query is never frozen
    if (!drag && performance.now() - lastTouch > 5000) {
      idleT += dt * (calm ? .25 : .5);
      target.x = wW * (.62 + .22 * Math.cos(idleT * .7)); target.y = wH * (.5 + .3 * Math.sin(idleT));
    }
    acc += dt; if (acc >= P.tick) { acc = 0; runQuery(); }
    // Floating Pawn Movement towards the safe location
    const goal = best || lastBest || target, MAX = 5200, ACC = 6500;
    const gx = goal.x - ship.x, gy = goal.y - ship.y, gd = Math.hypot(gx, gy) || 1;
    ship.vx += gx / gd * ACC * dt; ship.vy += gy / gd * ACC * dt;
    const sp = Math.hypot(ship.vx, ship.vy); if (sp > MAX) { ship.vx *= MAX / sp; ship.vy *= MAX / sp; }
    ship.vx *= 1 - .6 * dt; ship.vy *= 1 - .6 * dt;
    ship.x = Math.min(wW - 300, Math.max(300, ship.x + ship.vx * dt)); ship.y = Math.min(wH - 300, Math.max(300, ship.y + ship.vy * dt));
    for (const o of obstacles) { // never inside an obstacle (when one is dropped on the ship)
      if (ship.x > o.x - 300 && ship.x < o.x + o.w + 300 && ship.y > o.y - 300 && ship.y < o.y + o.h + 300) {
        const l = ship.x - (o.x - 300), r = o.x + o.w + 300 - ship.x, t = ship.y - (o.y - 300), b = o.y + o.h + 300 - ship.y, m = Math.min(l, r, t, b);
        if (m === l) ship.x = o.x - 300; else if (m === r) ship.x = o.x + o.w + 300; else if (m === t) ship.y = o.y - 300; else ship.y = o.y + o.h + 300;
      }
    }
    // rotation follows the velocity (RInterpTo), roll = yaw delta × Banking Power, clamped
    const want = Math.atan2(ship.vy, ship.vx), prev = ship.yaw;
    ship.yaw = lerpAng(ship.yaw, want, Math.min(1, dt * 4));
    const dYaw = (((want - prev + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    const roll = Math.max(-.9, Math.min(.9, dYaw * P.bank * 1.6));
    ship.roll += (roll - ship.roll) * Math.min(1, dt * 5);
    ship.trail.push([ship.x, ship.y]); if (ship.trail.length > 70) ship.trail.shift();
  };
  const X = (v) => v * scale;
  const draw = (now) => {
    ctx.clearRect(0, 0, W, H);
    // faint world grid (1,000 units)
    ctx.strokeStyle = '#ffffff0b'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = 0; x < wW; x += 2000) { ctx.moveTo(X(x) + .5, 0); ctx.lineTo(X(x) + .5, H); }
    for (let y = 0; y < wH; y += 2000) { ctx.moveTo(0, X(y) + .5); ctx.lineTo(W, X(y) + .5); }
    ctx.stroke();
    // obstacles
    obstacles.forEach((o) => {
      ctx.fillStyle = '#c9d2e014'; ctx.strokeStyle = drag && drag.o === o ? pc : '#c9d2e055'; ctx.lineWidth = drag && drag.o === o ? 2 : 1;
      ctx.fillRect(X(o.x), X(o.y), X(o.w), X(o.h)); ctx.strokeRect(X(o.x) + .5, X(o.y) + .5, X(o.w), X(o.h));
      ctx.save(); ctx.beginPath(); ctx.rect(X(o.x), X(o.y), X(o.w), X(o.h)); ctx.clip(); ctx.strokeStyle = '#c9d2e016';
      for (let k = -X(o.h); k < X(o.w); k += 10) { ctx.beginPath(); ctx.moveTo(X(o.x) + k, X(o.y) + X(o.h)); ctx.lineTo(X(o.x) + k + X(o.h), X(o.y)); ctx.stroke(); }
      ctx.restore();
    });
    // the query: filtered points blue, kept points from red (0) to green (1), the best one ringed
    const age = Math.min(1, (now - born) / 220), pop = calm ? 1 : .6 + .4 * age;
    points.forEach((p) => {
      const x = X(p.x), y = X(p.y);
      if (p.cut) { ctx.fillStyle = '#4f7cff66'; ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 6.29); ctx.fill(); return; }
      ctx.fillStyle = `hsl(${Math.round(p.s * 120)} 85% 55%)`;
      ctx.beginPath(); ctx.arc(x, y, (3 + p.s * 4) * pop, 0, 6.29); ctx.fill();
    });
    if (best) {
      const bx = X(best.x), by = X(best.y);
      ctx.strokeStyle = pc; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, by, 11 + Math.sin(now / 180) * 1.5, 0, 6.29); ctx.stroke();
      ctx.setLineDash([5, 6]); ctx.strokeStyle = pc + '99'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(X(ship.x), X(ship.y)); ctx.lineTo(bx, by); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = '500 11px "JetBrains Mono", monospace'; ctx.fillStyle = '#fff'; ctx.fillText(best.s.toFixed(2), bx + 14, by - 10);
    }
    if (!best) { // nothing reachable: say it, like the EQS debugger would
      ctx.font = '600 12px "JetBrains Mono", monospace'; ctx.fillStyle = '#ff6b6b'; ctx.textAlign = 'center';
      ctx.fillText(NOSAFE, W / 2, H - 16); ctx.textAlign = 'start';
    }
    // the sphere trace radius around the ship
    ctx.strokeStyle = '#4f7cff40'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(X(ship.x), X(ship.y), X(P.trace), 0, 6.29); ctx.stroke();
    // trail
    ctx.strokeStyle = pc + '55'; ctx.lineWidth = 1.5; ctx.beginPath();
    ship.trail.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), X(y)) : ctx.moveTo(X(x), X(y)))); ctx.stroke();
    // target: the red sphere
    const tx = X(target.x), ty = X(target.y), tr = Math.max(8, X(target.r));
    const g = ctx.createRadialGradient(tx - tr * .35, ty - tr * .35, tr * .1, tx, ty, tr);
    g.addColorStop(0, '#ff8a8a'); g.addColorStop(.6, '#e0262f'); g.addColorStop(1, '#7a0c12');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(tx, ty, tr, 0, 6.29); ctx.fill();
    if (!touched) { ctx.strokeStyle = '#ffffff88'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(tx, ty, tr + 6 + (now / 40 % 14), 0, 6.29); ctx.stroke(); }
    // ship: banking shows as the hull narrowing and its shadow sliding sideways
    const sx = X(ship.x), sy = X(ship.y), s = Math.max(9, X(800)), k = 1 - Math.abs(ship.roll) * .45;
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(ship.yaw);
    ctx.fillStyle = '#00000066'; ctx.beginPath(); ctx.moveTo(s * 1.2, ship.roll * s * .8 + 3); ctx.lineTo(-s, -s * .8 * k + ship.roll * s * .8 + 3); ctx.lineTo(-s * .5, ship.roll * s * .8 + 3); ctx.lineTo(-s, s * .8 * k + ship.roll * s * .8 + 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd36b'; ctx.strokeStyle = '#1a1206'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(s * 1.2, 0); ctx.lineTo(-s, -s * .8 * k); ctx.lineTo(-s * .5, 0); ctx.lineTo(-s, s * .8 * k); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  };
  const loop = (now) => {
    if (!running) return;
    const dt = Math.min(.05, (now - last) / 1000 || 0); last = now;
    step(dt); draw(now);
    requestAnimationFrame(loop);
  };
  const start = () => { if (running || document.hidden) return; running = true; last = performance.now(); requestAnimationFrame(loop); };
  const stop = () => { running = false; };
  let visible = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }, { rootMargin: '100px' }).observe(cv);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : visible && start()));
  new ResizeObserver(() => { size(); runQuery(); if (!running) draw(performance.now()); }).observe(cv);
  size(); resetObstacles(); ship.x = wW * .1; ship.y = wH * .5; target.x = wW * .78; target.y = wH * .38; runQuery();
})();
