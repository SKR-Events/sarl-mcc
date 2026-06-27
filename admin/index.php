<?php
/* =========================================================
   ESPACE D'ADMINISTRATION — SARL MCC
   Gestion de la section « Matériel en vedette ».
   Un seul fichier : connexion + liste + ajout/édition + suppression.
   ========================================================= */

session_start();
require __DIR__ . '/config.php';

/* ---------- Utilitaires ---------- */
function load_products() {
    if (!file_exists(DATA_FILE)) return [];
    $raw = file_get_contents(DATA_FILE);
    $data = json_decode($raw, true);
    return (isset($data['produits']) && is_array($data['produits'])) ? $data['produits'] : [];
}
function save_products($produits) {
    $dir = dirname(DATA_FILE);
    if (!is_dir($dir)) @mkdir($dir, 0775, true);
    $json = json_encode(['produits' => array_values($produits)],
        JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $ok = file_put_contents(DATA_FILE, $json) !== false;
    // Régénère aussi la version .js lue par les pages (compatible file://).
    file_put_contents(DATA_JS, 'window.MCC_PRODUITS = ' . $json . ';' . "\n");
    return $ok;
}
function e($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function slugify($s) {
    $s = iconv('UTF-8', 'ASCII//TRANSLIT', $s);
    $s = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '-', $s));
    $s = trim($s, '-');
    return $s !== '' ? $s : 'item';
}
function is_logged_in() { return !empty($_SESSION['mcc_admin']); }
function csrf_token() {
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));
    return $_SESSION['csrf'];
}
function check_csrf() {
    if (empty($_POST['csrf']) || !hash_equals($_SESSION['csrf'] ?? '', $_POST['csrf'])) {
        http_response_code(400); exit('Jeton de sécurité invalide. Rechargez la page.');
    }
}

/* ---------- Déconnexion ---------- */
if (isset($_GET['logout'])) {
    session_destroy();
    header('Location: index.php'); exit;
}

/* ---------- Connexion ---------- */
$login_error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['mot_de_passe'])) {
    if (hash_equals(ADMIN_PASSWORD, (string)$_POST['mot_de_passe'])) {
        $_SESSION['mcc_admin'] = true;
        header('Location: index.php'); exit;
    } else {
        $login_error = 'Mot de passe incorrect.';
    }
}

