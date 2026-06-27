/* =========================================================
   SARL MCC — Interactions
   - Menu mobile
   - Révélations au scroll (IntersectionObserver)
   - Lien de nav actif selon la section visible
   - « Ajouter au devis » -> remplit les références du formulaire
   - Validation légère + repli mailto si le formulaire n'est pas branché
   ========================================================= */
(function () {
  "use strict";

  // Active le mode "JS présent" (gating des animations de révélation).
  document.documentElement.classList.add("js");

  /* ---------- Année du pied de page ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- En-tête : barre solide en permanence ----------
     (Le logo couleur a besoin d'un fond clair : l'en-tête reste blanc,
     y compris au-dessus du hero, pour un rendu net et lisible.) */

  /* ---------- Menu mobile ---------- */
  var toggle = document.getElementById("nav-toggle");
  var nav = document.getElementById("main-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- Révélations au scroll ---------- */
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var reveals = document.querySelectorAll(".reveal");
  function revealAll() { reveals.forEach(function (el) { el.classList.add("in"); }); }
  if (reduce || !("IntersectionObserver" in window)) {
    revealAll();
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
    // Filet de sécurité : si l'IntersectionObserver ne s'est pas déclenché
    // (cas rares / environnements headless), on révèle tout pour ne jamais
    // laisser de contenu invisible.
    setTimeout(revealAll, 1500);
  }

  /* ---------- Lien de navigation actif ---------- */
  var sections = document.querySelectorAll("section[id]");
  var navLinks = document.querySelectorAll(".main-nav a");
  if ("IntersectionObserver" in window && navLinks.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var id = entry.target.getAttribute("id");
          navLinks.forEach(function (link) {
            link.classList.toggle("active", link.getAttribute("href") === "#" + id);
          });
        }
      });
    }, { threshold: 0.5 });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- Carrousels des catégories ---------- */
  document.querySelectorAll("[data-slider]").forEach(function (slider) {
    var track = slider.querySelector(".cat-slides");
    var slides = slider.querySelectorAll(".cat-slides img");
    var dotsBox = slider.querySelector(".cat-dots");
    if (!track || slides.length < 2) {
      // Une seule image : pas de navigation.
      var prev0 = slider.querySelector(".prev"); var next0 = slider.querySelector(".next");
      if (prev0) prev0.style.display = "none";
      if (next0) next0.style.display = "none";
      return;
    }
    var index = 0;
    var dots = [];
    slides.forEach(function (_, i) {
      var d = document.createElement("button");
      d.type = "button";
      d.setAttribute("aria-label", "Aller à l'image " + (i + 1));
      d.addEventListener("click", function () { go(i); });
      dotsBox.appendChild(d);
      dots.push(d);
    });
    function go(i) {
      index = (i + slides.length) % slides.length;
      track.style.transform = "translateX(" + (-index * 100) + "%)";
      dots.forEach(function (d, j) { d.classList.toggle("active", j === index); });
    }
    slider.querySelector(".prev").addEventListener("click", function () { go(index - 1); });
    slider.querySelector(".next").addEventListener("click", function () { go(index + 1); });
    go(0);
  });

  /* ---------- Matériel en vedette : rendu depuis data/produits.js ----------
     Les données sont chargées via <script src="data/produits.js"> (window.MCC_PRODUITS),
     ce qui fonctionne aussi en ouverture locale (file://). Géré par l'espace /admin.
     Si les données sont absentes, on garde le contenu HTML de secours. */
  (function renderProduits() {
    var grid = document.getElementById("product-grid");
    if (!grid || !window.MCC || !window.MCC.cardHTML) return;
    var data = window.MCC_PRODUITS; // chargé via data/produits.js (marche aussi en file://)
    if (data && data.produits) {
      // Page d'accueil : uniquement les matériels « en vedette », 6 maximum.
      var items = data.produits.filter(function (p) { return p.vedette; }).slice(0, 6);
      if (!items.length) return; // garde le contenu de secours
      grid.innerHTML = items.map(function (p) { return window.MCC.cardHTML(p, { action: "button" }); }).join("");
      window.MCC.initGalleries(grid);
    }
  })();

  /* ---------- Devis : références issues du panier ---------- */
  var refInput = document.getElementById("refs");
  var chipsBox = document.getElementById("ref-chips");

  // Affiche les références du panier dans le formulaire (champ + puces).
  function renderFromCart() {
    if (!window.MCC || !window.MCC.Cart) return;
    var items = window.MCC.Cart.get();
    if (refInput) refInput.value = items.map(function (i) { return i.ref; }).join(", ");
    if (!chipsBox) return;
    chipsBox.innerHTML = "";
    items.forEach(function (i) {
      var chip = document.createElement("span");
      chip.className = "ref-chip";
      chip.textContent = i.ref + " ";
      var x = document.createElement("button");
      x.type = "button";
      x.setAttribute("aria-label", "Retirer " + i.ref);
      x.textContent = "×";
      x.addEventListener("click", function () { window.MCC.Cart.remove(i.ref); });
      chip.appendChild(x);
      chipsBox.appendChild(chip);
    });
  }

  if ((refInput || chipsBox) && window.MCC && window.MCC.Cart) {
    if (refInput) refInput.readOnly = true; // piloté par le panier
    renderFromCart();
    window.MCC.Cart.onChange(renderFromCart);
  }

  /* ---------- Formulaire : validation + envoi ---------- */
  var form = document.getElementById("quote-form");
  var status = document.getElementById("form-status");

  function setError(id, msg) {
    var el = document.querySelector('.error[data-for="' + id + '"]');
    if (el) el.textContent = msg || "";
  }

  function validate() {
    var ok = true;
    var nom = document.getElementById("nom");
    var tel = document.getElementById("tel");
    var email = document.getElementById("email");
    var refs = document.getElementById("refs");
    var message = document.getElementById("message");

    if (!nom.value.trim()) { setError("nom", "Merci d'indiquer votre nom."); ok = false; }
    else setError("nom", "");

    var telDigits = tel.value.replace(/[^0-9]/g, "");
    if (telDigits.length < 8) { setError("tel", "Numéro de téléphone invalide."); ok = false; }
    else setError("tel", "");

    if (!email.value.trim()) { setError("email", "Merci d'indiquer votre e-mail."); ok = false; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) { setError("email", "Adresse e-mail invalide."); ok = false; }
    else setError("email", "");

    if (refs && !refs.value.trim()) { setError("refs", "Ajoutez au moins un matériel au devis depuis le catalogue."); ok = false; }
    else setError("refs", "");

    if (message && !message.value.trim()) { setError("message", "Merci de préciser votre besoin."); ok = false; }
    else setError("message", "");

    return ok;
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (status) { status.textContent = ""; status.className = "form-status"; }
      if (!validate()) {
        if (status) { status.textContent = "Veuillez corriger les champs en rouge."; status.className = "form-status ko"; }
        return;
      }

      var action = form.getAttribute("action") || "";
      var configured = action && action.indexOf("VOTRE_ID") === -1;

      if (configured) {
        // Envoi via le service configuré (ex. Formspree), en AJAX
        var data = new FormData(form);
        if (status) { status.textContent = "Envoi en cours..."; status.className = "form-status"; }
        fetch(action, { method: "POST", body: data, headers: { Accept: "application/json" } })
          .then(function (res) {
            if (res.ok) {
              form.reset();
              if (window.MCC && window.MCC.Cart) window.MCC.Cart.clear();
              if (status) { status.textContent = "Merci ! Votre demande a bien été envoyée. Un commercial vous recontacte sous 24 h."; status.className = "form-status ok"; }
            } else {
              throw new Error("bad response");
            }
          })
          .catch(function () {
            if (status) { status.textContent = "Échec de l'envoi. Appelez-nous au 07 07 01 07 07."; status.className = "form-status ko"; }
          });
      } else {
        // Repli : ouvre le client e-mail du visiteur avec les infos pré-remplies
        var nom = encodeURIComponent(document.getElementById("nom").value);
        var tel = encodeURIComponent(document.getElementById("tel").value);
        var mail = encodeURIComponent(document.getElementById("email").value);
        var refs = encodeURIComponent(document.getElementById("refs").value);
        var msg = encodeURIComponent(document.getElementById("message").value);
        var body = "Nom : " + nom + "%0D%0ATéléphone : " + tel + "%0D%0AE-mail : " + mail +
                   "%0D%0ARéférences : " + refs + "%0D%0A%0D%0AMessage :%0D%0A" + msg;
        window.location.href = "mailto:contact@sarlmcc.ci?subject=" +
          encodeURIComponent("Demande de devis — site SARL MCC") + "&body=" + body;
        if (status) { status.textContent = "Votre messagerie s'ouvre pour finaliser l'envoi."; status.className = "form-status ok"; }
      }
    });
  }
})();
