/* =========================================================
   Module partagé — carte « matériel »
   Rendu d'une carte produit + carrousel de photos (flèches gauche/droite)
   quand le matériel a plusieurs images. Utilisé par index.html et produits.html.
   ========================================================= */
(function () {
  "use strict";

  var TAGS = {
    neuf:     { label: "Neuf",     cls: "tag-new" },
    occasion: { label: "Occasion", cls: "tag-occ" },
    stock:    { label: "En stock", cls: "tag-stock" },
    vendu:    { label: "Vendu",    cls: "tag-vendu" }
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  // Liste des photos d'un produit (compatible ancien champ "image")
  function imagesOf(p) {
    if (p.images && p.images.length) return p.images;
    if (p.image) return [p.image];
    return [];
  }

  /* Construit le HTML d'une carte.
     opts.action : "button" (accueil) ou "link" (catalogue, renvoie vers le devis). */
  function cardHTML(p, opts) {
    opts = opts || {};
    var t = TAGS[p.etat] || TAGS.occasion;
    var vendu = p.etat === "vendu";
    var imgs = imagesOf(p);
    var multi = imgs.length > 1;

    var slides = imgs.map(function (src) {
      return '<img src="' + esc(src) + '" alt="' + esc(p.nom) + '" loading="lazy" />';
    }).join("");

    var nav = multi
      ? '<button class="pm-nav prev" type="button" aria-label="Photo précédente">&#8249;</button>' +
        '<button class="pm-nav next" type="button" aria-label="Photo suivante">&#8250;</button>' +
        '<div class="pm-dots" aria-hidden="true"></div>'
      : "";

    // Bouton « Ajouter au panier » (le panier est partagé entre les pages via localStorage).
    var action = vendu
      ? '<span class="sold-label">Vendu</span>'
      : '<button class="btn btn-cart-add" type="button">Ajouter au devis</button>';

    return '<article class="product' + (vendu ? " product-vendu" : "") +
        '" data-ref="' + esc(p.reference) + '" data-name="' + esc(p.nom) + '">' +
        '<div class="product-media"' + (multi ? ' data-gallery' : '') + '>' +
          '<div class="pm-track">' + slides + '</div>' +
          '<span class="tag ' + t.cls + '">' + t.label + '</span>' +
          nav +
        '</div>' +
        '<div class="product-info">' +
          '<span class="product-ref">Réf. ' + esc(p.reference) + '</span>' +
          '<h3>' + esc(p.nom) + '</h3>' +
          '<p class="product-spec">' + esc(p.description) + '</p>' +
          '<div class="product-foot">' +
            // Le prix n'apparaît que s'il est renseigné (on masque « Sur demande »).
            (p.prix && p.prix !== "Sur demande" ? '<span class="product-price">' + esc(p.prix) + '</span>' : '') +
            action +
          '</div>' +
        '</div>' +
      '</article>';
  }

  // Active les carrousels de photos dans un conteneur (idempotent).
  function initGalleries(root) {
    (root || document).querySelectorAll(".product-media[data-gallery]").forEach(function (pm) {
      if (pm.dataset.bound) return;
      pm.dataset.bound = "1";
      var track  = pm.querySelector(".pm-track");
      var slides = pm.querySelectorAll(".pm-track img");
      var dotsBox = pm.querySelector(".pm-dots");
      if (!track || slides.length < 2) return;

      var i = 0, dots = [];
      if (dotsBox) {
        slides.forEach(function (_, idx) {
          var d = document.createElement("button");
          d.type = "button";
          d.setAttribute("aria-label", "Photo " + (idx + 1));
          d.addEventListener("click", function (e) { e.stopPropagation(); go(idx); });
          dotsBox.appendChild(d);
          dots.push(d);
        });
      }
      function go(n) {
        i = (n + slides.length) % slides.length;
        track.style.transform = "translateX(" + (-i * 100) + "%)";
        dots.forEach(function (d, j) { d.classList.toggle("active", j === i); });
      }
      pm.querySelector(".pm-nav.prev").addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); go(i - 1); });
      pm.querySelector(".pm-nav.next").addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); go(i + 1); });
      go(0);
    });
  }

  // API publique
  window.MCC = window.MCC || {};
  window.MCC.cardHTML = cardHTML;
  window.MCC.initGalleries = initGalleries;
})();
