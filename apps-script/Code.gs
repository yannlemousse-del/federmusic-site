/**
 * Feder · inscription newsletter → Google Sheet + mail de bienvenue
 *
 * Projet Apps Script propriétaire : Federation.fam.music@gmail.com
 * (le script s'exécute avec ce compte : les mails partent de cette adresse et le Sheet lui appartient).
 * Déploiement : application Web, « Exécuter en tant que : moi », « Accès : tout le monde ».
 *
 * Le site envoie un POST (prenom, nom, email, consent, source, page).
 * Le script valide, dédoublonne sur l'email, ajoute une ligne, puis envoie le mail de bienvenue.
 * Un échec d'envoi de mail n'empêche jamais l'inscription.
 *
 * Fichier généré : ne pas modifier Code.gs à la main — éditer Code.template.gs et welcome-email.html
 * puis relancer  node apps-script/build-code.js  (voir README).
 */

const SHEET_ID = '1C3I5ttV_CF9n6BE_9oOEAF48eA4UBbRnOOuf__PbBd0';
const SHEET_NAME = 'Inscrits';
const HEADERS = ['Date', 'Prénom', 'Nom', 'Email', 'Consentement', 'Source', 'Page', 'Statut', 'Mail', 'Laylo'];
const COL_MAIL = 9, COL_LAYLO = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// --- Laylo : la liste d'envoi. La clé API est dans Paramètres du projet > Propriétés du script > LAYLO_API_KEY (jamais dans le code) ---
const LAYLO_URL = 'https://laylo.com/api/graphql';
const TEST_LAYLO_EMAIL = 'yannlemousse+laylo@gmail.com';

// --- mail de bienvenue ---
const MAIL_NAME = 'FEDERATION';
const MAIL_REPLY_TO = 'Federation.fam.music@gmail.com';
const MAIL_SUBJECT = "Welcome to the fam' — FEDERATION";
const MAIL_LOGO_URL = 'https://federmusic.com/assets/img/mail-logo.png';
const MAIL_MAX_PER_HOUR = 30;   // garde-fou : personne ne peut faire partir des centaines de mails d'un coup
const TEST_RECIPIENT = 'yannlemousse@gmail.com';

const MAIL_TEXT = [
  "WELCOME TO THE FAM'.",
  '',
  'Tu fais maintenant partie de FEDERATION.',
  '',
  'SAVE THE DATE',
  '16 JANVIER 2027',
  'FEDER x PHANTOM PARIS',
  '',
  'À partir de maintenant, tu passes avant les autres.',
  '',
  'Accès anticipés.',
  'Tickets prioritaires.',
  'Invitations.',
  'Surprises.',
  '',
  "Certaines choses ne seront annoncées qu'ici.",
  '',
  'Stay close.',
  '',
  '--',
  "Tu reçois cet email car tu t'es inscrit(e) sur federmusic.com.",
  'Pour te désinscrire, réponds simplement « STOP » à ce mail.',
  'Artiworks · 44 rue Catherine de la Rochefoucauld · 75009 Paris'
].join('\n');

