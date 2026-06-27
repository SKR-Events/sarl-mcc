# SARL MCC — Site vitrine

Site vitrine pour **SARL MCC**, revendeur exclusif de la gamme **La Littorale** sur l'Est de la France
et spécialiste du matériel agricole d'occasion (Sainte-Ménehould, Marne).

## Aperçu

- **Page d'accueil** : présentation, matériel en vedette, équipe, contact.
- **Page Catalogue** (`produits.html`) : tout le matériel, filtres par famille, pagination.
- **Panier de devis** : le visiteur ajoute du matériel, puis envoie une demande groupée.
- **Espace d'administration** (`/admin`, PHP) : le client ajoute / modifie / retire son matériel
  sans toucher au code (voir `GUIDE-ADMIN.md`).

## Stack

HTML / CSS / JavaScript natif (aucun build). Données produits dans `data/produits.js`
(régénéré par l'espace d'administration PHP).

## Démo en ligne

Hébergée sur **GitHub Pages** (vitrine statique). L'espace `/admin` nécessite un hébergeur
**PHP** pour fonctionner (OVH, Hostinger, o2switch…) ; voir `GUIDE-ADMIN.md`.

## À personnaliser avant production

- Remplacer les photos par celles du client (sans filigrane).
- Brancher le formulaire (identifiant Formspree) ou un script d'envoi.
- Renseigner le vrai numéro de téléphone et l'e-mail.
- Définir le mot de passe de `/admin` dans `admin/config.php`.

---
Réalisé par SKR-Events.
