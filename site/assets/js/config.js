/* Configuration du site — seul fichier à éditer après le déploiement Apps Script.
   Voir README.md, étape « Google Sheet ». */
window.FEDER_CONFIG = {
  /* URL du Web App Google Apps Script (se termine par /exec).
     Tant qu'elle est vide, le formulaire fonctionne en mode démo sur localhost
     (rien n'est enregistré) et affiche une erreur en production. */
  signupEndpoint: "https://script.google.com/macros/s/AKfycbwxD3CidC1a7aUOTWHXC3RL8KeaH5E6KKCwO6nEjPwo5YBdPksbkfGOl0LIC28sdwzdsw/exec",

  /* Identifie d'où vient l'inscription dans la colonne « Source » du Sheet. */
  source: "site-feder"
};