const MAIL_HTML = `<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>Welcome to the fam'</title>
<style>
  body{margin:0;padding:0;background:#000000;-webkit-text-size-adjust:100%}
  a{color:#ffffff}
  @media only screen and (max-width:620px){
    .wrap{width:100%!important}
    .pad{padding-left:22px!important;padding-right:22px!important}
    .h1{font-size:30px!important;line-height:34px!important}
    .date{font-size:32px!important;line-height:36px!important}
    .big{font-size:19px!important}
  }
</style>
</head>
<body style="margin:0;padding:0;background:#000000;">
<!-- texte d'aperçu (visible dans la liste des mails, invisible dans le mail) -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#000000;font-size:1px;line-height:1px;">
  Tu passes avant les autres. Save the date : 16 janvier 2027, FEDER x PHANTOM PARIS.
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#000000" style="background:#000000;">
<tr><td align="center" style="padding:0;">

  <table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#000000" style="width:600px;max-width:600px;background:#000000;">

    <!-- logo -->
    <tr><td align="center" class="pad" style="padding:38px 30px 6px 30px;">
      <img src="{{LOGO_URL}}" width="540" alt="FEDERATION" style="display:block;width:100%;max-width:540px;height:auto;border:0;outline:none;text-decoration:none;">
    </td></tr>

    <!-- titre -->
    <tr><td align="center" class="pad" style="padding:34px 30px 0 30px;">
      <h1 class="h1" style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:38px;line-height:42px;font-weight:800;letter-spacing:-0.5px;text-transform:uppercase;color:#ffffff;">Welcome to the fam&rsquo;.</h1>
    </td></tr>
    <tr><td align="center" class="pad" style="padding:18px 30px 0 30px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:15px;line-height:24px;color:#e6e6e6;">
      Tu fais maintenant partie de FEDERATION.
    </td></tr>

    <!-- filet -->
    <tr><td align="center" style="padding:44px 30px 0 30px;"><table role="presentation" width="40" cellpadding="0" cellspacing="0" border="0"><tr><td height="1" style="height:1px;line-height:1px;font-size:1px;background:#3a3a3a;">&nbsp;</td></tr></table></td></tr>

    <!-- save the date -->
    <tr><td align="center" class="pad" style="padding:38px 30px 0 30px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;line-height:16px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:#ffffff;">
      Save the date
    </td></tr>
    <tr><td align="center" class="pad" style="padding:14px 30px 0 30px;">
      <div class="date" style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:38px;line-height:42px;font-weight:800;letter-spacing:-0.5px;text-transform:uppercase;color:#ffffff;">16 janvier 2027</div>
    </td></tr>
    <tr><td align="center" class="pad" style="padding:12px 30px 0 30px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;line-height:18px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#ffffff;">
      Feder <span style="text-transform:none;">x</span> Phantom Paris
    </td></tr>

    <!-- filet -->
    <tr><td align="center" style="padding:44px 30px 0 30px;"><table role="presentation" width="40" cellpadding="0" cellspacing="0" border="0"><tr><td height="1" style="height:1px;line-height:1px;font-size:1px;background:#3a3a3a;">&nbsp;</td></tr></table></td></tr>

    <!-- avantages -->
    <tr><td align="center" class="pad" style="padding:38px 30px 0 30px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:15px;line-height:24px;color:#e6e6e6;">
      &Agrave; partir de maintenant, tu passes avant les autres.
    </td></tr>
    <tr><td align="center" class="pad" style="padding:30px 30px 0 30px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:21px;line-height:40px;font-weight:700;color:#ffffff;">
      <span class="big">Acc&egrave;s anticip&eacute;s.</span><br>
      <span class="big">Tickets prioritaires.</span><br>
      <span class="big">Invitations.</span><br>
      <span class="big">Surprises.</span>
    </td></tr>

    <tr><td align="center" class="pad" style="padding:36px 30px 0 30px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:15px;line-height:24px;color:#e6e6e6;">
      Certaines choses ne seront annonc&eacute;es qu&rsquo;ici.
    </td></tr>

    <!-- signature -->
    <tr><td align="center" class="pad" style="padding:38px 30px 0 30px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:21px;line-height:28px;font-weight:700;color:#ffffff;">
      Stay close.
    </td></tr>
    <tr><td align="center" style="padding:14px 30px 0 30px;"><table role="presentation" width="28" cellpadding="0" cellspacing="0" border="0"><tr><td height="2" style="height:2px;line-height:2px;font-size:1px;background:#2eff00;">&nbsp;</td></tr></table></td></tr>

    <!-- pied de page -->
    <tr><td align="center" class="pad" style="padding:64px 30px 44px 30px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;line-height:18px;color:#8a8a8a;">
      Tu re&ccedil;ois cet email car tu t&rsquo;es inscrit(e) sur <a href="https://federmusic.com" style="color:#b5b5b5;text-decoration:underline;">federmusic.com</a>.<br>
      Pour te d&eacute;sinscrire, r&eacute;ponds simplement &laquo;&nbsp;STOP&nbsp;&raquo; &agrave; ce mail.<br><br>
      Artiworks &middot; 44 rue Catherine de la Rochefoucauld &middot; 75009 Paris
    </td></tr>

  </table>

</td></tr>
</table>
</body>
</html>
`;

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000); // évite deux écritures simultanées sur la même ligne

    const p = (e && e.parameter) || {};
    const prenom = clean_(p.prenom, 80);
    const nom = clean_(p.nom, 80);
    const email = clean_(p.email, 160).toLowerCase();

    if (!prenom || !nom) return json_({ ok: false, error: 'nom_manquant' });
    if (!EMAIL_RE.test(email)) return json_({ ok: false, error: 'email_invalide' });
    if (p.consent !== 'oui') return json_({ ok: false, error: 'consentement_manquant' });

    const sheet = getSheet_();

    // Déjà inscrit ? (colonne Email = D) -> pas de nouvelle ligne, pas de nouveau mail
    const last = sheet.getLastRow();
    if (last > 1) {
      const emails = sheet.getRange(2, 4, last - 1, 1).getValues().flat();
      if (emails.some(v => String(v).toLowerCase() === email)) {
        return json_({ ok: true, duplicate: true });
      }
    }

    sheet.appendRow([
      new Date(),
      prenom,
      nom,
      email,
      'oui',
      clean_(p.source, 60),
      clean_(p.page, 120),
      'abonné',
      '',
      ''
    ]);
    const row = sheet.getLastRow();

    // Laylo puis mail de bienvenue : jamais bloquants pour l'inscription ; le résultat de chacun est noté dans le Sheet
    const laylo = subscribeLaylo_(email);
    const mail = sendWelcome_(email);
    sheet.getRange(row, COL_MAIL).setValue(mail);
    sheet.getRange(row, COL_LAYLO).setValue(laylo);

    return json_({ ok: true, mail: mail, laylo: laylo });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'serveur' });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

