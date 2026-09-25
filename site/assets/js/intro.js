/* Feder · entrée de page : le wordmark FEDER × PHANTOM se condense à partir de fumée
   (la dispersion du formulaire, à l'envers). La vidéo est seule un instant, des grains gris fins
   se rassemblent sur la forme des lettres, puis le vrai texte apparaît en fondu pendant qu'ils s'effacent.
   Les autres blocs entrent ensuite, en fondu, l'un après l'autre (délais dans style.css).
   Sans JS, ou avec « moins d'animations », tout est visible tout de suite. */
(() => {
  const root = document.documentElement;
  const go = () => root.classList.add('intro-go');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { go(); return; }

  const rand = (a, b) => a + Math.random() * (b - a);
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const words = [...document.querySelectorAll('.brand-stack .chrome')];
  if (!words.length) { go(); return; }

  function sprite() {                     // même grain que la dispersion du formulaire
    const s = 14, c = document.createElement('canvas'); c.width = c.height = s;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grad.addColorStop(0, 'rgba(255,255,255,.95)');
    grad.addColorStop(.55, 'rgba(235,235,233,.5)');
    grad.addColorStop(1, 'rgba(235,235,233,0)');
    g.fillStyle = grad; g.beginPath(); g.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2); g.fill();
    return c;
  }

  /* points situés sur les lettres : on dessine le mot hors écran, dans la même police, et on lit les pixels pleins */
  function letterPoints(el) {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    const w = Math.ceil(r.width), h = Math.ceil(r.height);
    if (w < 4 || h < 4) return [];
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    g.textBaseline = 'middle'; g.textAlign = 'left';
    const txt = el.textContent.trim().toUpperCase();
    const tw = g.measureText(txt).width || w;
    g.setTransform(w / tw, 0, 0, 1, 0, 0);          // recale la largeur (espacement des lettres)
    g.fillText(txt, 0, h * 0.54);
    const d = g.getImageData(0, 0, w, h).data, pts = [];
    for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) if (d[(y * w + x) * 4 + 3] > 128) pts.push([r.left + x, r.top + y]);
    return pts;
  }

  const start = () => {
    const pts = words.flatMap(letterPoints);
    if (!pts.length) { go(); return; }

    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:5';
    document.body.appendChild(canvas);
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const cw = innerWidth, ch = innerHeight;
    canvas.width = cw * dpr; canvas.height = ch * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) { canvas.remove(); go(); return; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const spr = sprite();

    const N = Math.min(1300, Math.round(pts.length * 0.25));
    const particles = Array.from({ length: N }, () => {
      const t = pts[(Math.random() * pts.length) | 0];
      return {
        tx: t[0], ty: t[1],
        ox: rand(-40, 40), oy: rand(-90, -14),                      // la fumée arrive d'un peu plus haut
        size: rand(1, 3), grow: rand(1.6, 2.6), alpha: rand(.5, .9),
        delay: rand(0, 650), dur: rand(750, 1150),
        phase: rand(0, Math.PI * 2), sway: rand(3, 11), freq: rand(1.4, 2.8),
      };
    });

    const T_TEXT = 700;                                            // le vrai texte commence à apparaître ici
    let t0, raf;
    const finish = () => { cancelAnimationFrame(raf); canvas.remove(); };
    const step = now => {
      if (!t0) { t0 = now; setTimeout(go, T_TEXT - 250); }         // le CSS gère fondu du texte et cascade des blocs
      const el = now - t0;
      ctx.clearRect(0, 0, cw, ch);
      let alive = false;
      for (const p of particles) {
        const k = (el - p.delay) / p.dur;
        if (k >= 1) continue;
        alive = true;
        if (k <= 0) continue;
        const e = easeOut(k), rest = 1 - e;
        const x = p.tx + p.ox * rest + Math.sin(k * p.freq * Math.PI + p.phase) * p.sway * rest;
        const y = p.ty + p.oy * rest;
        // apparaît, se rassemble, puis s'efface dans le texte qui prend le relais
        ctx.globalAlpha = p.alpha * (k < .25 ? k / .25 : k > .7 ? Math.max(0, (1 - k) / .3) : 1);
        const s = p.size * (1 + (p.grow - 1) * rest);
        ctx.drawImage(spr, x - s / 2, y - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
      if (alive) raf = requestAnimationFrame(step); else finish();
    };
    raf = requestAnimationFrame(step);
    setTimeout(finish, 4000);
    setTimeout(go, 4000);                                          // filet de sécurité
  };

  // les polices doivent être chargées pour que la forme des lettres soit la bonne
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(start, start);
})();
