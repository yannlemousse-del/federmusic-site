/* Feder · inscription à la newsletter
   Envoie prénom / nom / email au Web App Google Apps Script, qui écrit dans le Sheet.
   Le comportement du bouton vient de feder-ui (motion.js) :
   - envoi invalide : le champ fautif tremble + une ligne de message (pas de bulle native) ;
   - envoi valide   : le bouton part en poussière (FederMotion.dissolveButton), puis confirmation. */
(() => {
  const cfg = window.FEDER_CONFIG || {};
  const form = document.querySelector('.waitlist');
  if (!form) return;

  const btn = form.querySelector('.waitlist-submit');
  const status = form.querySelector('.waitlist-status');
  const motion = window.FederMotion || {};

  const isLocal = ['localhost', '127.0.0.1', ''].includes(location.hostname);
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const say = (msg, kind) => {
    status.textContent = msg;
    status.classList.toggle('is-ok', kind === 'ok');
    status.classList.toggle('is-error', kind === 'error');
  };

  /* ---------- envoi au Google Sheet ---------- */
  async function send(payload) {
    if (!cfg.signupEndpoint) {
      if (isLocal) {                       // démo locale : on simule
        console.warn('[feder] signupEndpoint vide — inscription simulée, rien n\'est enregistré.', payload);
        await new Promise(r => setTimeout(r, 650));
        return { ok: true };
      }
      throw new Error('endpoint manquant');
    }
    // Pas de header personnalisé → requête « simple », pas de préflight CORS avec Apps Script.
    const res = await fetch(cfg.signupEndpoint, {
      method: 'POST',
      body: new URLSearchParams(payload)
    });
    return res.json();
  }

  /* ---------- validation : premier champ fautif -> secousse + message ---------- */
  function firstProblem(data) {
    if (!String(data.get('prenom')).trim()) return [form.prenom, 'Entre ton prénom.'];
    if (!String(data.get('nom')).trim()) return [form.nom, 'Entre ton nom.'];
    if (!EMAIL_RE.test(String(data.get('email')).trim())) return [form.email, 'Entre un email valide.'];
    if (!form.consent.checked) return [form.consent, 'Coche la case pour recevoir la newsletter.'];
    return null;
  }

  function shake(el) {
    el.classList.remove('is-invalid');
    void el.offsetWidth;                   // relance l'animation si elle est déjà en cours
    el.classList.add('is-invalid');
    el.focus();
  }
  form.addEventListener('animationend', e => {
    if (e.animationName === 'field-shake') e.target.classList.remove('is-invalid');
  });

  /* ---------- soumission ---------- */
  form.addEventListener('submit', e => {
    e.preventDefault();
    const data = new FormData(form);

    // honeypot rempli = bot : on fait semblant que tout va bien
    if (data.get('website')) { say('Tu es sur la liste. À bientôt.', 'ok'); return; }

    const problem = firstProblem(data);
    if (problem) { shake(problem[0]); say(problem[1], 'error'); return; }

    const payload = {
      prenom: String(data.get('prenom')).trim(),
      nom: String(data.get('nom')).trim(),
      email: String(data.get('email')).trim().toLowerCase(),
      consent: 'oui',
      source: cfg.source || 'site',
      page: location.pathname
    };

    btn.disabled = true;
    say('');
    // la requête part en même temps que l'animation ; on attend les deux avant de conclure
    const request = send(payload).then(out => ({ out }), err => ({ err }));

    let finished = false;                  // dissolveButton peut appeler onDone deux fois
    const finish = async () => {
      if (finished) return;
      finished = true;
      say('Enregistrement…');
      const { out, err } = await request;
      btn.classList.remove('is-dissolving'); // le bouton revient : un second envoi reste possible
      btn.disabled = false;
      if (err || !out || !out.ok) {
        console.error('[feder] inscription échouée', err || out);
        say('Une erreur est survenue. Réessaie dans un instant.', 'error');
        return;
      }
      say(out.duplicate ? 'Tu es déjà sur la liste. À bientôt.' : 'Tu es sur la liste. À bientôt.', 'ok');
      form.reset();
    };

    if (motion.dissolveButton) motion.dissolveButton(btn, { onDone: finish });
    else finish();
  });
})();
