# Guide — Gérer le « Matériel en vedette »

Ce site comprend un petit espace d'administration (`/admin`) qui permet d'ajouter,
modifier et retirer le matériel affiché, **sans toucher au code**, avec upload de photo.

---

## 1. Vérifier que l'hébergeur supporte PHP (1 minute)

L'espace d'administration fonctionne en **PHP** (inclus chez OVH, Hostinger, o2switch,
Ionos, cPanel… c'est-à-dire la quasi-totalité des hébergeurs mutualisés).

Pour vérifier : créez un fichier `test.php` contenant `<?php phpinfo();` , envoyez-le
sur l'hébergeur, ouvrez `votresite.com/test.php`. Si une page d'informations PHP
s'affiche → c'est bon (supprimez ensuite ce fichier). Si le code s'affiche tel quel
ou se télécharge → PHP n'est pas actif (contactez l'hébergeur, ou utilisez la
solution Airtable).

---

## 2. Mettre le site en ligne (FTP)

1. Connectez-vous à l'hébergeur en FTP (FileZilla par ex.).
2. Envoyez **tout le contenu** du dossier `sarl-mcc-site/` dans le dossier public
   (souvent `www/`, `public_html/` ou `htdocs/`).
3. Vérifiez que ces deux dossiers existent et sont **accessibles en écriture**
   (droits 755 ou 775) — l'administration y enregistre les données et les photos :
   - `data/`
   - `assets/produits/`
   Dans FileZilla : clic droit sur le dossier → « Droits d'accès au fichier » → 775.

---

## 3. Choisir le mot de passe (une seule fois)

Ouvrez le fichier `admin/config.php` et remplacez le mot de passe par défaut :

```php
const ADMIN_PASSWORD = 'votre-mot-de-passe-personnel';
```

Gardez les guillemets. Choisissez un mot de passe long. Enregistrez, ré-envoyez le
fichier par FTP. **C'est la seule ligne à modifier.**

---

## 4. Utiliser l'administration (au quotidien)

1. Allez sur **`votresite.com/admin`**.
2. Entrez le mot de passe.
3. Pour **ajouter** un matériel : remplissez le formulaire (nom, référence, prix,
   état, description courte), **glissez une photo**, cliquez **« Ajouter et publier »**.
   → il apparaît immédiatement sur le site.
4. Pour **modifier** : bouton « Modifier » sur la ligne du matériel.
5. Quand un matériel est **vendu** :
   - soit vous passez son état sur **« Vendu »** (il reste affiché avec une étiquette grise),
   - soit vous cliquez **« Supprimer »** pour l'enlever complètement.

C'est tout. Aucune compétence technique nécessaire après la mise en ligne.

---

## Notes techniques (pour l'agence)

- Les données sont stockées dans `data/produits.json` (écrit par l'admin).
- Les photos uploadées vont dans `assets/produits/`.
- La page d'accueil lit `data/produits.json` côté navigateur et reconstruit la
  section « Matériel en vedette ». Si le fichier est absent, les cartes d'exemple
  du HTML restent affichées (filet de sécurité).
- Sécurité : connexion par mot de passe + jeton anti-CSRF, validation des images
  (type/taille), noms de fichiers nettoyés. Pour aller plus loin, protégez aussi
  `/admin` par un `.htaccess` (authentification du serveur) si l'hébergeur le permet.
- L'espace `/admin` ne fonctionne **pas** dans un aperçu local sans PHP ; il faut un
  hébergeur PHP (ou MAMP/XAMPP en local pour tester).