/* ---------- Actions protégées ---------- */
$flash = '';
if (is_logged_in() && $_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    check_csrf();
    $produits = load_products();

    if ($_POST['action'] === 'delete') {
        $id = $_POST['id'] ?? '';
        foreach ($produits as $k => $p) {
            if ($p['id'] === $id) {
                // Supprime les photos locales associées (pas les URL externes)
                $imgs = (!empty($p['images']) && is_array($p['images'])) ? $p['images']
                       : (!empty($p['image']) ? [$p['image']] : []);
                foreach ($imgs as $im) {
                    if (strpos($im, 'http') !== 0) @unlink(UPLOAD_DIR . '/' . basename($im));
                }
                unset($produits[$k]);
            }
        }
        save_products($produits);
        $flash = 'Matériel supprimé.';
    }
    elseif ($_POST['action'] === 'save') {
        $id   = $_POST['id'] ?? '';
        $nom  = trim($_POST['nom'] ?? '');
        $ref  = trim($_POST['reference'] ?? '');
        $prix = trim($_POST['prix'] ?? '');
        $etat = in_array($_POST['etat'] ?? '', ['neuf','occasion','vendu'], true) ? $_POST['etat'] : 'occasion';
        $cat  = in_array($_POST['categorie'] ?? '', ['tracteurs','moissonneuses','outils','remorques','irrigation','autre'], true) ? $_POST['categorie'] : 'autre';
        $vedette = !empty($_POST['vedette']);
        $desc = trim($_POST['description'] ?? '');

        $errors = [];
        if ($nom === '') $errors[] = 'le nom';
        if ($ref === '') $errors[] = 'la référence';

        // Images existantes (compatible ancien champ "image")
        $images = [];
        if ($id !== '') {
            foreach ($produits as $p) if ($p['id'] === $id) {
                if (!empty($p['images']) && is_array($p['images'])) $images = $p['images'];
                elseif (!empty($p['image'])) $images = [$p['image']];
            }
        }

        // Retrait des photos cochées « Retirer »
        $remove = isset($_POST['remove_images']) && is_array($_POST['remove_images']) ? $_POST['remove_images'] : [];
        if ($remove) {
            $images = array_values(array_filter($images, function ($im) use ($remove) {
                if (in_array($im, $remove, true)) {
                    if (strpos($im, 'http') !== 0) @unlink(UPLOAD_DIR . '/' . basename($im));
                    return false;
                }
                return true;
            }));
        }

        // Nouveaux uploads (plusieurs photos possibles)
        $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
        if (!empty($_FILES['photos']) && is_array($_FILES['photos']['name'])) {
            $count = count($_FILES['photos']['name']);
            for ($i = 0; $i < $count; $i++) {
                if ($_FILES['photos']['error'][$i] !== UPLOAD_ERR_OK) continue;
                if ($_FILES['photos']['size'][$i] > MAX_UPLOAD) { $errors[] = 'des photos de moins de 6 Mo'; continue; }
                $tmp  = $_FILES['photos']['tmp_name'][$i];
                $info = @getimagesize($tmp);
                if (!$info || !isset($allowed[$info['mime']])) { $errors[] = 'des photos au format JPG, PNG ou WEBP'; continue; }
                if (!is_dir(UPLOAD_DIR)) @mkdir(UPLOAD_DIR, 0775, true);
                $name = slugify($ref ?: $nom) . '-' . substr(bin2hex(random_bytes(4)), 0, 6) . '.' . $allowed[$info['mime']];
                if (move_uploaded_file($tmp, UPLOAD_DIR . '/' . $name)) {
                    $images[] = UPLOAD_URL . '/' . $name;
                } else {
                    $errors[] = 'des photos (échec de l\'envoi)';
                }
            }
        }

        if (empty($images)) $errors[] = 'au moins une photo';
        $errors = array_values(array_unique($errors));

        if ($errors) {
            $flash = 'Il manque : ' . implode(', ', $errors) . '.';
            $_SESSION['form_old'] = compact('id','nom','ref','prix','etat','cat','vedette','desc');
        } else {
            $item = [
                'id'          => $id !== '' ? $id : slugify($ref) . '-' . substr(bin2hex(random_bytes(3)), 0, 4),
                'nom'         => $nom,
                'reference'   => $ref,
                'prix'        => $prix !== '' ? $prix : 'Sur demande',
                'etat'        => $etat,
                'categorie'   => $cat,
                'vedette'     => $vedette,
                'description' => $desc,
                'images'      => array_values($images),
            ];
            if ($id !== '') {
                foreach ($produits as $k => $p) if ($p['id'] === $id) $produits[$k] = $item;
                $flash = 'Matériel modifié.';
            } else {
                array_unshift($produits, $item);
                $flash = 'Matériel ajouté et publié.';
            }
            save_products($produits);
            unset($_SESSION['form_old']);
        }
    }
}