/** Ouvrir l'URL /exec dans un navigateur : simple test que le déploiement répond. */
function doGet() {
  return json_({ ok: true, service: 'feder-newsletter' });
}

/** Inscrit l'email dans la liste Laylo. Retourne 'ok', 'non configuré', 'erreur 401' (clé refusée)… La clé n'est jamais écrite dans les journaux. */
function subscribeLaylo_(email) {
  const key = PropertiesService.getScriptProperties().getProperty('LAYLO_API_KEY');
  if (!key) return 'non configuré';
  try {
    const res = UrlFetchApp.fetch(LAYLO_URL, {
      method: 'post',
      contentType: 'application/json',
      muteHttpExceptions: true,
      headers: { Authorization: 'Bearer ' + String(key).trim() },
      payload: JSON.stringify({
        query: 'mutation($email: String) { subscribeToUser(email: $email) }',
        variables: { email: email }
      })
    });
    const code = res.getResponseCode();
    const body = res.getContentText();
    let j = {};
    try { j = JSON.parse(body); } catch (_) {}
    if (code === 200 && !j.errors && j.data && j.data.subscribeToUser !== false && j.data.subscribeToUser != null) return 'ok';
    console.error('laylo', code, body.slice(0, 300));
    return 'erreur ' + code;
  } catch (err) {
    console.error('laylo', err);
    return 'erreur';
  }
}

/** À lancer À LA MAIN : inscrit une adresse de test dans Laylo et affiche le résultat dans le journal d'exécution. */
function testLaylo() {
  const r = subscribeLaylo_(TEST_LAYLO_EMAIL);
  console.log('Test Laylo vers ' + TEST_LAYLO_EMAIL + ' : ' + r);
  return r;
}

/** À lancer À LA MAIN : retente Laylo pour les lignes du Sheet dont la colonne « Laylo » commence par « erreur ». */
function resyncLaylo() {
  const sheet = getSheet_();
  const last = sheet.getLastRow();
  if (last < 2) return;
  const rows = sheet.getRange(2, 1, last - 1, COL_LAYLO).getValues();
  rows.forEach((r, i) => {
    if (String(r[COL_LAYLO - 1] || '').indexOf('erreur') === 0) {
      sheet.getRange(i + 2, COL_LAYLO).setValue(subscribeLaylo_(String(r[3])));
    }
  });
}

/** Envoie le mail de bienvenue. Retourne 'envoyé', 'limite', 'quota' ou 'erreur'. */
function sendWelcome_(to) {
  try {
    if (MailApp.getRemainingDailyQuota() < 1) return 'quota';

    const props = PropertiesService.getScriptProperties();
    const hour = Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyyMMddHH');
    let st = {};
    try { st = JSON.parse(props.getProperty('mailhour') || '{}'); } catch (_) {}
    if (st.h !== hour) st = { h: hour, n: 0 };
    if (st.n >= MAIL_MAX_PER_HOUR) return 'limite';
    st.n++;
    props.setProperty('mailhour', JSON.stringify(st));

    MailApp.sendEmail({
      to: to,
      subject: MAIL_SUBJECT,
      body: MAIL_TEXT,
      htmlBody: MAIL_HTML.replace('{{LOGO_URL}}', MAIL_LOGO_URL),
      name: MAIL_NAME,
      replyTo: MAIL_REPLY_TO
    });
    return 'envoyé';
  } catch (err) {
    console.error('mail', err);
    return 'erreur';
  }
}

/** À lancer À LA MAIN depuis l'éditeur (bouton Exécuter) pour recevoir un exemple du mail. */
function testWelcome() {
  const r = sendWelcome_(TEST_RECIPIENT);
  console.log('Mail de test vers ' + TEST_RECIPIENT + ' : ' + r);
  return r;
}

function getSheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    const first = ss.getSheets()[0];
    // Sheet neuf : on renomme l'onglet vide par défaut plutôt que d'en ajouter un second
    if (ss.getSheets().length === 1 && first.getLastRow() === 0) { first.setName(SHEET_NAME); sheet = first; }
    else sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  } else if (!sheet.getRange(1, COL_LAYLO).getValue()) {
    // Sheet créé avant Laylo : on ajoute la colonne manquante
    sheet.getRange(1, COL_LAYLO).setValue(HEADERS[COL_LAYLO - 1]).setFontWeight('bold');
  }
  return sheet;
}

/** Tronque et neutralise l'injection de formules (=, +, -, @ en début de cellule). */
function clean_(v, max) {
  let s = String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
