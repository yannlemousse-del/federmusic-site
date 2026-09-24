/* Feder · fond vidéo en boucle sans à-coup
   Les attributs autoplay / muted / loop / playsinline sont dans le HTML : sans JS,
   la vidéo tourne quand même (avec la boucle native du navigateur).

   Avec JS, on supprime le « saut » de fin de boucle : une seconde copie de la vidéo
   démarre par-dessus quelques instants avant la fin de la première et apparaît en
   fondu (FADE secondes). Quand le fondu est fini, la première se remet au début et
   attend son tour. La boucle native reste activée en filet de sécurité.

   S'occupe aussi de :
   - relancer la lecture si le navigateur l'a bloquée (économie d'énergie iPhone…)
     dès le premier geste de l'utilisateur ;
   - laisser la vidéo à l'arrêt si l'utilisateur a demandé moins d'animations. */
(() => {
  const FADE = 1.4;                     // durée du fondu enchaîné, en secondes

  const a = document.querySelector('.bg-video');
  if (!a) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  a.muted = true;                       // certains navigateurs ignorent l'attribut HTML seul

  /* seconde copie, cachée, prête à prendre le relais */
  const b = a.cloneNode(true);
  b.removeAttribute('autoplay');
  b.muted = true;
  b.style.opacity = '0';
  a.after(b);

  let cur = a, nxt = b, fading = false;

  const play = el => el.play().catch(() => {});

  function begin() {
    fading = true;
    nxt.currentTime = 0;
    nxt.classList.add('is-top');
    nxt.style.transition = 'none';
    nxt.style.opacity = '0';
    nxt.play().then(() => {
      // le fondu ne démarre qu'une fois la seconde copie réellement en lecture
      nxt.style.transition = `opacity ${FADE}s linear`;
      nxt.style.opacity = '1';
    }).catch(() => { abort(); });
  }

  function abort() {
    fading = false;
    nxt.pause();
    nxt.classList.remove('is-top');
    nxt.style.transition = 'none';
    nxt.style.opacity = '0';
  }

  function finish() {
    cur.pause();
    cur.style.transition = 'none';
    cur.style.opacity = '0';
    cur.currentTime = 0;                // prête pour le prochain tour
    nxt.classList.remove('is-top');
    [cur, nxt] = [nxt, cur];
    fading = false;
  }

  function tick() {
    if (reduced.matches || document.hidden || !cur.duration || cur.paused) return;
    if (!fading) {
      if (cur.currentTime >= cur.duration - FADE) begin();
    } else if (nxt.paused && nxt.currentTime === 0 && cur.currentTime > cur.duration - 0.05) {
      abort();                          // la seconde copie n'a pas démarré : la boucle native prend le relais
    } else if (nxt.currentTime >= FADE) {
      finish();
    }
  }
  setInterval(tick, 50);

  const start = () => { if (!reduced.matches) { play(cur); if (fading) play(nxt); } };
  const sync = () => {
    if (reduced.matches) { a.pause(); b.pause(); return; }
    start();
  };

  sync();
  reduced.addEventListener?.('change', sync);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && cur.paused) sync(); });

  if (!reduced.matches) {
    const retry = () => {
      if (cur.paused) start();
      ['touchstart', 'pointerdown', 'keydown'].forEach(t => removeEventListener(t, retry));
    };
    ['touchstart', 'pointerdown', 'keydown'].forEach(t => addEventListener(t, retry, { passive: true }));
  }
})();