/* ---------- Données pour l'affichage ---------- */
$produits = is_logged_in() ? load_products() : [];
$edit = null;
if (is_logged_in() && isset($_GET['edit'])) {
    foreach ($produits as $p) if ($p['id'] === $_GET['edit']) $edit = $p;
}
$old = $_SESSION['form_old'] ?? null; unset($_SESSION['form_old']);
$etats = ['neuf' => 'Neuf', 'occasion' => 'Occasion', 'vendu' => 'Vendu'];
$categories = ['tracteurs' => 'Tracteurs', 'moissonneuses' => 'Moissonneuses & récolteuses', 'outils' => 'Outils & accessoires', 'remorques' => 'Remorques & transport', 'irrigation' => 'Systèmes d\'irrigation', 'autre' => 'Autre'];
$nb_vedettes = 0; foreach ($produits as $pp) if (!empty($pp['vedette'])) $nb_vedettes++;
?>
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Administration — SARL MCC</title>
<style>
  :root { --green:#165E3D; --green2:#2E7032; --accent:#FFC107; --paper:#F5F7F2; --line:#e2e8e0; --ink:#1d2b25; --soft:#56655d; }
  * { box-sizing:border-box; }
  body { margin:0; font-family:system-ui,-apple-system,"Segoe UI",sans-serif; background:var(--paper); color:var(--ink); }
  a { color:var(--green2); }
  .topbar { background:var(--green); color:#fff; padding:.9rem 1.2rem; display:flex; align-items:center; justify-content:space-between; }
  .topbar strong { font-size:1.1rem; }
  .topbar a { color:#fff; font-size:.9rem; text-decoration:none; opacity:.9; }
  .topbar a:hover { opacity:1; text-decoration:underline; }
  .wrap { max-width:1000px; margin:1.5rem auto; padding:0 1.2rem; }
  .flash { background:#e7f0e8; border:1px solid #bcd6c2; color:var(--green); padding:.8rem 1rem; border-radius:10px; margin-bottom:1.2rem; font-weight:600; }
  .card { background:#fff; border:1px solid var(--line); border-radius:14px; padding:1.4rem; margin-bottom:1.5rem; box-shadow:0 8px 22px -16px rgba(16,63,42,.4); }
  h1 { font-size:1.3rem; margin:.2rem 0 1rem; }
  h2 { font-size:1.05rem; margin:0 0 1rem; color:var(--green); }
  label { display:block; font-weight:600; font-size:.9rem; margin:.9rem 0 .35rem; }
  input[type=text], textarea, select { width:100%; font:inherit; font-size:.95rem; padding:.6rem .75rem; border:1.5px solid var(--line); border-radius:9px; background:#fff; }
  input:focus, textarea:focus, select:focus { outline:none; border-color:var(--green2); box-shadow:0 0 0 3px rgba(46,112,50,.15); }
  textarea { resize:vertical; }
  .row { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
  .btn { display:inline-flex; align-items:center; gap:.4rem; border:none; cursor:pointer; font:inherit; font-weight:600; font-size:.9rem; padding:.65rem 1.1rem; border-radius:999px; text-decoration:none; }
  .btn-primary { background:var(--accent); color:#2a2300; }
  .btn-primary:hover { background:#e0a800; }
  .btn-green { background:var(--green); color:#fff; }
  .btn-ghost { background:#fff; border:1.5px solid var(--line); color:var(--ink); }
  .btn-danger { background:#fff; border:1.5px solid #e0b4ae; color:#c0392b; }
  .btn-danger:hover { background:#c0392b; color:#fff; }
  .hint { color:var(--soft); font-size:.8rem; margin-top:.3rem; }
  table { width:100%; border-collapse:collapse; }
  th, td { text-align:left; padding:.7rem .6rem; border-bottom:1px solid var(--line); vertical-align:middle; font-size:.92rem; }
  th { font-size:.78rem; text-transform:uppercase; letter-spacing:.04em; color:var(--soft); }
  .thumb { width:64px; height:48px; object-fit:cover; border-radius:7px; border:1px solid var(--line); }
  .photo-grid { display:flex; flex-wrap:wrap; gap:.8rem; margin:.4rem 0 .8rem; }
  .photo-item { display:flex; flex-direction:column; gap:.3rem; align-items:center; font-size:.78rem; }
  .photo-item img { width:120px; height:90px; object-fit:cover; border-radius:8px; border:1px solid var(--line); }
  .photo-item label { font-weight:400; display:flex; align-items:center; gap:.3rem; cursor:pointer; }
  .badge { display:inline-block; font-size:.72rem; font-weight:700; padding:.22rem .55rem; border-radius:999px; }
  .b-neuf { background:var(--green); color:#fff; } .b-occasion { background:#fff; color:var(--green); border:1.5px solid var(--green); }
  .b-stock { background:var(--accent); color:#2a2300; } .b-vendu { background:#e7e7e7; color:#666; }
  .actions { display:flex; gap:.4rem; flex-wrap:wrap; }
  .login { max-width:380px; margin:8vh auto; }
  .login input { margin-bottom:1rem; }
  .err { color:#c0392b; font-size:.85rem; font-weight:600; margin-bottom:.6rem; }
  .muted { color:var(--soft); font-size:.85rem; }
  @media (max-width:640px){ .row{grid-template-columns:1fr;} .hide-sm{display:none;} }
</style>
</head>
<body>

<?php if (!is_logged_in()): ?>
  <!-- ================= CONNEXION ================= -->
  <div class="login card">
    <h1 style="text-align:center">Espace administration</h1>
    <p class="muted" style="text-align:center;margin-top:-.4rem">SARL MCC — Matériel en vedette</p>
    <?php if ($login_error): ?><p class="err"><?= e($login_error) ?></p><?php endif; ?>
    <form method="post">
      <label for="mdp">Mot de passe</label>
      <input type="password" id="mdp" name="mot_de_passe" required autofocus>
      <button class="btn btn-green" style="width:100%;justify-content:center" type="submit">Se connecter</button>
    </form>
  </div>

<?php else: ?>
  <!-- ================= TABLEAU DE BORD ================= -->
  <div class="topbar">
    <strong>SARL MCC · Administration</strong>
    <span>
      <a href="../index.html" target="_blank">Voir le site ↗</a>
      &nbsp;·&nbsp;
      <a href="?logout=1">Se déconnecter</a>
    </span>
  </div>

  <div class="wrap">
    <?php if ($flash): ?><div class="flash"><?= e($flash) ?></div><?php endif; ?>

    <!-- Formulaire ajout / édition -->
    <div class="card">
      <h2><?= $edit ? 'Modifier un matériel' : 'Ajouter un matériel' ?></h2>
      <form method="post" enctype="multipart/form-data">
        <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
        <input type="hidden" name="action" value="save">
        <input type="hidden" name="id" value="<?= e($edit['id'] ?? '') ?>">

        <div class="row">
          <div>
            <label for="nom">Nom du matériel *</label>
            <input type="text" id="nom" name="nom" required
                   value="<?= e($old['nom'] ?? $edit['nom'] ?? '') ?>" placeholder="Ex. Tracteur John Deere 6120M">
          </div>
          <div>
            <label for="reference">Référence *</label>
            <input type="text" id="reference" name="reference" required
                   value="<?= e($old['ref'] ?? $edit['reference'] ?? '') ?>" placeholder="Ex. TR-JD6120">
          </div>
        </div>

        <div class="row">
          <div>
            <label for="prix">Prix</label>
            <input type="text" id="prix" name="prix"
                   value="<?= e($old['prix'] ?? $edit['prix'] ?? '') ?>" placeholder="Ex. 52 000 €  ou  Sur demande">
          </div>
          <div>
            <label for="etat">État</label>
            <select id="etat" name="etat">
              <?php $cur = $old['etat'] ?? $edit['etat'] ?? 'stock';
              foreach ($etats as $val => $lab): ?>
                <option value="<?= $val ?>" <?= $cur === $val ? 'selected' : '' ?>><?= $lab ?></option>
              <?php endforeach; ?>
            </select>
          </div>
        </div>

        <div class="row">
          <div>
            <label for="categorie">Catégorie</label>
            <select id="categorie" name="categorie">
              <?php $curCat = $old['cat'] ?? $edit['categorie'] ?? 'autre';
              foreach ($categories as $val => $lab): ?>
                <option value="<?= $val ?>" <?= $curCat === $val ? 'selected' : '' ?>><?= e($lab) ?></option>
              <?php endforeach; ?>
            </select>
          </div>
          <div>
            <label for="vedette">Mise en avant</label>
            <?php $curVed = array_key_exists('vedette', $old ?? []) ? $old['vedette'] : ($edit['vedette'] ?? false); ?>
            <label style="font-weight:400;display:flex;align-items:center;gap:.5rem;margin-top:.4rem">
              <input type="checkbox" id="vedette" name="vedette" value="1" <?= $curVed ? 'checked' : '' ?> style="width:auto">
              Afficher en vedette sur la page d'accueil (6 max)
            </label>
          </div>
        </div>

        <label for="description">Description courte</label>
        <input type="text" id="description" name="description"
               value="<?= e($old['desc'] ?? $edit['description'] ?? '') ?>"
               placeholder="Ex. 120 ch · révisé & garanti · 2 100 h">

        <label for="photos">Photos <?= $edit ? '' : '*' ?></label>
        <?php
        $existing = [];
        if ($edit) {
          if (!empty($edit['images']) && is_array($edit['images'])) $existing = $edit['images'];
          elseif (!empty($edit['image'])) $existing = [$edit['image']];
        }
        if ($existing): ?>
          <div class="photo-grid">
            <?php foreach ($existing as $im):
              $s = (strpos($im, 'http') === 0) ? $im : '../' . $im; ?>
              <div class="photo-item">
                <img src="<?= e($s) ?>" alt="">
                <label><input type="checkbox" name="remove_images[]" value="<?= e($im) ?>"> Retirer</label>
              </div>
            <?php endforeach; ?>
          </div>
        <?php endif; ?>
        <input type="file" id="photos" name="photos[]" accept="image/jpeg,image/png,image/webp" multiple>
        <p class="hint">Vous pouvez sélectionner <strong>plusieurs photos à la fois</strong> (elles apparaîtront en carrousel sur la fiche). La 1<sup>re</sup> est l'image principale. JPG, PNG ou WEBP, 6 Mo max chacune. Cochez « Retirer » pour enlever une photo existante.</p>

        <div style="margin-top:1.2rem;display:flex;gap:.6rem;flex-wrap:wrap">
          <button class="btn btn-primary" type="submit"><?= $edit ? 'Enregistrer les modifications' : 'Ajouter et publier' ?></button>
          <?php if ($edit): ?><a class="btn btn-ghost" href="index.php">Annuler</a><?php endif; ?>
        </div>
      </form>
    </div>

    <!-- Liste des matériels -->
    <div class="card">
      <h2>Matériels en ligne (<?= count($produits) ?>) · <?= $nb_vedettes ?> en vedette</h2>
      <?php if ($nb_vedettes > 6): ?>
        <div class="flash" style="background:#fdf3d6;border-color:#f0d98a;color:#7a5b00">
          Vous avez <?= $nb_vedettes ?> matériels « en vedette » : seuls les 6 plus récents s'afficheront sur la page d'accueil. Tous restent visibles dans le catalogue complet.
        </div>
      <?php endif; ?>
      <?php if (!$produits): ?>
        <p class="muted">Aucun matériel pour le moment. Ajoutez-en un avec le formulaire ci-dessus.</p>
      <?php else: ?>
      <table>
        <thead><tr><th></th><th>Nom</th><th class="hide-sm">Réf.</th><th class="hide-sm">Prix</th><th>État</th><th>Actions</th></tr></thead>
        <tbody>
          <?php foreach ($produits as $p):
            $imgs0 = (!empty($p['images']) && is_array($p['images'])) ? $p['images'] : (!empty($p['image']) ? [$p['image']] : []);
            $first = $imgs0[0] ?? '';
            $src = (strpos($first, 'http') === 0) ? $first : '../' . $first;
            $nbph = count($imgs0); ?>
          <tr>
            <td><img class="thumb" src="<?= e($src) ?>" alt=""><?= $nbph > 1 ? '<div style="font-size:.7rem;color:#56655d;text-align:center">'.$nbph.' photos</div>' : '' ?></td>
            <td><strong><?= e($p['nom']) ?></strong><?= !empty($p['vedette']) ? ' <span title="En vedette sur l\'accueil" style="color:#e0a800">★</span>' : '' ?></td>
            <td class="hide-sm"><?= e($p['reference']) ?></td>
            <td class="hide-sm"><?= e($p['prix']) ?></td>
            <td><span class="badge b-<?= e($p['etat']) ?>"><?= e($etats[$p['etat']] ?? $p['etat']) ?></span></td>
            <td>
              <div class="actions">
                <a class="btn btn-ghost" href="?edit=<?= urlencode($p['id']) ?>">Modifier</a>
                <form method="post" onsubmit="return confirm('Supprimer définitivement « <?= e(addslashes($p['nom'])) ?> » ?');" style="display:inline">
                  <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
                  <input type="hidden" name="action" value="delete">
                  <input type="hidden" name="id" value="<?= e($p['id']) ?>">
                  <button class="btn btn-danger" type="submit">Supprimer</button>
                </form>
              </div>
            </td>
          </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
      <?php endif; ?>
    </div>

    <p class="muted">Astuce : pour retirer un matériel vendu, choisissez l'état « Vendu » (il reste affiché avec une étiquette) ou « Supprimer » pour l'enlever du site.</p>
  </div>
<?php endif; ?>

</body>
</html>
