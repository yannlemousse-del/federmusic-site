/* feder-ui · motion.js (no dependencies, exposes window.FederMotion)
   Add class="js" to <html> from a head script, then paste this before the
   page script. Everything auto-initialises. */
(() => {
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 1a. ink flood origin: remember where the cursor entered/pressed so .vbtn fills from there (ported) */
  function floodOrigin() {
    const origin = (el, e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--fx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      el.style.setProperty('--fy', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    };
    ['pointerover', 'pointerout'].forEach(t => document.addEventListener(t, e => {
      const b = e.target.closest && e.target.closest('.vbtn');
      if (b && !b.contains(e.relatedTarget)) origin(b, e);
    }));
    document.addEventListener('pointerdown', e => {
      const b = e.target.closest && e.target.closest('.vbtn');
      if (b) origin(b, e);
    });
  }

  /* 1b. arrow swap: give every .arrow-swap[data-arrow] a twin icon (ported) */
  function arrowSwap() {
    $$('.arrow-swap[data-arrow]').forEach(el => {
      if (el.querySelector('.a')) return;
      const svg = el.querySelector('svg'); if (!svg) return;
      const dir = el.dataset.arrow === 'l' ? -1 : 1;
      el.style.setProperty('--out-x', (dir * 115) + '%');
      el.style.setProperty('--in-x', (dir * -115) + '%');
      const a = document.createElement('span'); a.className = 'a'; a.append(svg);
      const b = document.createElement('span'); b.className = 'a a--in'; b.setAttribute('aria-hidden', 'true'); b.append(svg.cloneNode(true));
      el.append(a, b);
    });
  }

  /* 2a. hero: reveal once, immediately (it's always above the fold) */
  function heroReveal() {
    const hero = document.querySelector('.hero');
    if (hero) requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add('is-in')));
  }

  /* assign each pill a stagger index and, unless the markup already set one, a small alternating rotation */
  function pillRotations() {
    $$('.tag-pill').forEach((p, i) => {
      p.style.setProperty('--i', i);
      if (!p.style.getPropertyValue('--rot')) {
        const deg = (i % 2 === 0 ? 1 : -1) * (4 + (i % 3) * 3);
        p.style.setProperty('--rot', deg + 'deg');
      }
      if (!p.querySelector('.pill-shadow')) {
        const sh = document.createElement('span'); sh.className = 'pill-shadow'; sh.setAttribute('aria-hidden', 'true');
        p.prepend(sh);
      }
    });
  }

  /* 2b. pill cloud: each pill FALLS in with real gravity — accelerating fall, then a
     squash-and-rebound landing with two shrinking bounces, plus a synced contact-shadow
     flash. Every pill gets slightly randomised drop height / tumble / drift / timing so
     the row reads as dropped, not as one mechanical loop copy-pasted six times — that
     uniformity is exactly what makes stock "fade-up-on-scroll" motion look generic.
     Runs once, triggered when the cloud scrolls into view. */
  function dropPills() {
    const cloud = document.querySelector('.pill-cloud');
    if (!cloud) return;
    const pills = $$('.tag-pill', cloud);
    const supportsAnimate = typeof cloud.animate === 'function';

    const settle = p => { p.classList.add('has-dropped'); };
    if (reduced() || !supportsAnimate) { pills.forEach(settle); return; }

    const rand = (a, b) => a + Math.random() * (b - a);

    const run = () => {
      pills.forEach((p, i) => {
        const restRot = parseFloat(p.style.getPropertyValue('--rot')) || 0;
        const dropH = rand(95, 165);
        const dx = rand(-14, 14);
        const tumble = restRot + (restRot >= 0 ? 1 : -1) * rand(28, 46);
        const dur = rand(950, 1120);
        const delay = i * rand(90, 130) + rand(-15, 15);
        const shadow = p.querySelector('.pill-shadow');

        const keyframes = [
          { transform: `translate(${dx*.4}px,${-dropH}px) rotate(${tumble}deg) scale(.85)`, opacity: 0, easing: 'ease-out' },
          { transform: `translate(${dx*.55}px,${-dropH*.8}px) rotate(${(tumble*.7+restRot*.3)}deg) scale(.9)`, opacity: 1, easing: 'cubic-bezier(.55,0,1,.45)', offset: .12 },
          { transform: `translate(${dx}px,0px) rotate(${restRot}deg) scale(1)`, opacity: 1, easing: 'ease-out', offset: .55 },
          { transform: `translate(${dx*.5}px,0px) rotate(${restRot}deg) scaleY(.76) scaleX(1.2)`, opacity: 1, easing: 'ease-out', offset: .6 },
          { transform: `translate(${dx*.15}px,-14px) rotate(${restRot}deg) scaleY(1.08) scaleX(.93)`, opacity: 1, easing: 'ease-in', offset: .72 },
          { transform: `translate(0px,0px) rotate(${restRot}deg) scaleY(.93) scaleX(1.05)`, opacity: 1, easing: 'ease-out', offset: .83 },
          { transform: `translate(0px,-5px) rotate(${restRot}deg) scaleY(1.02) scaleX(.99)`, opacity: 1, easing: 'ease-in', offset: .91 },
          { transform: `rotate(${restRot}deg) scale(1)`, opacity: 1, offset: 1 },
        ];
        try {
          const anim = p.animate(keyframes, { duration: dur, delay: Math.max(0, delay), fill: 'both' });
          anim.onfinish = () => { settle(p); try { anim.cancel(); } catch (_) {} };
        } catch (_) { settle(p); }

        if (shadow) {
          const shKeyframes = [
            { opacity: 0, transform: 'translateX(-50%) scaleX(.6)', offset: 0 },
            { opacity: 0, transform: 'translateX(-50%) scaleX(.6)', offset: .53 },
            { opacity: .55, transform: 'translateX(-50%) scaleX(1.15)', offset: .58 },
            { opacity: .25, transform: 'translateX(-50%) scaleX(.9)', offset: .75 },
            { opacity: 0, transform: 'translateX(-50%) scaleX(.8)', offset: 1 },
          ];
          try { shadow.animate(shKeyframes, { duration: dur, delay: Math.max(0, delay), fill: 'forwards' }); } catch (_) {}
        }
      });
      /* safety net: if anything above throws or a browser silently no-ops animate(),
         make sure every pill is visible no matter what once the sequence should be done */
      setTimeout(() => pills.forEach(settle), 2400);
    };

    if (!('IntersectionObserver' in window)) { run(); return; }
    const io = new IntersectionObserver(es => es.forEach(en => {
      if (en.isIntersecting) { run(); io.unobserve(cloud); }
    }), { threshold: .2 });
    io.observe(cloud);
  }

  /* 3. dust dissolve: a valid submit crumbles the button to drifting dust instead
     of just disabling it. Canvas-based (not N individually-animated DOM pieces) —
     on a phone this is the difference between a smooth burst and dropped frames.
     A single soft dust-mote sprite is rendered once to an offscreen canvas and
     then just drawImage'd per particle per frame — building a fresh radial
     gradient per particle per frame is the expensive way to do this.
     Motion, not confetti: each particle gets its own upward drift + gentle
     sideways sine sway + damping, monochrome, sized/opacity-varied — never a
     burst of identical, perfectly circular, brightly-coloured dots, which is
     what reads as a stock "particle effect" rather than dust actually settling. */
  function makeDustSprite() {
    const s = 24, c = document.createElement('canvas'); c.width = c.height = s;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
    grad.addColorStop(0, 'rgba(255,255,255,.95)');
    grad.addColorStop(.4, 'rgba(230,230,228,.55)');
    grad.addColorStop(1, 'rgba(230,230,228,0)');
    g.fillStyle = grad; g.beginPath(); g.arc(s/2, s/2, s/2, 0, Math.PI*2); g.fill();
    return c;
  }

  function dissolveButton(btn, { onDone } = {}) {
    const wrap = btn.closest('.submit-wrap') || btn.parentElement;
    const canvas = wrap.querySelector('.dust-canvas');
    if (reduced() || !canvas || typeof canvas.getContext !== 'function') {
      btn.classList.add('is-dissolving'); onDone && onDone(); return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) { btn.classList.add('is-dissolving'); onDone && onDone(); return; }
    if (!dissolveButton._sprite) dissolveButton._sprite = makeDustSprite();
    const sprite = dissolveButton._sprite;

    const dpr = Math.min(devicePixelRatio || 1, 2);
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    canvas.width = cw * dpr; canvas.height = ch * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const btnBox = btn.getBoundingClientRect(), canBox = canvas.getBoundingClientRect();
    const originX = btnBox.left - canBox.left, originY = btnBox.top - canBox.top;
    const bw = btnBox.width, bh = btnBox.height;

    const rand = (a, b) => a + Math.random() * (b - a);
    const N = 90;
    const particles = Array.from({ length: N }, () => {
      const px = originX + rand(2, bw - 2), py = originY + rand(2, bh - 2);
      const outward = Math.atan2(py - (originY + bh/2), px - (originX + bw/2));
      const burst = rand(10, 46);
      return {
        x: px, y: py,
        vx: Math.cos(outward) * burst * rand(.2, .6) + rand(-8, 8),
        vy: Math.sin(outward) * burst * rand(.1, .3) - rand(30, 70), // net upward drift, like dust catching light
        size: rand(3, 9),
        alpha: rand(.55, .95),
        life: 0, maxLife: rand(900, 1500),
        phase: rand(0, Math.PI * 2), swayAmp: rand(4, 16), swayFreq: rand(1.2, 2.4),
      };
    });

    btn.classList.add('is-dissolving');
    canvas.style.opacity = '1';
    const start = performance.now();
    let raf;
    const step = now => {
      const dt = Math.min(32, now - (step._t || now)); step._t = now;
      ctx.clearRect(0, 0, cw, ch);
      let alive = false;
      for (const p of particles) {
        p.life += dt;
        if (p.life >= p.maxLife) continue;
        alive = true;
        const t = p.life / 1000;
        p.vx *= 0.965; p.vy *= 0.985; p.vy -= 6 * (dt / 1000); // slight continued lift, air-current damping
        const sway = Math.sin(t * p.swayFreq * Math.PI + p.phase) * p.swayAmp * (dt / 1000);
        p.x += (p.vx * dt) / 1000 + sway;
        p.y += (p.vy * dt) / 1000;
        const lifeRatio = p.life / p.maxLife;
        const a = p.alpha * (lifeRatio < .15 ? lifeRatio / .15 : 1 - (lifeRatio - .15) / .85);
        ctx.globalAlpha = Math.max(0, a);
        const s = p.size;
        ctx.drawImage(sprite, p.x - s/2, p.y - s/2, s, s);
      }
      ctx.globalAlpha = 1;
      if (alive) { raf = requestAnimationFrame(step); }
      else {
        canvas.style.opacity = '0'; ctx.clearRect(0, 0, cw, ch);
        cancelAnimationFrame(raf);
        onDone && onDone();
      }
    };
    raf = requestAnimationFrame(step);
    // safety net in case a particle math edge case keeps `alive` true forever
    setTimeout(() => { if (raf) cancelAnimationFrame(raf); canvas.style.opacity = '0'; onDone && onDone(); }, Math.max(1800, ...particles.map(p=>p.maxLife)) + 200);
  }

  /* simple, permissive "email or phone" check — this register's field accepts either */
  function isValidContact(v) {
    v = (v || '').trim();
    if (!v) return false;
    if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return true;
    const digits = v.replace(/[^0-9]/g, '');
    return /^[0-9+()\s.-]{6,}$/.test(v) && digits.length >= 6;
  }

  /* 2d. signup form: reveal the field on CTA click, submit with a quiet confirm state */
  function signup() {
    const ctaRow = document.querySelector('.cta-row');
    const cta = document.querySelector('.cta-btn');
    const form = document.querySelector('.signup');
    if (cta && form) {
      cta.addEventListener('click', () => {
        ctaRow.classList.add('is-open');
        form.hidden = false;
        form.querySelector('input')?.focus();
      });
    }
    if (!form) return;
    form.addEventListener('submit', e => {
      e.preventDefault();
      const field = form.querySelector('.signup-field');
      const input = form.querySelector('input');
      const btn = form.querySelector('.signup-submit');
      const status = form.querySelector('.signup-status');
      if (input && !input.checkValidity()) { input.reportValidity(); return; }
      field?.classList.add('is-confirming');
      if (btn) btn.disabled = true;
      if (status) { status.textContent = 'Inscription en cours…'; status.classList.remove('is-ok'); }
      setTimeout(() => {
        if (status) { status.textContent = 'Vous êtes inscrit·e. À bientôt au Phantom.'; status.classList.add('is-ok'); }
        if (input) input.value = '';
        if (btn) btn.disabled = false;
      }, 700);
    });
  }

  function init() {
    floodOrigin(); arrowSwap(); pillRotations(); heroReveal(); dropPills(); signup();
  }
  window.FederMotion = { dropPills, dissolveButton, isValidContact };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
