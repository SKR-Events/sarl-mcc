<?php
/* =========================================================
   CONFIGURATION DE L'ESPACE D'ADMINISTRATION — SARL MCC
   =========================================================

   >>> SEULE LIGNE À MODIFIER : le mot de passe ci-dessous. <<<
   Choisissez un mot de passe long et personnel, gardez les guillemets.
*/

const ADMIN_PASSWORD = 'sarlmcc-2026-a-changer';

/* --- Ne touchez pas au reste --- */
const DATA_FILE  = __DIR__ . '/../data/produits.json';
const DATA_JS    = __DIR__ . '/../data/produits.js'; // version chargée par les pages (file:// compatible)
const UPLOAD_DIR = __DIR__ . '/../assets/produits';
const UPLOAD_URL = 'assets/produits'; // chemin public (relatif à la racine du site)
const MAX_UPLOAD = 6 * 1024 * 1024;   // taille max d'une photo : 6 Mo
