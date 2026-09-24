/* Feder · inscription à la newsletter
   Envoie prénom / nom / email au Web App Google Apps Script, qui écrit dans le Sheet. */
(() => {
  const cfg = window.FEDER_CONFIG || {};
  const form = document.querySelector('.waitlist');
  if (!form) return;

  const btn = form.querySelector('.waitlist-submit');
  const status = form.querySelector('.waitlist-status');

  const isLocal = ['localhost', '127.0.0.1', ''].includes(location.hostname);
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const say = (msg, kind) => {
    status.textContent = msg;
    status.classList.toggle('is-ok', kind === 'ok');
    status.classList.toggle('is-error', kind === 'error');
  };

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

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const data = new FormData(form);

    // honeypot rempli = bot : on fait semblant que tout va bien
    if (data.get('website')) { say('Tu es sur la liste. À bientôt.', 'ok'); return; }

    if (!form.checkValidity()) { form.reportValidity(); return; }

    const payload = {
      prenom: String(data.get('prenom')).trim(),
      nom: String(data.get('nom')).trim(),
      email: String(data.get('email')).trim().toLowerCase(),
      consent: 'oui',
      source: cfg.source || 'site',
      page: location.pathname
    };
    if (!EMAIL_RE.test(payload.email)) { say('Adresse email invalide.', 'error'); return; }

    btn.disabled = true;
    say('Enregistrement…');

    try {
      const out = await send(payload);
      if (!out || !out.ok) throw new Error((out && out.error) || 'erreur');
      say(out.duplicate ? 'Tu es déjà sur la liste. À bientôt.' : 'Tu es sur la liste. À bientôt.', 'ok');
      form.reset();
    } catch (err) {
      console.error('[feder] inscription échouée', err);
      say('Une erreur est survenue. Réessaie dans un instant.', 'error');
    } finally {
      btn.disabled = false;
    }
  });
})();
