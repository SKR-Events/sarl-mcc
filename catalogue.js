/* =========================================================
   Page Catalogue (produits.html)
   - Charge tous les produits depuis data/produits.json
   - Filtre par famille + pagination
   - Le bouton « Ajouter au devis » renvoie vers la page d'accueil
     (index.html?devis=REF#contact) qui pré-remplit le formulaire.
   ========================================================= */
(function () {
  "use strict";

  var PAGE_SIZE = 9;
  var grid = document.getElementById("catalogue-grid");
  if (!grid) return;

  var pager   = document.getElementById("pager");
  var countEl = document.getElementById("cat-count");
  var emptyEl = document.getElementById("cat-empty");
  var filters = document.getElementById("cat-filters");

  var TAGS = {
    neuf:     { label: "Neuf",     cls: "tag-new" },
    occasion: { label: "Occasion", cls: "tag-occ" },
    stock:    { label: "En stock", cls: "tag-stock" },
    vendu:    { label: "Vendu",    cls: "tag-vendu" }
  };
  var CAT_LABELS = {
    tracteurs: "Tracteurs", moissonneuses: "Moissonneuses & récolteuses",
    outils: "Outils & accessoires", remorques: "Remorques & transport",
    irrigation: "Systèmes d'irrigation", autre: "Autre"
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function param(name) {
    var m = new RegExp("[?&]" + name + "=([^&#]*)").exec(location.search);
    return m ? decodeURIComponent(m[1]) : "";
  }

  var all = [];
  var current = param("cat") || "tous";
  var page = 1;

  function filtered() {
    return current === "tous" ? all : all.filter(function (p) { return (p.categorie || "autre") === current; });
  }

  // Rendu d'une carte délégué au module partagé (carrousel de photos inclus).
  // Sur le catalogue, le bouton renvoie vers le devis de la page d'accueil.
  function card(p) {
    return window.MCC.cardHTML(p, { action: "link" });
  }

  function renderPager(total) {
    var pages = Math.ceil(total / PAGE_SIZE);
    if (!pager) return;
    if (pages <= 1) { pager.innerHTML = ""; return; }
    var html = '<button class="page-btn nav" data-go="' + (page - 1) + '"' + (page === 1 ? " disabled" : "") + ' aria-label="Page précédente">‹</button>';
    for (var i = 1; i <= pages; i++) {
      html += '<button class="page-btn' + (i === page ? " active" : "") + '" data-go="' + i + '">' + i + '</button>';
    }
    html += '<button class="page-btn nav" data-go="' + (page + 1) + '"' + (page === pages ? " disabled" : "") + ' aria-label="Page suivante">›</button>';
    pager.innerHTML = html;
  }

  function render() {
    var list = filtered();
    var total = list.length;
    var pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (page > pages) page = pages;
    var start = (page - 1) * PAGE_SIZE;
    var slice = list.slice(start, start + PAGE_SIZE);

    grid.innerHTML = slice.map(card).join("");
    if (window.MCC && window.MCC.initGalleries) window.MCC.initGalleries(grid);
    if (window.MCC && window.MCC.Cart && window.MCC.Cart.syncUI) window.MCC.Cart.syncUI();
    if (emptyEl) emptyEl.hidden = total !== 0;
    if (countEl) {
      countEl.textContent = total
        ? total + " matériel" + (total > 1 ? "s" : "") +
          (current !== "tous" ? " · " + (CAT_LABELS[current] || current) : "") +
          " · page " + page + "/" + pages
        : "";
    }
    renderPager(total);
  }

  function setCat(cat) {
    current = cat; page = 1;
    if (filters) {
      [].forEach.call(filters.querySelectorAll(".filter-btn"), function (b) {
        b.classList.toggle("active", b.getAttribute("data-cat") === cat);
      });
    }
    render();
  }

  // Événements
  if (filters) {
    filters.addEventListener("click", function (e) {
      var b = e.target.closest(".filter-btn");
      if (b) setCat(b.getAttribute("data-cat"));
    });
  }
  if (pager) {
    pager.addEventListener("click", function (e) {
      var b = e.target.closest(".page-btn");
      if (!b || b.disabled) return;
      var go = parseInt(b.getAttribute("data-go"), 10);
      if (!isNaN(go)) {
        page = go; render();
        var head = document.querySelector(".catalogue-page");
        if (head) head.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  // Chargement des données via window.MCC_PRODUITS (data/produits.js — marche aussi en file://)
  var data = window.MCC_PRODUITS;
  if (data && data.produits) {
    all = data.produits;
    if (current !== "tous" && filters) {
      [].forEach.call(filters.querySelectorAll(".filter-btn"), function (b) {
        b.classList.toggle("active", b.getAttribute("data-cat") === current);
      });
    }
    render();
  } else {
    if (countEl) countEl.textContent = "";
    if (emptyEl) { emptyEl.hidden = false; emptyEl.textContent = "Catalogue momentanément indisponible. Réessayez plus tard."; }
  }
})();
