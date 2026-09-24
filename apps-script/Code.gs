/**
 * Feder · inscription newsletter → Google Sheet
 *
 * À coller dans l'éditeur Apps Script rattaché au Google Sheet
 * (Extensions → Apps Script). Voir README.md pour le pas-à-pas.
 *
 * Le site envoie un POST (prenom, nom, email, consent, source, page).
 * Le script valide, dédoublonne sur l'email et ajoute une ligne.
 */

const SHEET_NAME = 'Inscrits';
const HEADERS = ['Date', 'Prénom', 'Nom', 'Email', 'Consentement', 'Source', 'Page', 'Statut'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // évite deux écritures simultanées sur la même ligne

    const p = (e && e.parameter) || {};
    const prenom = clean_(p.prenom, 80);
    const nom = clean_(p.nom, 80);
    const email = clean_(p.email, 160).toLowerCase();

    if (!prenom || !nom) return json_({ ok: false, error: 'nom_manquant' });
    if (!EMAIL_RE.test(email)) return json_({ ok: false, error: 'email_invalide' });
    if (p.consent !== 'oui') return json_({ ok: false, error: 'consentement_manquant' });

    const sheet = getSheet_();

    // Déjà inscrit ? (colonne Email = D)
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
      'abonné'
    ]);
    return json_({ ok: true });
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

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
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
