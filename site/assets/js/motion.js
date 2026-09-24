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
  window.FederMotion = { dropPills };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
