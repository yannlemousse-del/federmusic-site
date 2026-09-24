/* Feder · le formulaire entier se disperse en fumée
   S'appuie sur feder-ui sans le modifier :
   - le bouton part avec l'effet exact du skill (FederMotion.dissolveButton) ;
   - le reste (champs, étiquettes, case) s'efface en fondu + flou pendant qu'un canvas dessine
     des particules grises qui naissent sur ces éléments, s'éclatent vers l'extérieur puis montent
     en ondulant (même physique que le skill : vitesse, freinage, dérive vers le haut, sinusoïde).
   Ordre : le bouton d'abord, puis la case, l'email, prénom + nom — une vague du bas vers le haut.
   API : FormDissolve.run(form, btn) -> Promise ; showDone(form, msg) ; restore(form) ; reopen(form). */
(() => {
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rand = (a, b) => a + Math.random() * (b - a);

  let sprite;
  function makeSprite() {                // même grain de poussière que le skill, dessiné une seule fois
    const s = 24, c = document.createElement('canvas'); c.width = c.height = s;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grad.addColorStop(0, 'rgba(255,255,255,.95)');
    grad.addColorStop(.4, 'rgba(230,230,228,.55)');
    grad.addColorStop(1, 'rgba(230,230,228,0)');
    g.fillStyle = grad; g.beginPath(); g.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2); g.fill();
    return c;
  }

  const parts = form => ({
    stage: form.querySelector('.form-stage'),
    body: form.querySelector('.form-body'),
    canvas: form.querySelector('.form-dust'),
    done: form.querySelector('.form-done'),
    msg: form.querySelector('.done-msg'),
  });

  /* blocs qui partent en fumée après le bouton : [sélecteur, retard en ms] */
  const WAVE = [['.consent', 90], ['.f-group', 200], ['.f-row', 320]];

  function run(form, btn) {
    const { stage, body, canvas } = parts(form);
    const motion = window.FederMotion || {};

    // le bouton : effet exact du skill
    if (motion.dissolveButton) motion.dissolveButton(btn, { onDone() {} });
    else btn.classList.add('is-dissolving');

    // le reste : fondu + flou, en vague
    WAVE.forEach(([sel, delay]) => {
      const el = body.querySelector(sel);
      if (el) el.style.setProperty('--sd', delay + 'ms');
    });
    body.classList.add('is-smoking');

    if (reduced() || !canvas || !canvas.getContext) return Promise.resolve();
    const ctx = canvas.getContext('2d');
    if (!ctx) return Promise.resolve();
    if (!sprite) sprite = makeSprite();

    // le canvas déborde du formulaire pour laisser monter la fumée
    const pad = { l: 40, r: 40, t: 230, b: 50 };
    const sr = stage.getBoundingClientRect();
    const cw = sr.width + pad.l + pad.r, ch = sr.height + pad.t + pad.b;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.style.cssText = `left:${-pad.l}px;top:${-pad.t}px;width:${cw}px;height:${ch}px;opacity:1`;
    canvas.width = cw * dpr; canvas.height = ch * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const ox = sr.left - pad.l, oy = sr.top - pad.t;        // origine du canvas dans la page

    // zones d'où naît la fumée : étiquettes, champs, case, avec leur retard
    const sources = [];
    WAVE.forEach(([sel, delay]) => {
      const block = body.querySelector(sel);
      if (!block) return;
      const targets = sel === '.consent' ? [block] : [...block.querySelectorAll('.f-label, input')];
      targets.forEach(t => {
        const r = t.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) return;
        sources.push({ x: r.left - ox, y: r.top - oy, w: r.width, h: r.height, delay, weight: Math.max(r.width * r.height, 1400) });
      });
    });
    const totalW = sources.reduce((a, s) => a + s.weight, 0);
    const pick = () => { let t = Math.random() * totalW; for (const s of sources) { if ((t -= s.weight) <= 0) return s; } return sources[sources.length - 1]; };

    const cx = pad.l + sr.width / 2, cy = pad.t + sr.height / 2;
    const N = 260;
    const particles = Array.from({ length: N }, () => {
      const s = pick();
      const x = s.x + rand(2, s.w - 2), y = s.y + rand(2, s.h - 2);
      const outward = Math.atan2(y - cy, x - cx);
      const burst = rand(10, 46);
      return {
        x, y,
        vx: Math.cos(outward) * burst * rand(.2, .6) + rand(-8, 8),
        vy: Math.sin(outward) * burst * rand(.1, .3) - rand(30, 70),   // dérive nette vers le haut
        size: rand(3, 9), alpha: rand(.55, .95),
        wait: s.delay + rand(0, 140), life: 0, maxLife: rand(1000, 1700),
        phase: rand(0, Math.PI * 2), swayAmp: rand(4, 16), swayFreq: rand(1.2, 2.4),
      };
    });

    return new Promise(resolve => {
      let raf, last, done = false;
      const end = () => {
        if (done) return; done = true;
        cancelAnimationFrame(raf);
        canvas.style.opacity = '0'; ctx.clearRect(0, 0, cw, ch);
        resolve();
      };
      const step = now => {
        const dt = Math.min(32, now - (last || now)); last = now;
        ctx.clearRect(0, 0, cw, ch);
        let alive = false;
        for (const p of particles) {
          if (p.wait > 0) { p.wait -= dt; alive = true; continue; }
          p.life += dt;
          if (p.life >= p.maxLife) continue;
          alive = true;
          const t = p.life / 1000;
          p.vx *= 0.965; p.vy *= 0.985; p.vy -= 6 * (dt / 1000);
          p.x += (p.vx * dt) / 1000 + Math.sin(t * p.swayFreq * Math.PI + p.phase) * p.swayAmp * (dt / 1000);
          p.y += (p.vy * dt) / 1000;
          const k = p.life / p.maxLife;
          ctx.globalAlpha = Math.max(0, p.alpha * (k < .15 ? k / .15 : 1 - (k - .15) / .85));
          ctx.drawImage(sprite, p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        ctx.globalAlpha = 1;
        if (alive) raf = requestAnimationFrame(step); else end();
      };
      raf = requestAnimationFrame(step);
      setTimeout(end, 2600);             // filet de sécurité (onglet en arrière-plan, etc.)
    });
  }

  /* le formulaire a disparu : on affiche la confirmation à sa place */
  function showDone(form, message) {
    const { body, done, msg } = parts(form);
    form.querySelector('.waitlist-submit').classList.remove('is-dissolving');
    body.classList.add('is-gone');
    msg.textContent = message;
    done.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => done.classList.add('is-in')));
  }

  /* échec de l'envoi : le formulaire revient tel quel, avec ce qui était saisi */
  function restore(form) {
    const { body } = parts(form);
    const btn = form.querySelector('.waitlist-submit');
    btn.classList.remove('is-dissolving');
    body.querySelectorAll('[style*="--sd"]').forEach(el => el.style.setProperty('--sd', '0ms'));
    body.classList.remove('is-gone');
    void body.offsetWidth;
    body.classList.remove('is-smoking');
  }

  /* « Inscrire quelqu'un d'autre » : la confirmation s'efface, le formulaire revient en fondu */
  function reopen(form) {
    const { done } = parts(form);
    done.classList.remove('is-in');
    setTimeout(() => { done.hidden = true; }, reduced() ? 0 : 350);
    restore(form);
    const first = form.querySelector('input[name="prenom"]');
    if (first) first.focus({ preventScroll: true });
  }

  window.FormDissolve = { run, showDone, restore, reopen };
})();
