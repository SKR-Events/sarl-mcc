/* =========================================================
   Panier de devis — façon e-commerce
   - Stockage persistant (localStorage), partagé entre toutes les pages.
   - Bouton panier dans l'en-tête + volet latéral.
   - « Demander un devis » renvoie vers le formulaire, pré-rempli avec
     toutes les références ajoutées (géré dans script.js).
   ========================================================= */
(function () {
  "use strict";

  var KEY = "mcc_panier";
  var listeners = [];

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
  }
  function write(arr) {
    try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch (e) {}
    emit();
  }
  function emit() {
    var items = read();
    listeners.forEach(function (cb) { try { cb(items); } catch (e) {} });
    updateCount();
    syncButtons();
    renderDrawer();
  }

  var Cart = {
    get: read,
    count: function () { return read().length; },
    has: function (ref) { return read().some(function (i) { return i.ref === ref; }); },
    add: function (ref, nom) {
      var a = read();
      if (!a.some(function (i) { return i.ref === ref; })) { a.push({ ref: ref, nom: nom || ref }); write(a); }
    },
    remove: function (ref) { write(read().filter(function (i) { return i.ref !== ref; })); },
    toggle: function (ref, nom) { this.has(ref) ? this.remove(ref) : this.add(ref, nom); },
    clear: function () { write([]); },
    onChange: function (cb) { listeners.push(cb); },
    // Resynchronise l'UI (utile après un re-rendu de cartes : filtres, pagination).
    syncUI: function () { updateCount(); syncButtons(); renderDrawer(); }
  };
  window.MCC = window.MCC || {};
  window.MCC.Cart = Cart;

  /* ---------- Interface ---------- */
  var countEl, drawer, overlay, bodyEl;

  function updateCount() {
    if (!countEl) return;
    var n = Cart.count();
    countEl.textContent = n;
    countEl.hidden = n === 0;
  }

  function syncButtons() {
    document.querySelectorAll(".btn-cart-add").forEach(function (btn) {
      var card = btn.closest(".product");
      if (!card) return;
      var inCart = Cart.has(card.getAttribute("data-ref"));
      btn.classList.toggle("added", inCart);
      btn.textContent = inCart ? "Dans le devis ✓" : "Ajouter au devis";
    });
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function renderDrawer() {
    if (!bodyEl) return;
    var items = Cart.get();
    if (!items.length) {
      bodyEl.innerHTML = '<p class="cart-empty">Votre panier est vide.<br>Ajoutez du matériel depuis le catalogue.</p>';
      if (drawer) drawer.classList.toggle("has-items", false);
      return;
    }
    if (drawer) drawer.classList.add("has-items");
    bodyEl.innerHTML = items.map(function (i) {
      return '<div class="cart-item">' +
          '<div class="cart-item-info"><strong>' + esc(i.nom) + '</strong><span>Réf. ' + esc(i.ref) + '</span></div>' +
          '<button class="cart-item-remove" type="button" data-ref="' + esc(i.ref) + '" aria-label="Retirer">&times;</button>' +
        '</div>';
    }).join("");
  }

  function openDrawer()  { if (drawer) { drawer.classList.add("open"); overlay.classList.add("open"); drawer.setAttribute("aria-hidden", "false"); } }
  function closeDrawer() { if (drawer) { drawer.classList.remove("open"); overlay.classList.remove("open"); drawer.setAttribute("aria-hidden", "true"); } }

  function build() {
    // Bouton panier dans l'en-tête
    var headerCta = document.querySelector(".header-cta");
    if (headerCta) {
      var btn = document.createElement("button");
      btn.className = "cart-btn";
      btn.id = "cart-btn";
      btn.type = "button";
      btn.setAttribute("aria-label", "Voir mon panier de devis");
      btn.innerHTML =
        '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">' +
          '<path d="M3 4h2l2.4 12.2a1 1 0 0 0 1 .8h8.7a1 1 0 0 0 1-.8L21 8H6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>' +
          '<circle cx="9" cy="20" r="1.4" fill="currentColor"/><circle cx="18" cy="20" r="1.4" fill="currentColor"/>' +
        '</svg>' +
        '<span class="cart-count" id="cart-count" hidden>0</span>';
      var quote = headerCta.querySelector(".btn-quote");
      headerCta.insertBefore(btn, quote || headerCta.querySelector(".nav-toggle"));
      btn.addEventListener("click", openDrawer);
    }

    // Volet + fond
    overlay = document.createElement("div");
    overlay.className = "cart-overlay";
    overlay.id = "cart-overlay";
    overlay.addEventListener("click", closeDrawer);

    drawer = document.createElement("aside");
    drawer.className = "cart-drawer";
    drawer.id = "cart-drawer";
    drawer.setAttribute("aria-label", "Mon panier de devis");
    drawer.setAttribute("aria-hidden", "true");
    drawer.innerHTML =
      '<div class="cart-head"><h2>Mon panier</h2><button class="cart-close" id="cart-close" type="button" aria-label="Fermer">&times;</button></div>' +
      '<div class="cart-body" id="cart-body"></div>' +
      '<div class="cart-foot">' +
        '<a class="btn btn-accent btn-block" id="cart-devis" href="index.html#contact">Demander un devis</a>' +
        '<button class="cart-clear" id="cart-clear" type="button">Vider le panier</button>' +
      '</div>';

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    countEl = document.getElementById("cart-count");
    bodyEl  = document.getElementById("cart-body");

    document.getElementById("cart-close").addEventListener("click", closeDrawer);
    document.getElementById("cart-clear").addEventListener("click", function () { Cart.clear(); });

    // Retirer un article (délégation dans le corps du volet)
    bodyEl.addEventListener("click", function (e) {
      var rm = e.target.closest(".cart-item-remove");
      if (rm) Cart.remove(rm.getAttribute("data-ref"));
    });

    // « Demander un devis » : si le formulaire est sur cette page, on y va en douceur,
    // sinon on navigue vers la page d'accueil (le formulaire lira le panier).
    document.getElementById("cart-devis").addEventListener("click", function (e) {
      var contact = document.getElementById("contact");
      if (contact) {
        e.preventDefault();
        closeDrawer();
        contact.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });

    // Ajout au panier (délégation globale ; marche pour les cartes dynamiques)
    document.addEventListener("click", function (e) {
      var add = e.target.closest && e.target.closest(".btn-cart-add");
      if (!add) return;
      var card = add.closest(".product");
      if (!card) return;
      Cart.toggle(card.getAttribute("data-ref"), card.getAttribute("data-name"));
      // petit retour visuel sur le bouton panier
      var cb = document.getElementById("cart-btn");
      if (cb && Cart.has(card.getAttribute("data-ref"))) {
        cb.classList.remove("pulse"); void cb.offsetWidth; cb.classList.add("pulse");
      }
    });

    // Échap ferme le volet
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDrawer(); });

    emit(); // état initial
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
