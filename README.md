# Site Feder

Site one-page (thème **feder-ui**, carte monochrome) avec inscription à la newsletter (prénom, nom, email) stockée dans un Google Sheet.
Site 100 % statique : aucun serveur à gérer. En ligne sur **https://federmusic.com** (GitHub Pages).

## Arborescence

```
feder-site/
├── README.md
├── .github/workflows/pages.yml   publie le dossier site/ à chaque push sur main
├── apps-script/
│   └── Code.gs                   script Google Apps Script (non publié sur le site)
└── site/                         ← tout ce qui est en ligne
    ├── index.html                page unique (carte : nom, date, formulaire)
    ├── mentions-legales.html     à compléter (repérer les [...] en pointillés)
    ├── confidentialite.html      à compléter
    ├── 404.html                  page d'erreur
    ├── robots.txt · sitemap.xml · CNAME (federmusic.com)
    └── assets/
        ├── css/
        │   ├── tokens.css        thème feder-ui (inchangé)
        │   ├── motion.css        animations feder-ui (inchangé)
        │   └── style.css         ajouts : champs prénom/nom, consentement, pages légales, 404
        ├── js/
        │   ├── config.js         ← URL du Google Sheet (seul fichier à éditer)
        │   ├── motion.js         animations feder-ui (inchangé)
        │   ├── background.js     fond vidéo : fondu de fin de boucle, relance, reduced-motion
        │   └── main.js           envoi du formulaire vers Google Sheets
        ├── img/logo.png          logo Feder (blanc, fond transparent) + favicon.png
        └── video/background.mp4  fond vidéo en boucle (1080x1920, 8 s, ~4,8 Mo)
```

## Tester en local

```bash
npx serve site
```

Puis ouvrir http://localhost:3000. (Le fichier `site/index.html` s'ouvre aussi directement.)

Tant que `signupEndpoint` est vide dans `assets/js/config.js`, le formulaire est en **mode démo sur localhost** : il simule l'envoi et n'enregistre rien.

## Brancher le Google Sheet

> **État actuel : déjà branché.** Le Sheet « Feder - Newsletter » reçoit les inscriptions via le script Apps Script « Feder Newsletter », déployé en application Web (exécuté en tant que le propriétaire du Sheet, accès « Tout le monde »). L'URL du déploiement est déjà dans `site/assets/js/config.js`. Les étapes ci-dessous servent à refaire l'opération ailleurs (autre compte, autre Sheet).

1. Créer un Google Sheet vide (ex. « Feder – Newsletter »).
2. **Extensions → Apps Script**. Supprimer le contenu, coller [`apps-script/Code.gs`](apps-script/Code.gs), enregistrer.
3. **Déployer → Nouveau déploiement → type « Application Web »** :
   - Exécuter en tant que : **Moi**
   - Qui a accès : **Tout le monde**
4. Autoriser l'accès au Sheet quand Google le demande, puis copier l'**URL de l'application Web** (finit par `/exec`).
5. La coller dans `assets/js/config.js` (`signupEndpoint`).
6. Ouvrir l'URL `/exec` dans un navigateur : elle doit répondre `{"ok":true,"service":"feder-newsletter"}`.
7. Remplir le formulaire sur le site : une ligne apparaît dans l'onglet **Inscrits** (créé automatiquement avec ses en-têtes).

Colonnes : Date · Prénom · Nom · Email · Consentement · Source · Page · Statut.

> Si le code du script change plus tard : **Déployer → Gérer les déploiements → modifier → Nouvelle version**. L'URL reste la même.

Le script refuse les emails invalides, ignore les doublons (même email) et neutralise les injections de formules Google Sheets. Le formulaire contient aussi un champ anti-bot invisible.

## Avant la mise en ligne

- [ ] Compléter `site/mentions-legales.html` et `site/confidentialite.html` (repérer les `[…]` soulignés en pointillés).
- [ ] Vérifier le contenu de l'événement dans `site/index.html` (date, lieu, textes : ce sont ceux de l'exemple du skill).
- [ ] Ajouter une image de partage `og:image` (1200×630) dans `site/index.html`.
- [x] `signupEndpoint` renseigné dans `config.js` (Sheet branché et testé).
- [x] Domaine : `canonical`, `og:url`, `sitemap.xml`, `robots.txt` et `CNAME` pointent sur federmusic.com.

## Hébergement et domaine

Hébergé sur **GitHub Pages**. Chaque `git push` sur `main` republie le contenu de `site/` (workflow `.github/workflows/pages.yml`, onglet *Actions* du dépôt).

DNS chez GoDaddy (zone `federmusic.com`) :

| Type | Nom | Valeur |
|---|---|---|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| CNAME | `www` | `<compte-github>.github.io` |

Une fois le DNS propagé, activer *Enforce HTTPS* dans *Settings → Pages* du dépôt (le certificat est généré automatiquement par GitHub).

## Envoyer la newsletter

Le Sheet sert de base de contacts. Pour envoyer, on peut exporter la colonne Email vers un outil d'emailing (Brevo, Mailchimp…) ou brancher un envoi depuis Apps Script. La colonne **Statut** sert à marquer les désinscrits (`désinscrit`) pour les exclure des envois. Chaque email envoyé devra contenir un lien de désinscription.

## Fond vidéo

`assets/video/background.mp4` est lue en boucle derrière la carte (`<video>` dans `index.html`) avec :

- `muted` : sans le son, sinon le téléphone bloque le démarrage automatique ;
- `loop` : elle repart en continu ;
- `autoplay` : elle se lance dès l'ouverture de la page ;
- `playsinline` : sur iPhone, elle ne s'ouvre pas en plein écran.

**Boucle sans à-coup :** `background.js` lance une seconde copie de la vidéo 1,4 s avant la fin de la première et la fait apparaître en fondu enchaîné (constante `FADE` en haut du fichier). La boucle native (`loop`) reste active en filet de sécurité, et sans JavaScript la vidéo tourne quand même. Pour une boucle parfaitement propre, on peut aussi exporter la vidéo avec un début et une fin identiques.

Pour changer de vidéo, remplacer le fichier en gardant le même nom (idéalement < 5 Mo, en H.264/MP4). Un voile sombre (`.bg-scrim` dans `style.css`, opacité 0.5) garde le texte lisible : l'ajuster si la nouvelle vidéo est plus claire ou plus sombre. Si le visiteur a demandé « moins d'animations » sur son appareil, la vidéo reste sur sa première image.
